import React from "react";
import { format } from "date-fns";
import { Leaf, Trees, CalendarDays, User } from "lucide-react";

/**
 * Seletor de atividades pendentes (e de operador, quando admin).
 * activities: [{ label, parsed: { actCode, actName, orchard } }]
 */
export default function ActivitySelector({
  isAdmin,
  operators,
  selectedOperatorId,
  onSelectOperator,
  activities,
  selectedActivityId,
  onSelectActivity,
}) {
  return (
    <div className="space-y-3">
      {isAdmin && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5" /> Operador
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {operators.map((op) => (
              <button
                key={op.id}
                onClick={() => onSelectOperator(op.id)}
                className={`flex items-center gap-2 shrink-0 px-3 py-2 rounded-xl border-2 transition-all
                  ${selectedOperatorId === op.id ? "border-primary bg-primary/10" : "border-border bg-card"}`}
              >
                {op.photo_url ? (
                  <img src={op.photo_url} alt={op.name} className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                    {op.name[0]}
                  </div>
                )}
                <span className="text-xs font-semibold whitespace-nowrap">{op.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {activities.length > 1 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Leaf className="w-3.5 h-3.5" /> Atividades pendentes ({activities.length})
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {activities.map(({ label, parsed }) => (
              <button
                key={label.id}
                onClick={() => onSelectActivity(label.id)}
                className={`shrink-0 w-44 text-left p-3 rounded-2xl border-2 transition-all
                  ${selectedActivityId === label.id ? "border-primary bg-primary/5 shadow-sm" : "border-border bg-card"}`}
              >
                <p className="text-sm font-bold text-foreground truncate">
                  {parsed.actCode}. {parsed.actName}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Trees className="w-3 h-3" /> {parsed.orchard}
                </p>
                <p className="text-xs text-muted-foreground/70 flex items-center gap-1 mt-0.5">
                  <CalendarDays className="w-3 h-3" /> {format(new Date(label.date + "T12:00:00"), "dd/MM")}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}