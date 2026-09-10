import React from "react";
import { Trees, Copy } from "lucide-react";

export const STATUS_STYLES = {
  executada: { bg: "bg-emerald-50", border: "border-emerald-400", bar: "bg-emerald-500", text: "text-emerald-700", label: "Executada" },
  pendente: { bg: "bg-rose-50", border: "border-rose-400", bar: "bg-rose-500", text: "text-rose-700", label: "Pendente" },
  planejada: { bg: "bg-sky-50", border: "border-sky-300", bar: "bg-sky-500", text: "text-sky-700", label: "Planejada" },
};

export default function MeetingCard({ label, status, onDuplicate }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.planejada;
  return (
    <div className={`${s.bg} ${s.border} border-l-4 rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between gap-1">
        <span className="text-xs font-bold text-foreground leading-tight line-clamp-2">
          {label.operation_code}. {label.operation_name}
        </span>
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          {onDuplicate && (
            <button
              onClick={(e) => { e.stopPropagation(); onDuplicate(label); }}
              className="text-muted-foreground hover:text-primary p-0.5 rounded transition-colors"
              title="Duplicar"
            >
              <Copy className="w-3 h-3" />
            </button>
          )}
          <span className={`${s.bar} w-2 h-2 rounded-full`} title={s.label} />
        </div>
      </div>
      <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
        <Trees className="w-3 h-3 shrink-0" />
        <span className="truncate">Pomar {label.orchard_number}</span>
      </div>
    </div>
  );
}