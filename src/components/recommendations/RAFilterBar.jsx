import React from "react";
import { X } from "lucide-react";

export default function RAFilterBar({
  types,
  orchards,
  activeTypes,
  activeOrchards,
  onToggleType,
  onToggleOrchard,
  onClear,
}) {
  const hasFilters = activeTypes.size > 0 || activeOrchards.size > 0;
  if (types.length === 0 && orchards.length === 0) return null;

  return (
    <div className="space-y-2">
      {types.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {types.map((type) => {
            const isActive = activeTypes.has(type);
            return (
              <button
                key={type}
                onClick={() => onToggleType(type)}
                className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>
      )}
      {orchards.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {orchards.map((orchard) => {
            const isActive = activeOrchards.has(orchard);
            return (
              <button
                key={orchard}
                onClick={() => onToggleOrchard(orchard)}
                className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-md border transition-colors ${
                  isActive
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-background border-border text-muted-foreground hover:border-accent/50"
                }`}
              >
                {orchard}
              </button>
            );
          })}
        </div>
      )}
      {hasFilters && (
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <X className="w-3 h-3" />
          Limpar filtros
        </button>
      )}
    </div>
  );
}