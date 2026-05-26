import React, { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { motion } from "framer-motion";

const CATEGORIES = ["Todos", "Irrigação", "Poda", "Colheita", "Adubação", "Fitossanidade", "Mecanização", "Outros"];

export default function OperationFilter({ operations, selectedId, onSelect }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");

  const filtered = useMemo(() => {
    return operations.filter((op) => {
      const matchesCategory = activeCategory === "Todos" || op.category === activeCategory;
      const matchesSearch = !search || 
        op.name.toLowerCase().includes(search.toLowerCase()) || 
        op.code.includes(search);
      return matchesCategory && matchesSearch;
    });
  }, [operations, search, activeCategory]);

  return (
    <div className="space-y-3">
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar operação..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 rounded-xl"
        />
      </div>

      {/* Filtro por categoria */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
              ${activeCategory === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40"}`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid de operações */}
      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground text-sm py-6">Nenhuma operação encontrada</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filtered.map((op, i) => {
            const isSelected = selectedId === op.code;
            return (
              <motion.button
                key={op.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => onSelect({ id: op.code, name: op.name, color: op.color })}
                className={`relative flex items-center gap-2.5 p-3 rounded-xl border-2 transition-all text-left
                  ${isSelected
                    ? "border-primary bg-primary/10 shadow-md shadow-primary/20"
                    : "border-border bg-card hover:border-primary/40"}`}
              >
                <span className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-bold ${op.color || "bg-primary"}`}>
                  {op.code}
                </span>
                <span className="text-xs font-semibold leading-tight">{op.name}</span>
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-white text-[9px] font-bold">✓</span>
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>
      )}
    </div>
  );
}