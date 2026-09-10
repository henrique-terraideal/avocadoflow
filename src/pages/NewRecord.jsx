import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { QrCode, Play, Pause, Check, Loader2, Leaf, Clock, Trees, CalendarDays } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";
import { format } from "date-fns";

import ActivitySelector from "../components/field/ActivitySelector";
import CompleteActivityModal from "../components/field/CompleteActivityModal";
import QRScanner from "../components/field/QRScanner";
import PendingRecordModal from "../components/field/PendingRecordModal";
import RADetailModal from "../components/planning/RADetailModal";
import { useOperationTemplate } from "@/hooks/useOperationTemplate";
import BottomNav from "../components/field/BottomNav";
import QuickActionFAB from "../components/QuickActionFAB";

const todayStr = () => new Date().toISOString().split("T")[0];
const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

function parseLabel(label) {
  let opId = null, actCode = null, actName = null, orchard = null, opName = null;
  try {
    const url = new URL(label.qr_data);
    opId = url.searchParams.get("op_id");
    actCode = url.searchParams.get("act_code");
    actName = url.searchParams.get("act_name");
    orchard = url.searchParams.get("orchard");
    opName = url.searchParams.get("op_name");
  } catch {}
  return {
    opId: opId || null,
    actCode: actCode || label.operation_code || null,
    actName: actName || label.operation_name || null,
    orchard: orchard || label.orchard_number || null,
    opName: opName || label.operator_name || null,
  };
}

