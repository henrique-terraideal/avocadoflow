import React, { useState } from "react";
import { Calendar, X, ChevronDown, Users, TreePine } from "lucide-react";

export default function DashboardFilterBar({
  startDate, setStartDate,
  endDate, setEndDate,
  operators, selectedOperators, toggleOperator,
  orchards, selectedOrchards, toggleOrchard,
  status, setStatus,
  onClear,
}) {
  const [showOperators, setShowOperators] = useState(false);
  const [showOrchards, setShowOrchards] = useState(false);

  const hasActiveFilters = startDate || endDate || selectedOperators.length > 0 || selectedOrchards.length > 0 || status !== "all";

  const statusOptions = [
    { value: "all", label: "Todos" },
    { value: "completed", label: "Concluídas" },
    { value: "delayed", label: "Atrasadas" },
    { value: "pending", label: "Pendentes" },
  ];

  return (
    <div className="space-y-2.5 pt-1 pb-3">
      {/* Período */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full h-10 rounded-xl border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <span className="text-muted-foreground text-sm">→</span>
        <div className="relative flex-1">
          <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full h-10 rounded-xl border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Colaborador */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <button
          onClick={() => setShowOperators(!showOperators)}
          className="w-full flex items-center justify-between px-3 py-2.5"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <Users className="w-4 h-4 text-muted-foreground" />
            Colaborador
            {selectedOperators.length > 0 && (
              <span className="bg-primary/15 text-primary text-xs font-bold px-1.5 py-0.5 rounded-full">
                {selectedOperators.length}
              </span>
            )}
          </span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showOperators ? "rotate-180" : ""}`} />
        </button>
        {showOperators && (
          <div className="flex flex-wrap gap-1.5 px-3 pb-3 pt-1 border-t border-border">
            {operators.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1">Nenhum colaborador</p>
            ) : operators.map((op) => {
              const selected = selectedOperators.includes(op);
              return (
                <button
                  key={op}
                  onClick={() => toggleOperator(op)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border-2 transition-all
                    ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/30 text-foreground hover:border-primary/40"}`}
                >
                  {op}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pomar */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <button
          onClick={() => setShowOrchards(!showOrchards)}
          className="w-full flex items-center justify-between px-3 py-2.5"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <TreePine className="w-4 h-4 text-muted-foreground" />
            Pomar
            {selectedOrchards.length > 0 && (
              <span className="bg-primary/15 text-primary text-xs font-bold px-1.5 py-0.5 rounded-full">
                {selectedOrchards.length}
              </span>
            )}
          </span>
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${showOrchards ? "rotate-180" : ""}`} />
        </button>
        {showOrchards && (
          <div className="flex flex-wrap gap-1.5 px-3 pb-3 pt-1 border-t border-border">
            {orchards.length === 0 ? (
              <p className="text-xs text-muted-foreground py-1">Nenhum pomar</p>
            ) : orchards.map((o) => {
              const selected = selectedOrchards.includes(o);
              return (
                <button
                  key={o}
                  onClick={() => toggleOrchard(o)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border-2 transition-all
                    ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/30 text-foreground hover:border-primary/40"}`}
                >
                  {o}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center gap-1.5">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatus(opt.value)}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold border-2 transition-all
              ${status === opt.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:border-primary/40"}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Limpar */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <button onClick={onClear} className="text-xs text-destructive hover:underline font-medium flex items-center gap-1">
            <X className="w-3 h-3" />
            Limpar filtros
          </button>
        </div>
      )}
    </div>
  );
}