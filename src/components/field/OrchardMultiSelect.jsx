import React from "react";
import { Check, Layers } from "lucide-react";

/**
 * Seleção múltipla de pomares, com atalho "Todos".
 * values: string[] de códigos de pomar
 */
export default function OrchardMultiSelect({ values = [], onChange, orchards = [], disabled = false }) {
  const allSelected = orchards.length > 0 && orchards.every((o) => values.includes(o));

  const toggle = (code) => {
    if (disabled) return;
    onChange(values.includes(code) ? values.filter((v) => v !== code) : [...values, code]);
  };

  const toggleAll = () => {
    if (disabled) return;
    onChange(allSelected ? [] : [...orchards]);
  };

  if (orchards.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">Nenhum pomar cadastrado.</p>;
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={toggleAll}
        disabled={disabled}
        className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 text-xs font-bold transition-all
          ${allSelected
            ? "border-primary bg-primary/10 text-primary"
            : "border-dashed border-border text-muted-foreground hover:border-primary/40"}
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <Layers className="w-3.5 h-3.5" />
        {allSelected ? "Limpar seleção" : "Todos os pomares"}
      </button>

      <div className="grid grid-cols-5 gap-1.5">
        {orchards.map((code) => {
          const active = values.includes(code);
          return (
            <button
              key={code}
              type="button"
              onClick={() => toggle(code)}
              disabled={disabled}
              className={`relative py-2.5 rounded-xl text-sm font-bold border-2 transition-all
                ${active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted/30 hover:border-primary/40"}
                ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {code}
              {active && (
                <Check className="w-3 h-3 absolute top-0.5 right-0.5 opacity-80" />
              )}
            </button>
          );
        })}
      </div>

      {values.length > 1 && (
        <p className="text-[11px] text-muted-foreground">
          {values.length} pomares nesta atividade: {values.join(", ")}
        </p>
      )}
    </div>
  );
}