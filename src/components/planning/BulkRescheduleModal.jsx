import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CalendarDays, X, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import DateInput from "@/components/ui/DateInput";

export default function BulkRescheduleModal({ count, onSave, onClose }) {
  const [newDate, setNewDate] = useState("");

  const handleSave = () => {
    if (!newDate) return;
    onSave(newDate);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-card w-full max-w-lg rounded-t-3xl p-5 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">Reagendar {count} atividade{count !== 1 ? "s" : ""}</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground">
          Selecione a nova data para as {count} atividade{count !== 1 ? "s" : ""} selecionadas.
        </p>

        <div>
          <p className="text-sm font-semibold mb-2">Nova data</p>
          <DateInput
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            className="w-full h-12 rounded-xl border border-input bg-background px-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
            autoFocus
          />
          {newDate && (
            <p className="text-xs text-muted-foreground mt-1.5 capitalize">
              {format(new Date(newDate + "T12:00:00"), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          )}
        </div>

        <div className="flex gap-2 pb-2">
          <Button variant="outline" size="lg" onClick={onClose} className="flex-1 rounded-xl h-12">
            Cancelar
          </Button>
          <Button size="lg" disabled={!newDate} onClick={handleSave} className="flex-1 rounded-xl h-12 gap-1">
            <Check className="w-4 h-4" />
            Reagendar
          </Button>
        </div>
      </div>
    </div>
  );
}