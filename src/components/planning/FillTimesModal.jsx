import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Clock } from "lucide-react";

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function FillTimesModal({ label, onSave, onClose }) {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [observations, setObservations] = useState("");

  const canSave = startTime && endTime;

  const handleSave = () => {
    if (!canSave) return;
    onSave({ startTime, endTime, observations });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-0" onClick={onClose}>
      <div
        className="bg-card w-full max-w-lg rounded-t-3xl p-5 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Preencher Horários</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info da etiqueta */}
        <div className="bg-muted/50 rounded-xl p-3 text-sm space-y-1">
          <p className="font-semibold">{label.operator_name}</p>
          <p className="text-primary font-medium">{label.operation_code}. {label.operation_name}</p>
          <p className="text-muted-foreground">🌳 Pomar {label.orchard_number}</p>
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
                title="Agora"
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
                title="Agora"
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

        <div className="flex gap-2 pt-1">
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