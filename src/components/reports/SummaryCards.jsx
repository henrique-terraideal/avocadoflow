import React from "react";
import { ClipboardList, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

export default function SummaryCards({ total, completed, delayed, totalHours }) {
  const cards = [
    { label: "Total Atividades", value: total, icon: ClipboardList, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Concluídas", value: completed, icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Atrasadas", value: delayed, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-500/10" },
    { label: "Horas Total", value: `${totalHours.toFixed(1)}h`, icon: Clock, color: "text-orange-500", bg: "bg-orange-500/10" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <div key={card.label} className="bg-card rounded-2xl border border-border p-4">
            <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center mb-2`}>
              <Icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
          </div>
        );
      })}
    </div>
  );
}