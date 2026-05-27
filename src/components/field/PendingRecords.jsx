import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ClipboardCheck, Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function PendingRecords({ operatorId, onSelect }) {
  const today = new Date().toISOString().split("T")[0];

  const { data: pendingLabels = [] } = useQuery({
    queryKey: ["pending-labels", operatorId, today],
    queryFn: () =>
      base44.entities.PlanningLabel.filter({ date: today }, "-created_date", 50),
    enabled: !!operatorId,
  });

  // Busca registros já criados hoje para esse operador
  const { data: existingRecords = [] } = useQuery({
    queryKey: ["field-records-today", operatorId, today],
    queryFn: () =>
      base44.entities.FieldRecord.filter({ date: today, operator_id: operatorId }, "-created_date", 100),
    enabled: !!operatorId,
  });

  // Filtra etiquetas do operador que ainda não têm registro com horário preenchido
  const pending = pendingLabels.filter((label) => {
    if (label.qr_data) {
      try {
        const url = new URL(label.qr_data);
        const labelOpId = url.searchParams.get("op_id");
        if (labelOpId !== operatorId) return false;
      } catch {
        return false;
      }
    } else {
      return false;
    }

    // Verifica se já existe registro completo para esta combinação
    const actCode = (() => {
      try {
        const url = new URL(label.qr_data);
        return url.searchParams.get("act_code");
      } catch { return null; }
    })();

    const alreadyDone = existingRecords.some(
      (r) =>
        r.orchard_number === label.orchard_number &&
        r.start_time &&
        r.end_time &&
        actCode && r.operation?.includes(actCode)
    );

    return !alreadyDone;
  });

  if (pending.length === 0) return null;

  return (
    <div className="mt-5">
      <div className="flex items-center gap-2 mb-3">
        <ClipboardCheck className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">Registros pendentes de hoje</span>
        <span className="text-xs bg-accent text-accent-foreground px-2 py-0.5 rounded-full font-bold">
          {pending.length}
        </span>
      </div>
      <div className="space-y-2">
        {pending.map((label) => {
          let actId, actCode, actName, orchard;
          try {
            const url = new URL(label.qr_data);
            actId = url.searchParams.get("act_id");
            actCode = url.searchParams.get("act_code");
            actName = url.searchParams.get("act_name");
            orchard = url.searchParams.get("orchard");
          } catch { return null; }

          return (
            <motion.button
              key={label.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect({ actId, actCode, actName, orchard })}
              className="w-full text-left bg-card border-2 border-accent/40 hover:border-accent rounded-2xl px-4 py-3 transition-colors shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    {actCode}. {actName}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">🌳 Pomar {orchard}</p>
                </div>
                <div className="flex items-center gap-1 text-accent">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium">Preencher horário</span>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}