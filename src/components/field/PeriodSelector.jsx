import React from "react";
import { Sunrise, Sun, Moon } from "lucide-react";
import { PERIODS } from "@/lib/periods";

const ICONS = { Manhã: Sunrise, Tarde: Sun, Noite: Moon };

export default function PeriodSelector({ value = [], onChange, invalid = false }) {
  const toggle = (period) => {
    onChange(value.includes(period) ? value.filter((p) => p !== period) : [...value, period]);
  };

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {PERIODS.map((period) => {
          const Icon = ICONS[period];
          const active = value.includes(period);
          return (
            <button
              key={period}
              type="button"
              onClick={() => toggle(period)}
              className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-bold transition-all
                ${active
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-primary/40"}
                ${invalid && !active ? "border-destructive/60" : ""}`}
            >
              <Icon className="w-4 h-4" />
              {period}
            </button>
          );
        })}
      </div>
      {invalid && value.length === 0 && (
        <p className="text-[11px] text-destructive">Selecione ao menos um período.</p>
      )}
    </div>
  );
}