import React from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2 } from "lucide-react";

export default function OperationSelector({ selectedId, onSelect }) {
  const { data: operations = [], isLoading } = useQuery({
    queryKey: ["operations"],
    queryFn: () => base44.entities.Operation.list("sort_order"),
    select: (data) => data.filter((op) => op.active),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {operations.map((op, i) => {
        const isSelected = selectedId === op.code;
        return (
          <motion.button
            key={op.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => onSelect({ id: op.code, name: op.name, color: op.color })}
            className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all duration-200
              ${isSelected
                ? "border-primary bg-primary/10 shadow-lg shadow-primary/20 scale-[1.02]"
                : "border-border bg-card hover:border-primary/40 hover:shadow-md"
              }`}
          >
            <div className={`w-12 h-12 rounded-xl ${op.color || "bg-primary"} flex items-center justify-center shadow-sm`}>
              <span className="text-white text-sm font-bold">{op.code}</span>
            </div>
            <span className="text-xs font-semibold text-center leading-tight">{op.code}. {op.name}</span>
            {isSelected && (
              <motion.div
                layoutId="operation-check"
                className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
              >
                <span className="text-white text-[10px] font-bold">✓</span>
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}