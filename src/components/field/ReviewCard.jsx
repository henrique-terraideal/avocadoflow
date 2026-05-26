import React from "react";
import { User, Wrench, TreePine, Clock } from "lucide-react";
import { motion } from "framer-motion";

export default function ReviewCard({ data }) {
  const items = [
    { icon: User, label: "Operador", value: data.operator_name },
    { icon: Wrench, label: "Operação", value: data.operation },
    { icon: TreePine, label: "Pomar", value: data.orchard_number },
    { icon: Clock, label: "Horário", value: `${data.start_time} → ${data.end_time}` },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card rounded-2xl border-2 border-primary/20 p-5 space-y-4"
    >
      <h3 className="text-lg font-bold text-center text-foreground">Resumo do Registro</h3>
      <div className="space-y-3">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
                <p className="text-sm font-semibold">{item.value}</p>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}