import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export default function OrchardSelector({ selected, onSelect }) {
  const { data: orchards = [], isLoading } = useQuery({
    queryKey: ["orchards"],
    queryFn: () => base44.entities.Orchard.filter({ active: true }, "sort_order", 200),
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  if (orchards.length === 0) {
    return <p className="text-center text-muted-foreground py-8 text-sm">Nenhum pomar cadastrado. Configure no painel Admin.</p>;
  }

  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
      {orchards.map((orchard, i) => (
        <motion.button
          key={orchard.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.02 }}
          onClick={() => onSelect(orchard.code)}
          className={`relative aspect-square flex flex-col items-center justify-center rounded-2xl border-2 text-lg font-bold transition-all duration-200
            ${selected === orchard.code
              ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-[1.05]"
              : "border-border bg-card text-foreground hover:border-primary/40 hover:shadow-md"
            }`}
        >
          {orchard.code}
        </motion.button>
      ))}
    </div>
  );
}