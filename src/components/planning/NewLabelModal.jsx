import React from "react";
import { X } from "lucide-react";
import PlanningForm from "./PlanningForm";

export default function NewLabelModal({ operators, operations, onAdd, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full sm:max-w-lg bg-card rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
          <h2 className="text-base font-bold">Nova Etiqueta</h2>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <div className="px-5 py-4">
          <PlanningForm
            operators={operators}
            operations={operations}
            onAdd={(label) => { onAdd(label); onClose(); }}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}