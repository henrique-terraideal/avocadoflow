import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, QrCode, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/components/ui/use-toast";

import StepIndicator from "../components/field/StepIndicator";
import OperatorSelector from "../components/field/OperatorSelector";
import OperationSelector from "../components/field/OperationSelector";
import OrchardSelector from "../components/field/OrchardSelector";
import TimeEntry from "../components/field/TimeEntry";
import ReviewCard from "../components/field/ReviewCard";
import QRScanner from "../components/field/QRScanner";
import BottomNav from "../components/field/BottomNav";
import PendingRecords from "../components/field/PendingRecords";
import PendingRecordModal from "../components/field/PendingRecordModal";
import QuickActionFAB from "../components/QuickActionFAB";

export default function NewRecord() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [qrLabel, setQrLabel] = useState(null);

  const [currentUser, setCurrentUser] = useState(null);
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [selectedOrchard, setSelectedOrchard] = useState(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const { data: operators = [], isLoading } = useQuery({
    queryKey: ["operators"],
    queryFn: () => base44.entities.Operator.filter({ active: true }),
  });

  const { data: operations = [] } = useQuery({
    queryKey: ["operations"],
    queryFn: () => base44.entities.Operation.filter({ active: true }),
  });

  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    base44.auth.me().then((u) => {
      setCurrentUser(u);
      // Se for operador (não admin), pré-selecionar o operador pelo nome
      if (u && u.role !== "admin") {
        // Será feito após os operadores carregarem
      }
    }).catch(() => {});
  }, []);

  // Pré-selecionar operador para usuário não-admin após carregar lista
  useEffect(() => {
    if (!currentUser || isAdmin || operators.length === 0 || selectedOperator) return;
    const match = operators.find((op) => op.id === currentUser.linked_operator_id)
      || operators.find((op) => op.name.toLowerCase() === currentUser.full_name?.toLowerCase());
    if (match) setSelectedOperator(match);
  }, [currentUser, operators, isAdmin]);

  // Ler parâmetros da URL (QR code do app nativo do celular)
  useEffect(() => {
    if (operators.length === 0 || operations.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const op_id = params.get("op_id");
    const act_id = params.get("act_id");
    const act_code = params.get("act_code");
    const act_name = params.get("act_name");
    const orchard = params.get("orchard");
    if (!op_id && !act_id) return;

    if (op_id) {
      const found = operators.find(o => o.id === op_id);
      if (found) setSelectedOperator(found);
    }
    if (act_id) {
      const foundOp = operations.find(o => o.id === act_id);
      if (foundOp) {
        setSelectedOperation({ id: foundOp.code, name: foundOp.name });
      } else if (act_code && act_name) {
        setSelectedOperation({ id: act_code, name: act_name });
      }
    }
    if (orchard) setSelectedOrchard(orchard);

    // Se tudo preenchido, pula para horários
    if (op_id && act_id && orchard) setStep(3);

    // Limpa os params da URL sem recarregar
    window.history.replaceState({}, "", window.location.pathname);
  }, [operators, operations]);

  const handleQRScan = (rawValue) => {
    setShowScanner(false);
    try {
      // Monta um objeto "label" simulado para abrir o PendingRecordModal
      let qr_data = rawValue;
      let date = new Date().toISOString().split("T")[0];

      // Suporte a JSON legado — converte para URL
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

      setQrLabel({ qr_data, date });
    } catch {
      toast({ title: "QR Code inválido", description: "Formato não reconhecido.", variant: "destructive" });
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0: return !!selectedOperator;
      case 1: return !!selectedOperation;
      case 2: return !!selectedOrchard;
      case 3: return !!startTime && !!endTime;
      default: return false;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const today = new Date().toISOString().split("T")[0];
    await base44.entities.FieldRecord.create({
      operator_name: selectedOperator.name,
      operator_id: selectedOperator.id,
      operation: `${selectedOperation.id}. ${selectedOperation.name}`,
      orchard_number: selectedOrchard,
      start_time: startTime,
      end_time: endTime,
      date: today,
      qr_scanned: false,
      created_by_user_id: currentUser?.id,
    });
    queryClient.invalidateQueries({ queryKey: ["field-records"] });
    setSubmitting(false);
    setSubmitted(true);
  };

  const handleReset = () => {
    setStep(0);
    setSelectedOperator(null);
    setSelectedOperation(null);
    setSelectedOrchard(null);
    setStartTime("");
    setEndTime("");
    setSubmitted(false);
  };


  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-24 h-24 rounded-full bg-primary flex items-center justify-center mb-6"
        >
          <Check className="w-12 h-12 text-primary-foreground" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">Registrado!</h2>
        <p className="text-muted-foreground text-center mb-8">
          Operação registrada com sucesso.
        </p>
        <Button onClick={handleReset} size="lg" className="rounded-xl px-8 h-14 text-lg">
          Novo Registro
        </Button>
      </div>
    );
  }

  const recordData = {
    operator_name: selectedOperator?.name || "",
    operation: selectedOperation ? `${selectedOperation.id}. ${selectedOperation.name}` : "",
    orchard_number: selectedOrchard || "",
    start_time: startTime,
    end_time: endTime,
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-5 pb-8 rounded-b-3xl">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight">HP Avocado</h1>
            <p className="text-primary-foreground/70 text-sm">Boletim Diário de Serviços</p>
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

      {/* Step Indicator */}
      <div className="max-w-lg mx-auto px-4 -mt-3">
        <div className="bg-card rounded-2xl shadow-lg border border-border p-2">
          <StepIndicator currentStep={step} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div key="step0" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <h2 className="text-lg font-bold mb-4">Quem está operando?</h2>
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : operators.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <p>Nenhum operador cadastrado.</p>
                  <p className="text-sm mt-1">Cadastre operadores na aba Admin.</p>
                </div>
              ) : !isAdmin ? (
                // Operador: mostra apenas o card dele, bloqueado
                <div>
                  {selectedOperator ? (
                    <>
                      <div className="flex flex-col items-center gap-3 p-6 bg-primary/10 rounded-2xl border-2 border-primary">
                        {selectedOperator.photo_url ? (
                          <img src={selectedOperator.photo_url} alt={selectedOperator.name} className="w-20 h-20 rounded-full object-cover" />
                        ) : (
                          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-3xl font-bold">
                            {selectedOperator.name[0]}
                          </div>
                        )}
                        <span className="font-bold text-lg">{selectedOperator.name}</span>
                        <span className="text-xs text-muted-foreground">Você está logado como este operador</span>
                      </div>
                      <PendingRecords
                        operatorId={selectedOperator.id}
                        isAdmin={false}
                        operators={operators}
                        operations={operations}
                        currentUser={currentUser}
                      />
                    </>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <p>Nenhum operador vinculado à sua conta.</p>
                      <p className="text-sm mt-1">Peça ao administrador para cadastrar um operador com seu nome.</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <OperatorSelector operators={operators} selectedId={selectedOperator?.id} onSelect={(op) => setSelectedOperator(op)} />
                  <PendingRecords
                    operatorId={null}
                    isAdmin={true}
                    operators={operators}
                    operations={operations}
                    currentUser={currentUser}
                  />
                </>
              )}
            </motion.div>
          )}

          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <h2 className="text-lg font-bold mb-4">Qual operação?</h2>
              <OperationSelector selectedId={selectedOperation?.id} onSelect={(op) => setSelectedOperation({ id: op.id, name: op.name })} />
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <h2 className="text-lg font-bold mb-4">Qual pomar?</h2>
              <OrchardSelector selected={selectedOrchard} onSelect={setSelectedOrchard} />
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
              <h2 className="text-lg font-bold mb-4">Horários</h2>
              <TimeEntry
                startTime={startTime}
                endTime={endTime}
                onStartChange={setStartTime}
                onEndChange={setEndTime}
              />
              <div className="mt-6">
                <ReviewCard data={recordData} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => setStep(step - 1)}
              className="rounded-xl h-14 px-6"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Voltar
            </Button>
          )}
          <Button
            size="lg"
            disabled={!canProceed() || submitting}
            onClick={() => {
              if (step < 3) setStep(step + 1);
              else handleSubmit();
            }}
            className="flex-1 rounded-xl h-14 text-lg"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : step < 3 ? (
              <>
                Próximo
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            ) : (
              <>
                <Check className="w-5 h-5 mr-2" />
                Registrar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* QR Scanner */}
      <AnimatePresence>
        {showScanner && (
          <QRScanner onScan={handleQRScan} onClose={() => setShowScanner(false)} />
        )}
      </AnimatePresence>

      {/* Modal QR — mesmo fluxo do pendente */}
      {qrLabel && (
        <PendingRecordModal
          label={qrLabel}
          operators={operators}
          operations={operations}
          onSave={async (data, options = {}) => {
            const today = new Date().toISOString().split("T")[0];
            const { customValues, ...recordData } = data;

            // Start with PlanningLabel's existing additional_details (from planning stage)
            let mergedDetails = {};
            try { mergedDetails = qrLabel?.additional_details ? JSON.parse(qrLabel.additional_details) : {}; }
            catch { mergedDetails = {}; }
            // Merge registration-stage values on top
            if (customValues && typeof customValues === "object") {
              Object.assign(mergedDetails, customValues);
            }

            // Always update PlanningLabel with merged details if it has an id
            if (qrLabel?.id) {
              await base44.entities.PlanningLabel.update(qrLabel.id, { additional_details: JSON.stringify(mergedDetails) });
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
            if (options.keepPending) {
              // Reabre o modal com campos zerados para novo registro na mesma atividade
              const current = qrLabel;
              setQrLabel(null);
              setTimeout(() => setQrLabel(current), 100);
            } else {
              setQrLabel(null);
              setSubmitted(true);
            }
          }}
          onClose={() => setQrLabel(null)}
        />
      )}

      <QuickActionFAB />
      <BottomNav />
    </div>
  );
}