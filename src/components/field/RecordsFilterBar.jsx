import React from "react";
import { Search, X, Leaf, Calendar } from "lucide-react";
import DateInput from "@/components/ui/DateInput";

const normalize = (str) => {
  if (!str) return "";
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export default function RecordsFilterBar({ search, setSearch, selectedDate, setSelectedDate, showOnlyRA, setShowOnlyRA, resultCount, totalCount }) {
  const hasActiveFilters = search || selectedDate || showOnlyRA;

  const clearAll = () => {
    setSearch("");
    setSelectedDate("");
    setShowOnlyRA(false);
  };

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm space-y-2.5 pt-1 pb-3">
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por operador, operação..."
          className="w-full h-10 rounded-xl border border-input bg-background pl-9 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filtros: Data */}
      <div className="relative">
        <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground pointer-events-none" />
        <DateInput
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="w-full h-9 rounded-xl border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="dd/mm/aaaa"
        />
        {selectedDate && (
          <button onClick={() => setSelectedDate("")} className="absolute right-2 top-2 text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filtro: Com RA */}
      <button
        onClick={() => setShowOnlyRA(!showOnlyRA)}
        className={`w-full h-9 px-3 rounded-xl border-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all
          ${showOnlyRA ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}
      >
        <Leaf className="w-3.5 h-3.5" />
        Com RA
      </button>

      {/* Contador + limpar */}
      <div className="flex items-center justify-between px-1">
        <p className="text-xs text-muted-foreground">
          {resultCount === totalCount ? `${totalCount} registro(s)` : `${resultCount} de ${totalCount} registro(s)`}
        </p>
        {hasActiveFilters && (
          <button onClick={clearAll} className="text-xs text-destructive hover:underline font-medium">
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
}