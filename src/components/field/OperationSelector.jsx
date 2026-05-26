import React from "react";
import { motion } from "framer-motion";
import {
  Scissors, Droplets, Bug, Sprout, TreePine, Wrench,
  Apple, GraduationCap, Axe, CloudSun, Truck,
  Search, FlaskConical, Trash2, ClipboardList, Zap,
  Shovel, Leaf, Waves
} from "lucide-react";

const OPERATIONS = [
  { id: "01", name: "Roçada", icon: Scissors, color: "bg-green-500" },
  { id: "02", name: "Adubação", icon: Sprout, color: "bg-amber-500" },
  { id: "03", name: "Herbicida", icon: Droplets, color: "bg-yellow-600" },
  { id: "04", name: "Controle de Pragas", icon: Bug, color: "bg-red-500" },
  { id: "05", name: "Plantio e Replantio", icon: Leaf, color: "bg-emerald-500" },
  { id: "06", name: "Aplicação de Ferti", icon: FlaskConical, color: "bg-purple-500" },
  { id: "07", name: "Poda, Desbrota e Condução", icon: TreePine, color: "bg-green-700" },
  { id: "08", name: "Manutenção e Limpeza de Máquinas", icon: Wrench, color: "bg-slate-500" },
  { id: "09", name: "Manutenção Centro de Serviço", icon: Wrench, color: "bg-slate-600" },
  { id: "10", name: "Drench", icon: Waves, color: "bg-blue-500" },
  { id: "11", name: "Inspeção Manutenção de Irrigação", icon: Droplets, color: "bg-blue-600" },
  { id: "12", name: "Motosserra", icon: Axe, color: "bg-orange-600" },
  { id: "13", name: "Capacitação e Treinamento", icon: GraduationCap, color: "bg-indigo-500" },
  { id: "14", name: "Colheita", icon: Apple, color: "bg-red-600" },
  { id: "15", name: "Fator Climático", icon: CloudSun, color: "bg-sky-500" },
  { id: "16", name: "Limpeza de Pomar", icon: Trash2, color: "bg-teal-500" },
  { id: "17", name: "Coleta de Amostras e Dados", icon: ClipboardList, color: "bg-violet-500" },
  { id: "18", name: "Lavagem e Lubrificação", icon: Zap, color: "bg-cyan-600" },
  { id: "19", name: "Inspeção de Pragas e Doenças", icon: Search, color: "bg-rose-500" },
];

export { OPERATIONS };

export default function OperationSelector({ selectedId, onSelect }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {OPERATIONS.map((op, i) => {
        const Icon = op.icon;
        const isSelected = selectedId === op.id;
        return (
          <motion.button
            key={op.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            onClick={() => onSelect(op)}
            className={`relative flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all duration-200
              ${isSelected
                ? "border-primary bg-primary/10 shadow-lg shadow-primary/20 scale-[1.02]"
                : "border-border bg-card hover:border-primary/40 hover:shadow-md"
              }`}
          >
            <div className={`w-12 h-12 rounded-xl ${op.color} flex items-center justify-center shadow-sm`}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs font-semibold text-center leading-tight">{op.id}. {op.name}</span>
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