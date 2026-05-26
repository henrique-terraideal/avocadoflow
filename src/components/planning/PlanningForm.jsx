import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { motion } from "framer-motion";
import OperationFilter from "../field/OperationFilter";

export default function PlanningForm({ operators, operations, onAdd, onCancel }) {
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [selectedOrchard, setSelectedOrchard] = useState(null);

  const orchards = Array.from({ length: 20 }, (_, i) => `P${i + 1}`);
  const sortedOperations = [...operations].sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99));
  const canAdd = selectedOperator && selectedOperation && selectedOrchard;

  const handleAdd = () => {
    if (!canAdd) return;
    // URL para funcionar tanto pelo app nativo (câmera do celular) quanto pelo scanner interno
    const base = window.location.origin;
    const params = new URLSearchParams({
      op_id: selectedOperator.id,
      op_name: selectedOperator.name,
      act_id: selectedOperation.id,
      act_code: selectedOperation.code,
      act_name: selectedOperation.name,
      orchard: selectedOrchard,
    });
    const qrData = `${base}/?${params.toString()}`;
    onAdd({
      operatorName: selectedOperator.name,
      operatorPhoto: selectedOperator.photo_url || null,
      operationCode: selectedOperation.code,
      operationName: selectedOperation.name,
      orchardNumber: selectedOrchard,
      qrData,
    });
  };

  return (
    <div className="space-y-5">
      {/* Operador */}
      <div>
        <p className="text-sm font-semibold mb-2 text-foreground">Operador</p>
        <div className="grid grid-cols-3 gap-2">
          {operators.map((op) => (
            <button
              key={op.id}
              onClick={() => setSelectedOperator(op)}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all text-center
                ${selectedOperator?.id === op.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-muted/30 hover:border-primary/40"}`}
            >
              {op.photo_url ? (
                <img src={op.photo_url} alt={op.name} className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                  {op.name[0]}
                </div>
              )}
              <span className="text-xs font-medium leading-tight line-clamp-2">{op.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Operação */}
      <div>
        <p className="text-sm font-semibold mb-2 text-foreground">Atividade</p>
        <OperationFilter
          operations={sortedOperations}
          selectedId={selectedOperation?.code}
          onSelect={(op) => {
            const found = operations.find(o => o.code === op.id);
            setSelectedOperation(found || null);
          }}
        />
      </div>

      {/* Pomar */}
      <div>
        <p className="text-sm font-semibold mb-2 text-foreground">Pomar</p>
        <div className="grid grid-cols-5 gap-1.5">
          {orchards.map((o) => (
            <button
              key={o}
              onClick={() => setSelectedOrchard(o)}
              className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all
                ${selectedOrchard === o
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-muted/30 hover:border-primary/40"}`}
            >
              {o}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button variant="outline" size="lg" onClick={onCancel} className="flex-1 rounded-xl h-12 gap-1">
          <X className="w-4 h-4" />
          Cancelar
        </Button>
        <Button
          size="lg"
          disabled={!canAdd}
          onClick={handleAdd}
          className="flex-1 rounded-xl h-12 gap-1"
        >
          <Check className="w-4 h-4" />
          Adicionar
        </Button>
      </div>
    </div>
  );
}