import React from "react";
import { User } from "lucide-react";
import { motion } from "framer-motion";

export default function OperatorSelector({ operators, selectedId, onSelect }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {operators.map((op, i) => (
        <motion.button
          key={op.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onSelect(op)}
          className={`relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-200
            ${selectedId === op.id
              ? "border-primary bg-primary/10 shadow-lg shadow-primary/20 scale-[1.02]"
              : "border-border bg-card hover:border-primary/40 hover:shadow-md"
            }`}
        >
          {op.photo_url ? (
            <img
              src={op.photo_url}
              alt={op.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <User className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
          <span className="text-sm font-semibold text-center leading-tight">{op.name}</span>
          {selectedId === op.id && (
            <motion.div
              layoutId="operator-check"
              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center"
            >
              <span className="text-white text-xs font-bold">✓</span>
            </motion.div>
          )}
        </motion.button>
      ))}
    </div>
  );
}