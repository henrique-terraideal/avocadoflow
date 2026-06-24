import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Check, X, Clock, Pencil, ChevronDown, RefreshCw, CheckCircle2, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import OperationFilter from "./OperationFilter";
import { AnimatePresence, motion } from "framer-motion";

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function PendingRecordModal({ label, operators, operations, onSave, onClose }) {
  let initOpId = "", initActCode = "", initOrchard = "";
  try {
    const url = new URL(label.qr_data);
    initOpId = url.searchParams.get("op_id") || "";
    initActCode = url.searchParams.get("act_code") || "";
    initOrchard = url.searchParams.get("orchard") || "";
  } catch {}

  const [selectedOperator, setSelectedOperator] = useState(
    operators.find((o) => o.id === initOpId) || null
  );
  const [selectedOperation, setSelectedOperation] = useState(
    operations.find((o) => o.code === initActCode) || null
  );
  const [selectedOrchard, setSelectedOrchard] = useState(initOrchard);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [observations, setObservations] = useState("");
  const todayStr = new Date().toISOString().split("T")[0];
  const [showDetails, setShowDetails] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  // Para atividades reprogramadas: null = não escolheu ainda, "today" ou "original"
  const [recordDateChoice, setRecordDateChoice] = useState(label.auto_rescheduled ? null : "today");

  const { data: orchardList = [] } = useQuery({
    queryKey: ["orchards"],
    queryFn: () => base44.entities.Orchard.filter({ active: true }, "sort_order", 200),
  });
  const orchards = orchardList.map((o) => o.code);
  const sortedOperations = [...operations].sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99));

  const canSave = selectedOperator && selectedOperation && selectedOrchard && startTime && endTime && recordDateChoice !== null;

  const buildData = () => {
    const useOriginal = recordDateChoice === "original";
    return {
      operator_name: selectedOperator.name,
      operator_id: selectedOperator.id,
      operation: `${selectedOperation.code}. ${selectedOperation.name}`,
      orchard_number: selectedOrchard,
      start_time: startTime,
      end_time: endTime,
      observations,
      planned_date: label.date,
      // Se escolheu data original, sobrepõe o `date` para a data original
      ...(useOriginal && label.original_date ? { date: label.original_date } : {}),
    };
  };

  // Fecha a atividade (some dos pendentes)
  const handleClose = () => {
    onSave(buildData(), { keepPending: false });
  };

  // Mantém a atividade pendente (registra mas não fecha)
  const handleKeepPending = () => {
    onSave(buildData(), { keepPending: true });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-card w-full max-w-lg rounded-t-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Registrar Atividade</h2>
            {label.date && (
              <p className="text-xs text-muted-foreground mt-0.5">
                📅 Planejado para {format(new Date(label.date + "T12:00:00"), "dd/MM/yyyy")}
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Seletor de data — apenas para atividades reprogramadas */}
        {label.auto_rescheduled && label.original_date && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-red-500 shrink-0" />
              <p className="text-sm font-semibold text-red-700">Atividade reprogramada — em qual data registrar?</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setRecordDateChoice("today")}
                className={`p-3 rounded-xl border-2 text-left transition-colors
                  ${recordDateChoice === "today" ? "border-primary bg-primary/10" : "border-border bg-white hover:bg-muted/50"}`}
              >
                <p className="text-xs font-bold text-foreground">Hoje</p>
                <p className="text-xs text-muted-foreground">{format(new Date(todayStr + "T12:00:00"), "dd/MM/yyyy")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Fiz hoje</p>
              </button>
              <button
                onClick={() => setRecordDateChoice("original")}
                className={`p-3 rounded-xl border-2 text-left transition-colors
                  ${recordDateChoice === "original" ? "border-red-500 bg-red-50" : "border-border bg-white hover:bg-muted/50"}`}
              >
                <p className="text-xs font-bold text-foreground">Data original</p>
                <p className="text-xs text-muted-foreground">{format(new Date(label.original_date + "T12:00:00"), "dd/MM/yyyy")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Esqueci de registrar</p>
              </button>
            </div>
          </div>
        )}

        {/* Resumo dos campos pré-preenchidos + botão editar */}
        <div className="bg-muted/50 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div className="space-y-0.5 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {selectedOperator?.name || "—"}
            </p>
            <p className="text-xs text-primary font-medium truncate">
              {selectedOperation ? `${selectedOperation.code}. ${selectedOperation.name}` : "—"}
            </p>
            <p className="text-xs text-muted-foreground">🌳 Pomar {selectedOrchard || "—"}</p>
          </div>
          <button
            onClick={() => setShowDetails((v) => !v)}
            className={`ml-3 shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl border transition-colors text-xs font-semibold
              ${showDetails ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:bg-muted"}`}
            title="Editar campos"
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDetails ? "rotate-180" : ""}`} />
          </button>
        </div>

        {/* Campos de edição (colapsáveis) */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden space-y-4"
            >
              {/* Operador */}
              <div>
                <p className="text-sm font-semibold mb-2">Operador</p>
                <div className="grid grid-cols-3 gap-2">
                  {operators.map((op) => (
                    <button
                      key={op.id}
                      onClick={() => setSelectedOperator(op)}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all text-center
                        ${selectedOperator?.id === op.id ? "border-primary bg-primary/10" : "border-border bg-muted/30"}`}
                    >
                      {op.photo_url ? (
                        <img src={op.photo_url} alt={op.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                          {op.name[0]}
                        </div>
                      )}
                      <span className="text-xs font-medium leading-tight line-clamp-2">{op.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Operação */}
              <div>
                <p className="text-sm font-semibold mb-2">Atividade</p>
                <OperationFilter
                  operations={sortedOperations}
                  selectedId={selectedOperation?.code}
                  onSelect={(op) => {
                    const found = operations.find((o) => o.code === op.id);
                    setSelectedOperation(found || null);
                  }}
                />
              </div>

              {/* Pomar */}
              <div>
                <p className="text-sm font-semibold mb-2">Pomar</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {orchards.map((o) => (
                    <button
                      key={o}
                      onClick={() => setSelectedOrchard(o)}
                      className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all
                        ${selectedOrchard === o ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/30"}`}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Horários — sempre visíveis */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-sm font-semibold mb-1.5">Início</p>
            <div className="flex gap-1.5">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="flex-1 h-12 rounded-xl border border-input bg-background px-3 text-base font-semibold text-center focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={() => setStartTime(nowTime())}
                className="h-12 px-3 rounded-xl border border-input bg-muted hover:bg-muted/80 transition-colors"
              >
                <Clock className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold mb-1.5">Término</p>
            <div className="flex gap-1.5">
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="flex-1 h-12 rounded-xl border border-input bg-background px-3 text-base font-semibold text-center focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={() => setEndTime(nowTime())}
                className="h-12 px-3 rounded-xl border border-input bg-muted hover:bg-muted/80 transition-colors"
              >
                <Clock className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>

        {/* Observações */}
        <div>
          <p className="text-sm font-semibold mb-1.5">Observações (opcional)</p>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Digite observações..."
            rows={2}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Opções de registro */}
        <AnimatePresence mode="wait">
          {!showOptions ? (
            <motion.div key="btns" className="flex gap-2 pt-1 pb-2">
              <Button variant="outline" size="lg" onClick={onClose} className="flex-1 rounded-xl h-12">
                Cancelar
              </Button>
              <Button size="lg" disabled={!canSave} onClick={() => setShowOptions(true)} className="flex-1 rounded-xl h-12 gap-1">
                <Check className="w-4 h-4" />
                Registrar
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="options"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2 pt-1 pb-2"
            >
              <p className="text-sm font-semibold text-center text-muted-foreground">O que fazer com esta atividade?</p>
              <button
                onClick={handleClose}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-primary bg-primary/5 hover:bg-primary/10 transition-colors text-left"
              >
                <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Encerrar atividade</p>
                  <p className="text-xs text-muted-foreground">Registra e remove dos pendentes</p>
                </div>
              </button>
              <button
                onClick={handleKeepPending}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-accent bg-accent/5 hover:bg-accent/10 transition-colors text-left"
              >
                <RefreshCw className="w-6 h-6 text-accent-foreground shrink-0" />
                <div>
                  <p className="font-semibold text-sm">Continuar depois</p>
                  <p className="text-xs text-muted-foreground">Registra este período e mantém pendente</p>
                </div>
              </button>
              <Button variant="ghost" size="sm" onClick={() => setShowOptions(false)} className="w-full rounded-xl text-muted-foreground">
                Voltar
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}