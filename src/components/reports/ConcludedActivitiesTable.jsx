import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2 } from "lucide-react";

const calcHours = (startTime, endTime) => {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 24 * 60;
  return diff / 60;
};

export default function ConcludedActivitiesTable({ records }) {
  if (records.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm font-medium">Nenhuma atividade concluída</p>
      </div>
    );
  }

  const sorted = [...records].sort((a, b) => {
    const da = a.date || "";
    const db = b.date || "";
    if (db !== da) return db.localeCompare(da);
    return (b.start_time || "").localeCompare(a.start_time || "");
  });

  return (
    <div className="space-y-2">
      {sorted.map((r) => {
        const hours = calcHours(r.start_time, r.end_time);
        return (
          <div key={r.id} className="bg-card border border-border rounded-xl p-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-sm">{r.operator_name}</span>
              <span className="flex items-center gap-1 text-xs text-green-600 font-bold">
                <CheckCircle2 className="w-3 h-3" />
                {hours.toFixed(1)}h
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              <span>{r.operation}</span>
              <span>Pomar {r.orchard_number}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {(() => {
                  try { return format(new Date(r.date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }); }
                  catch { return r.date; }
                })()}
              </span>
              <span>{r.start_time} → {r.end_time}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}