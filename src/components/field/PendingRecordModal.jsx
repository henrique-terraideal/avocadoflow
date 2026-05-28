import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Check, X, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import OperationFilter from "./OperationFilter";

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function PendingRecordModal({ label, operators, operations, onSave, onClose }) {
  // Extrair dados do QR
  let initOpId = "", initActId = "", initActCode = "", initActName = "", initOrchard = "";
  try {
    const url = new URL(label.qr_data);
    initOpId = url.searchParams.get("op_id") || "";
    initActId = url.searchParams.get("act_id") || "";
    initActCode = url.searchParams.get("act_code") || "";
    initActName = url.searchParams.get("act_name") || "";
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

  const { data: orchardList = [] } = useQuery({
    queryKey: ["orchards"],
    queryFn: () => base44.entities.Orchard.filter({ active: true }, "sort_order", 200),
  });
  const orchards = orchardList.map((o) => o.code);
  const sortedOperations = [...operations].sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99));

  const canSave = selectedOperator && selectedOperation && selectedOrchard && startTime && endTime;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      operator_name: selectedOperator.name,
      operator_id: selectedOperator.id,
      operation: `${selectedOperation.code}. ${selectedOperation.name}`,
      orchard_number: selectedOrchard,
      start_time: startTime,
      end_time: endTime,
      observations,
      planned_date: label.date,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-card w-full max-w-lg rounded-t-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
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

        {/* Horários */}
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

        <div className="flex gap-2 pt-1 pb-2">
          <Button variant="outline" size="lg" onClick={onClose} className="flex-1 rounded-xl h-12">
            Cancelar
          </Button>
          <Button size="lg" disabled={!canSave} onClick={handleSave} className="flex-1 rounded-xl h-12 gap-1">
            <Check className="w-4 h-4" />
            Registrar
          </Button>
        </div>
      </div>
    </div>
  );
}