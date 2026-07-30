import React from "react";
import { X, Droplets, SprayCan, Bug, Leaf, Calendar } from "lucide-react";
import DateInput from "@/components/ui/DateInput";

function getTypeIcon(type) {
  const t = (type || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (t.includes("pulver") && (t.includes("fito") || t.includes("sanit"))) return Bug;
  if (t.includes("pulver")) return SprayCan;
  if (t.includes("fert") || t.includes("adub")) return Droplets;
  if (t.includes("fito") || t.includes("sanit") || t.includes("praga")) return Bug;
  return Leaf;
}

export default function RAFilterBar({
  types,
  orchards,
  activeTypes,
  activeOrchards,
  filterDate,
  onDateChange,
  onToggleType,
  onToggleOrchard,
  onClear,
}) {
  const hasFilters = activeTypes.size > 0 || activeOrchards.size > 0 || filterDate;
  if (types.length === 0 && orchards.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Date filter */}
      <div className="relative">
        <Calendar className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 z-10 pointer-events-none" />
        <DateInput
          value={filterDate || ""}
          onChange={onDateChange}
          placeholder="Filtrar por data"
          className="w-full h-10 rounded-xl border border-input bg-background pl-9 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {filterDate && (
          <button
            onClick={() => onDateChange("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-10"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Type chips with icons */}
      {types.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {types.map((type) => {
            const isActive = activeTypes.has(type);
            const Icon = getTypeIcon(type);
            return (
              <button
                key={type}
                onClick={() => onToggleType(type)}
                className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                <Icon className="w-3 h-3 shrink-0" />
                {type}
              </button>
            );
          })}
        </div>
      )}

      {/* Orchard chips */}
      {orchards.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {orchards.map((orchard) => {
            const isActive = activeOrchards.has(orchard);
            return (
              <button
                key={orchard}
                onClick={() => onToggleOrchard(orchard)}
                className={`text-xs font-medium px-2.5 py-1 rounded-md border transition-colors ${
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