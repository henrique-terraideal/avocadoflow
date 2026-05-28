import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ClipboardCheck, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { format, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

const todayStr = () => new Date().toISOString().split("T")[0];

export default function PendingRecords({ operatorId, isAdmin, onSelect }) {
  const [selectedDate, setSelectedDate] = useState(todayStr());

  const { data: pendingLabels = [] } = useQuery({
    queryKey: ["pending-labels", operatorId, isAdmin, selectedDate],
    queryFn: () => base44.entities.PlanningLabel.filter({ date: selectedDate }, "-created_date", 200),
    enabled: isAdmin ? true : !!operatorId,
  });

  const { data: existingRecords = [] } = useQuery({
    queryKey: ["field-records-date", operatorId, isAdmin, selectedDate],
    queryFn: () => {
      if (isAdmin) {
        return base44.entities.FieldRecord.filter({ date: selectedDate }, "-created_date", 500);
      }
      return base44.entities.FieldRecord.filter({ date: selectedDate, operator_id: operatorId }, "-created_date", 100);
    },
    enabled: isAdmin ? true : !!operatorId,
  });

  // Filtra etiquetas pendentes
  const pending = pendingLabels.filter((label) => {
    if (!label.qr_data) return false;
    try {
      const url = new URL(label.qr_data);
      const labelOpId = url.searchParams.get("op_id");

      // Operador normal: só vê as suas
      if (!isAdmin && labelOpId !== operatorId) return false;

      const actCode = url.searchParams.get("act_code");
      const alreadyDone = existingRecords.some(
        (r) =>
          r.operator_id === labelOpId &&
          r.orchard_number === label.orchard_number &&
          r.start_time &&
          r.end_time &&
          actCode && r.operation?.includes(actCode)
      );
      return !alreadyDone;
    } catch {
      return false;
    }
  });

  const isToday = selectedDate === todayStr();
  const formattedDate = format(new Date(selectedDate + "T12:00:00"), "EEE, d 'de' MMM", { locale: ptBR });

  return (
    <div className="mt-5">
      {/* Cabeçalho com filtro de data */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Registros pendentes</span>
          {pending.length > 0 && (
            <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full font-bold">
              {pending.length}
            </span>
          )}
        </div>
      </div>

      {/* Seletor de data */}
      <div className="flex items-center justify-between bg-card border border-border rounded-2xl px-3 py-2 shadow-sm mb-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setSelectedDate(subDays(new Date(selectedDate + "T12:00:00"), 1).toISOString().split("T")[0])}
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-semibold capitalize">{formattedDate}</p>
          {isToday && <p className="text-xs text-primary font-medium">Hoje</p>}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setSelectedDate(addDays(new Date(selectedDate + "T12:00:00"), 1).toISOString().split("T")[0])}
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {pending.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-3">Nenhum registro pendente para este dia.</p>
      ) : (
        <div className="space-y-2">
          {pending.map((label) => {
            let actId, actCode, actName, orchard, opName;
            try {
              const url = new URL(label.qr_data);
              actId = url.searchParams.get("act_id");
              actCode = url.searchParams.get("act_code");
              actName = url.searchParams.get("act_name");
              orchard = url.searchParams.get("orchard");
              opName = url.searchParams.get("op_name");
            } catch {
              return null;
            }

            return (
              <motion.button
                key={label.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelect({ actId, actCode, actName, orchard })}
                className="w-full text-left bg-card border-2 border-accent/40 hover:border-accent rounded-2xl px-4 py-3 transition-colors shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {isAdmin && opName && (
                      <p className="text-xs text-muted-foreground font-semibold mb-0.5">{opName}</p>
                    )}
                    <p className="font-semibold text-sm text-foreground">
                      {actCode}. {actName}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">🌳 Pomar {orchard}</p>
                    <p className="text-xs text-muted-foreground/70 mt-0.5">
                      📅 Planejado para {format(new Date(label.date + "T12:00:00"), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-accent shrink-0 ml-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-medium">Preencher</span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}