function formatDuration(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export default function NewRecord() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [currentUser, setCurrentUser] = useState(null);
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [selectedLabelId, setSelectedLabelId] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [qrLabel, setQrLabel] = useState(null);
  const [raDetailId, setRaDetailId] = useState(null);
  const [showComplete, setShowComplete] = useState(false);
  const [busy, setBusy] = useState(false);

  // Estado local do registro em andamento (evita flicker entre ações e refetch)
  const [localOpenRecordId, setLocalOpenRecordId] = useState(null);
  const [localStartedAt, setLocalStartedAt] = useState(null);
  const [now, setNow] = useState(Date.now());

  const { data: operators = [], isLoading: loadingOperators } = useQuery({
    queryKey: ["operators"],
    queryFn: () => base44.entities.Operator.filter({ active: true }),
  });

  const { data: operations = [] } = useQuery({
    queryKey: ["operations"],
    queryFn: () => base44.entities.Operation.filter({ active: true }),
  });

  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    base44.auth.me().then((u) => setCurrentUser(u)).catch(() => {});
  }, []);

  // Pré-selecionar operador para usuário não-admin
  useEffect(() => {
    if (!currentUser || isAdmin || operators.length === 0 || selectedOperator) return;
    const match =
      operators.find((op) => op.id === currentUser.linked_operator_id) ||
      operators.find((op) => op.name.toLowerCase() === currentUser.full_name?.toLowerCase());
    if (match) setSelectedOperator(match);
  }, [currentUser, operators, isAdmin]);

  // Suporte a deep-link do app nativo (op_id na URL)
  useEffect(() => {
    if (operators.length === 0 || !currentUser) return;
    const params = new URLSearchParams(window.location.search);
    const op_id = params.get("op_id");
    if (op_id && isAdmin) {
      const found = operators.find((o) => o.id === op_id);
      if (found) setSelectedOperator(found);
    }
    window.history.replaceState({}, "", window.location.pathname);
  }, [operators, currentUser, isAdmin]);

  // Labels e registros do operador selecionado
  const { data: allLabels = [] } = useQuery({
    queryKey: ["home-pending-labels"],
    queryFn: () => base44.entities.PlanningLabel.list("-created_date", 500),
  });

  const { data: fieldRecords = [] } = useQuery({
    queryKey: ["home-field-records", selectedOperator?.id],
    queryFn: () =>
      base44.entities.FieldRecord.filter(
        { operator_id: selectedOperator.id },
        "-created_date",
        200
      ),
    enabled: !!selectedOperator,
  });

  const today = todayStr();

  const pendingActivities = useMemo(() => {
    if (!selectedOperator) return [];
    return allLabels
      .map((l) => ({ label: l, parsed: parseLabel(l) }))
      .filter(({ label, parsed }) => {
        if (!label.qr_data) return false;
        const opMatch =
          parsed.opId === selectedOperator.id || label.operator_name === selectedOperator.name;
        if (!opMatch) return false;
        if (label.date && label.date > today) return false;
        if (label.concluded) return false;
        return true;
      })
      .sort((a, b) => (a.label.date || "").localeCompare(b.label.date || ""));
  }, [allLabels, fieldRecords, selectedOperator, today]);

  // Auto-selecionar a primeira atividade
  useEffect(() => {
    if (pendingActivities.length > 0 && !pendingActivities.some((p) => p.label.id === selectedLabelId)) {
      setSelectedLabelId(pendingActivities[0].label.id);
    }
  }, [pendingActivities, selectedLabelId]);

  const selectedActivity = useMemo(
    () => pendingActivities.find((p) => p.label.id === selectedLabelId) || pendingActivities[0] || null,
    [pendingActivities, selectedLabelId]
  );
  const selectedLabel = selectedActivity?.label || null;
  const selectedParsed = selectedActivity?.parsed || null;

  // Registro em andamento (recuperação via DB + estado local)
  const openRecord = useMemo(() => {
    if (!selectedLabel || !selectedOperator) return null;
    return (
      fieldRecords.find((r) => {
        if (r.operator_id !== selectedOperator.id) return false;
        if (!r.start_time || r.end_time) return false;
        let det = {};
        try { det = JSON.parse(r.additional_details || "{}"); } catch {}
        return det.label_id === selectedLabel.id;
      }) || null
    );
  }, [fieldRecords, selectedLabel, selectedOperator]);

  const isStarted = !!(openRecord || localOpenRecordId);
  const currentStart = openRecord?.start_time || localStartedAt;
  const currentRecordId = openRecord?.id || localOpenRecordId;

  // Cronômetro
  useEffect(() => {
    if (!isStarted) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isStarted]);

  const elapsedMs = useMemo(() => {
    if (!isStarted || !currentStart) return 0;
    const [h, m] = currentStart.split(":").map(Number);
    const start = new Date();
    start.setHours(h, m, 0, 0);
    return now - start.getTime();
  }, [isStarted, currentStart, now]);

  // Template / campos de registro da operação selecionada
  const operationId = useMemo(() => {
    if (!selectedParsed) return null;
    const op = operations.find((o) => o.code === selectedParsed.actCode);
    return op?.id || null;
  }, [operations, selectedParsed]);

  const { customFields } = useOperationTemplate(operationId);
  const registrationFields = useMemo(
    () =>
      customFields.filter(
        (f) => !f.input_stage || f.input_stage === "registration" || f.input_stage === "both"
      ),
    [customFields]
  );

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["home-field-records"] });
    queryClient.invalidateQueries({ queryKey: ["home-pending-labels"] });
    queryClient.invalidateQueries({ queryKey: ["field-records"] });
    queryClient.invalidateQueries({ queryKey: ["field-records-date"] });
    queryClient.invalidateQueries({ queryKey: ["pending-labels"] });
    queryClient.invalidateQueries({ queryKey: ["planning-labels"] });
  };

  const buildBaseDetails = (label) => {
    let det = {};
    try { det = label.additional_details ? JSON.parse(label.additional_details) : {}; } catch {}
    det.label_id = label.id;
    return det;
  };

  const handleIniciar = async () => {
    if (!selectedLabel || !selectedParsed || !selectedOperator || isStarted || busy) return;
    const start = nowTime();
    setBusy(true);
    try {
      const details = buildBaseDetails(selectedLabel);
      const record = await base44.entities.FieldRecord.create({
        operator_name: selectedOperator.name,
        operator_id: selectedOperator.id,
        operation: `${selectedParsed.actCode}. ${selectedParsed.actName}`,
        orchard_number: selectedParsed.orchard,
        start_time: start,
        date: today,
        planned_date: selectedLabel.date,
        qr_scanned: false,
        created_by_user_id: currentUser?.id,
        additional_details: JSON.stringify(details),
      });
      setLocalOpenRecordId(record.id);
      setLocalStartedAt(start);
      setNow(Date.now());
      invalidateAll();
    } catch (err) {
      toast({ title: "Erro ao iniciar", description: err.message, variant: "destructive" });
    }
    setBusy(false);
  };

  const handlePausar = async () => {
    if (!isStarted || !currentRecordId || busy) return;
    setBusy(true);
    try {
      await base44.entities.FieldRecord.update(currentRecordId, { end_time: nowTime() });
      setLocalOpenRecordId(null);
      setLocalStartedAt(null);
      invalidateAll();
      toast({ title: "Intervalo pausado", description: "A atividade segue pendente. Toque Iniciar para retomar." });
    } catch (err) {
      toast({ title: "Erro ao pausar", description: err.message, variant: "destructive" });
    }
    setBusy(false);
  };

  const handleConcluirClick = () => {
    if (!isStarted || !currentRecordId || busy) return;
    const hasFields = registrationFields.length > 0;
    const dateConflict = !!selectedLabel.date && selectedLabel.date !== today;
    if (hasFields || dateConflict) {
      setShowComplete(true);
    } else {
      finalize({}, "today");
    }
  };

  const finalize = async (customValues, dateChoice) => {
    if (!currentRecordId || !selectedLabel || !selectedOperator) return;
    setBusy(true);
    try {
      const details = buildBaseDetails(selectedLabel);
      Object.assign(details, customValues);
      const recordDate =
        dateChoice === "original" && selectedLabel.original_date
          ? selectedLabel.original_date
          : today;
      await base44.entities.FieldRecord.update(currentRecordId, {
        end_time: nowTime(),
        date: recordDate,
        additional_details: JSON.stringify(details),
      });
      await base44.entities.PlanningLabel.update(selectedLabel.id, { concluded: true });
      if (details.ra_id) {
        try {
          await base44.functions.invoke("markRAExecuted", { ra_id: details.ra_id });
          queryClient.invalidateQueries({ queryKey: ["recommendations"] });
          queryClient.invalidateQueries({ queryKey: ["recommendations-active"] });
        } catch (e) {
          console.error("Failed to mark RA:", e);
        }
      }
      setLocalOpenRecordId(null);
      setLocalStartedAt(null);
      setShowComplete(false);
      invalidateAll();
      if (details.ra_id) {
        setRaDetailId(details.ra_id);
      } else {
        toast({ title: "Atividade concluída!" });
      }
    } catch (err) {
      toast({ title: "Erro ao concluir", description: err.message, variant: "destructive" });
    }
    setBusy(false);
  };

  // === QR Scanner ===
  const handleQRScan = async (rawValue) => {
    setShowScanner(false);
    try {
      let qr_data = rawValue;
      let date = new Date().toISOString().split("T")[0];
      if (!rawValue.startsWith("http")) {
        const data = JSON.parse(rawValue);
        const params = new URLSearchParams({
          op_id: data.operator_id || "",
          act_id: data.operation || "",
          act_code: data.operation || "",
          act_name: data.operation_name || "",
          orchard: data.orchard || "",
        });
        qr_data = `${window.location.origin}/?${params.toString()}`;
      }
      const url = new URL(qr_data);
      const raLabelId = url.searchParams.get("ra_label_id");
      if (raLabelId) {
        try {
          const label = await base44.entities.PlanningLabel.get(raLabelId);
          let raId = null;
          try { raId = JSON.parse(label.additional_details || "{}").ra_id; } catch {}
          if (raId) {
            const ra = await base44.entities.AgronomicRecommendation.get(raId);
            if ((ra.status || "").toLowerCase() === "executada") {
              toast({ title: "RA já executada", description: `A RA ${ra.code} já foi concluída.` });
              setRaDetailId(raId);
              return;
            }
          }
          setQrLabel({ ...label, qr_data, date });
        } catch {
          setQrLabel({ qr_data, date });
        }
      } else {
        setQrLabel({ qr_data, date });
      }
    } catch {
      toast({ title: "QR Code inválido", description: "Formato não reconhecido.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-5 pb-8 rounded-b-3xl">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">HP Avocado</h1>
            <p className="text-primary-foreground/70 text-sm">
              {selectedOperator ? `Olá, ${selectedOperator.name.split(" ")[0]}` : "Boletim de Serviços"}
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowScanner(true)}
            className="rounded-xl gap-2"
          >
            <QrCode className="w-4 h-4" />
            QR Code
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 -mt-3 space-y-4">
        {/* Seletor (operador admin + atividades) */}
        <div className="bg-card rounded-2xl shadow-lg border border-border p-3">
          {loadingOperators && !selectedOperator ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <ActivitySelector
              isAdmin={isAdmin}
              operators={operators}
              selectedOperatorId={selectedOperator?.id}
              onSelectOperator={(id) => {
                setSelectedOperator(operators.find((o) => o.id === id) || null);
                setSelectedLabelId(null);
                setLocalOpenRecordId(null);
                setLocalStartedAt(null);
              }}
              activities={pendingActivities}
              selectedActivityId={selectedLabelId}
              onSelectActivity={(id) => {
                setSelectedLabelId(id);
                setLocalOpenRecordId(null);
                setLocalStartedAt(null);
              }}
            />
          )}
        </div>

        {/* Conteúdo principal */}
        {!selectedOperator ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Leaf className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">
              {isAdmin ? "Selecione um operador" : "Nenhum operador vinculado"}
            </p>
            <p className="text-muted-foreground/70 text-sm mt-1">
              {isAdmin ? "para ver as atividades do dia" : "Peça ao admin para vincular seu usuário"}
            </p>
          </div>
        ) : !selectedLabel ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Leaf className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Nenhuma atividade pendente para hoje</p>
            <p className="text-muted-foreground/70 text-sm mt-1">
              Escaneie o QR de uma ficha ou registre uma atividade avulsa
            </p>
          </div>
        ) : (
          <>
            {/* Card da atividade */}
            <div className="bg-card rounded-2xl border-2 border-primary/20 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Leaf className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-foreground leading-tight">
                    {selectedParsed.actCode}. {selectedParsed.actName}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Trees className="w-3.5 h-3.5" /> Pomar {selectedParsed.orchard}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays className="w-3.5 h-3.5" />
                      {format(new Date(selectedLabel.date + "T12:00:00"), "dd/MM/yyyy")}
                    </span>
                  </div>
                  {selectedLabel.date !== today && (
                    <span className="inline-block mt-1.5 text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md">
                      Planejada para outra data
                    </span>
                  )}
                </div>
              </div>

              {/* Status / cronômetro */}
              <AnimatePresence mode="wait">
                {isStarted ? (
                  <motion.div
                    key="started"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 bg-primary/5 rounded-xl px-3 py-2 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                      <Clock className="w-3.5 h-3.5" /> Iniciado às {currentStart}
                    </span>
                    <span className="text-lg font-bold tabular-nums text-primary">
                      {formatDuration(elapsedMs)}
                    </span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="idle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="mt-3 text-xs text-muted-foreground text-center"
                  >
                    Toque em Iniciar para começar o registro
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 3 botões grandes */}
            <div className="space-y-3">
              <Button
                size="lg"
                disabled={isStarted || busy}
                onClick={handleIniciar}
                className="w-full rounded-2xl h-16 text-lg gap-2"
              >
                {busy && !isStarted ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-6 h-6" />}
                Iniciar
              </Button>

              <Button
                size="lg"
                disabled={!isStarted || busy}
                onClick={handlePausar}
                className="w-full rounded-2xl h-16 text-lg gap-2 bg-accent text-accent-foreground hover:bg-accent/90"
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Pause className="w-6 h-6" />}
                Pausar
              </Button>

              <button
                disabled={!isStarted || busy}
                onClick={handleConcluirClick}
                className={`w-full rounded-2xl h-16 text-lg font-semibold flex items-center justify-center gap-2 transition-colors
                  ${isStarted && !busy
                    ? "bg-green-700 text-white hover:bg-green-700/90"
                    : "bg-muted text-muted-foreground/60 cursor-not-allowed"}`}
              >
                {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-6 h-6" />}
                Concluir
              </button>
            </div>
          </>
        )}
      </div>

      {/* QR Scanner */}
      <AnimatePresence>
        {showScanner && <QRScanner onScan={handleQRScan} onClose={() => setShowScanner(false)} />}
      </AnimatePresence>

      {/* Modal QR — fluxo de ficha impressa */}
      {qrLabel && (
        <PendingRecordModal
          label={qrLabel}
          operators={operators}
          operations={operations}
          onSave={async (data, options = {}) => {
            const { customValues, ...recordData } = data;
            let mergedDetails = {};
            try { mergedDetails = qrLabel?.additional_details ? JSON.parse(qrLabel.additional_details) : {}; } catch {}
            if (customValues && typeof customValues === "object") Object.assign(mergedDetails, customValues);
            if (qrLabel?.id) {
              await base44.entities.PlanningLabel.update(qrLabel.id, {
                additional_details: JSON.stringify(mergedDetails),
              });
              queryClient.invalidateQueries({ queryKey: ["planning-labels"] });
              queryClient.invalidateQueries({ queryKey: ["pending-labels"] });
            }
            await base44.entities.FieldRecord.create({
              ...recordData,
              date: recordData.date || today,
              qr_scanned: true,
              created_by_user_id: currentUser?.id,
              additional_details: Object.keys(mergedDetails).length > 0 ? JSON.stringify(mergedDetails) : null,
            });
            queryClient.invalidateQueries({ queryKey: ["field-records"] });
            queryClient.invalidateQueries({ queryKey: ["field-records-date"] });
            invalidateAll();
            if (mergedDetails.ra_id) {
              try {
                await base44.functions.invoke("markRAExecuted", { ra_id: mergedDetails.ra_id });
                queryClient.invalidateQueries({ queryKey: ["recommendations"] });
                queryClient.invalidateQueries({ queryKey: ["recommendations-active"] });
              } catch (e) { console.error("Failed to mark RA:", e); }
            }
            if (options.keepPending) {
              const current = qrLabel;
              setQrLabel(null);
              setTimeout(() => setQrLabel(current), 100);
            } else {
              setQrLabel(null);
              if (mergedDetails.ra_id) setRaDetailId(mergedDetails.ra_id);
            }
          }}
          onClose={() => setQrLabel(null)}
        />
      )}

      {/* Modal de conclusão */}
      {showComplete && selectedLabel && (
        <CompleteActivityModal
          label={selectedLabel}
          customFields={registrationFields}
          onClose={() => setShowComplete(false)}
          onConfirm={(customValues, dateChoice) => finalize(customValues, dateChoice)}
        />
      )}

      {raDetailId && <RADetailModal raId={raDetailId} onClose={() => setRaDetailId(null)} />}

      <QuickActionFAB />
      <BottomNav />
    </div>
  );
}