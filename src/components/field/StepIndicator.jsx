import React from "react";
import { motion } from "framer-motion";

const STEPS = [
  { label: "Operador" },
  { label: "Operação" },
  { label: "Pomar" },
  { label: "Horário" },
];

export default function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {STEPS.map((step, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <motion.div
              animate={{
                backgroundColor: i <= currentStep ? "hsl(var(--primary))" : "hsl(var(--muted))",
                scale: i === currentStep ? 1.2 : 1,
              }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            >
              <span className={i <= currentStep ? "text-primary-foreground" : "text-muted-foreground"}>
                {i < currentStep ? "✓" : i + 1}
              </span>
            </motion.div>
            <span className={`text-[10px] mt-1 font-medium ${i <= currentStep ? "text-primary" : "text-muted-foreground"}`}>
              {step.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`w-8 h-0.5 mb-4 rounded-full transition-colors ${i < currentStep ? "bg-primary" : "bg-muted"}`} />
          )}
        </div>
      ))}
    </div>
  );
}