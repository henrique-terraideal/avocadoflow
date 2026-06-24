import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import OperationFilter from "../field/OperationFilter";
import CustomFieldsInput from "./CustomFieldsInput";
import { useOperationTemplate } from "@/hooks/useOperationTemplate";

export default function PlanningForm({ operators, operations, onAdd, onCancel }) {
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [selectedOperation, setSelectedOperation] = useState(null);
  const [selectedOrchard, setSelectedOrchard] = useState(null);
  const [customValues, setCustomValues] = useState({});

  const { template, customFields } = useOperationTemplate(selectedOperation?.id);

  const { data: orchardList = [] } = useQuery({
    queryKey: ["orchards"],
    queryFn: () => base44.entities.Orchard.filter({ active: true }, "sort_order", 200),
  });
  const orchards = orchardList.map((o) => o.code);
  const sortedOperations = [...operations].sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99));

  // Determina se precisa mostrar seleção de pomar
  const skipOrchard = template?.skip_orchard || false;
  const effectiveOrchard = skipOrchard ? (template?.default_orchard || "N/A") : selectedOrchard;

  // Verifica se campos obrigatórios foram preenchidos
  const requiredFieldsFilled = customFields
    .filter((f) => f.is_required)
    .every((f) => customValues[f.field_label]?.trim());

  const canAdd = selectedOperator && selectedOperation && effectiveOrchard && requiredFieldsFilled;

  const handleOperationChange = (op) => {
    setSelectedOperation(op || null);
    setCustomValues({});
    if (!skipOrchard) setSelectedOrchard(null);
  };

  const handleAdd = () => {
    if (!canAdd) return;
    const base = window.location.origin;
    const params = new URLSearchParams({
      op_id: selectedOperator.id,
      op_name: selectedOperator.name,
      act_id: selectedOperation.id,
      act_code: selectedOperation.code,
      act_name: selectedOperation.name,
      orchard: effectiveOrchard,
    });
    const qrData = `${base}/?${params.toString()}`;
    onAdd({
      operatorName: selectedOperator.name,
      operatorPhoto: selectedOperator.photo_url || null,
      operationCode: selectedOperation.code,
      operationName: selectedOperation.name,
      orchardNumber: effectiveOrchard,
      qrData,
      additionalDetails: Object.keys(customValues).length > 0 ? JSON.stringify(customValues) : null,
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
            handleOperationChange(found || null);
          }}
        />
      </div>

      {/* Campos customizados do template */}
      {customFields.length > 0 && (
        <CustomFieldsInput
          fields={customFields}
          values={customValues}
          onChange={setCustomValues}
        />
      )}

      {/* Pomar — só mostra se não for pulado */}
      {!skipOrchard ? (
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
      ) : template?.default_orchard ? (
        <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-4 py-3">
          <span className="text-sm text-muted-foreground">Pomar fixo:</span>
          <span className="text-sm font-bold text-foreground">{template.default_orchard}</span>
        </div>
      ) : null}

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