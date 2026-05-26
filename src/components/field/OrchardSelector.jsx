import React from "react";
import { motion } from "framer-motion";

const ORCHARDS = Array.from({ length: 20 }, (_, i) => `P${i + 1}`);

export default function OrchardSelector({ selected, onSelect }) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
      {ORCHARDS.map((orchard, i) => (
        <motion.button
          key={orchard}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.02 }}
          onClick={() => onSelect(orchard)}
          className={`relative aspect-square flex items-center justify-center rounded-2xl border-2 text-lg font-bold transition-all duration-200
            ${selected === orchard
              ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-[1.05]"
              : "border-border bg-card text-foreground hover:border-primary/40 hover:shadow-md"
            }`}
        >
          {orchard}
        </motion.button>
      ))}
    </div>
  );
}