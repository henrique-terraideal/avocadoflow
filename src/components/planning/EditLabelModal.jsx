import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import OperationFilter from "../field/OperationFilter";
import CustomFieldsInput from "./CustomFieldsInput";
import { useOperationTemplate } from "@/hooks/useOperationTemplate";
import DateInput from "@/components/ui/DateInput";

export default function EditLabelModal({ label, operators, operations, onSave, onClose }) {
  const [selectedOperator, setSelectedOperator] = useState(
    operators.find((o) => o.name === label.operator_name) || null
  );
  const [selectedOperation, setSelectedOperation] = useState(() => {
    // Try to find operation: by code first (labels from RA), then by name
    return (
      (label.operation_code && operations.find((o) => String(o.code) === String(label.operation_code))) ||
      operations.find((o) => o.name === label.operation_name) ||
      null
    );
  });
  const [selectedOrchard, setSelectedOrchard] = useState(label.orchard_number || null);
  const [selectedDate, setSelectedDate] = useState(label.date || "");
  const [customValues, setCustomValues] = useState(() => {
    try { return label.additional_details ? JSON.parse(label.additional_details) : {}; }
    catch { return {}; }
  });

  // Detect RA data from flat additional_details (labels created from RAs)
  const selectedRA = useMemo(() => {
    if (customValues.ra_id) {
      return {
        ra_id: customValues.ra_id,
        code: customValues.ra_code || "",
        type: customValues.type || "",
        orchard: customValues.orchard_code || label.orchard_number || "",
        climate_conditions: customValues.climate_conditions || "",
        machine_config: customValues.machine_config || "",
        machine_name: customValues.machine_name || "",
        implement_config: customValues.implement_config || "",
        implement_name: customValues.implement_name || "",
        tank_capacity_liters: customValues.tank_capacity_liters || null,
        liters_per_ha: customValues.liters_per_ha || null,
        products: customValues.products || [],
      };
    }
    for (const val of Object.values(customValues)) {
      try {
        const parsed = JSON.parse(val);
        if (parsed && parsed.ra_id) return parsed;
      } catch {}
    }
    return null;
  }, [customValues, label.orchard_number]);

  const { template, customFields } = useOperationTemplate(selectedOperation?.id);

  const { data: orchardList = [] } = useQuery({
    queryKey: ["orchards"],
    queryFn: () => base44.entities.Orchard.filter({ active: true }, "sort_order", 200),
  });
  const orchards = orchardList.map((o) => o.code);
  const sortedOperations = [...operations].sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99));

  const skipOrchard = template?.skip_orchard || false;
  const effectiveOrchard = skipOrchard ? (template?.default_orchard || "N/A") : selectedOrchard;

  // Filtra campos que devem aparecer no planejamento
  const planningFields = customFields.filter(
    (f) => !f.input_stage || f.input_stage === "planning" || f.input_stage === "both"
  );

  const requiredFieldsFilled = planningFields
    .filter((f) => f.is_required)
    .every((f) => customValues[f.field_label]?.trim());

  const canSave = selectedOperator && selectedOperation && effectiveOrchard && selectedDate && requiredFieldsFilled;

  const handleSave = () => {
    if (!canSave) return;
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
    onSave({
      operator_name: selectedOperator.name,
      operator_photo: selectedOperator.photo_url || "",
      operation_code: selectedOperation.code,
      operation_name: selectedOperation.name,
      orchard_number: effectiveOrchard,
      qr_data: qrData,
      date: selectedDate,
      additional_details: Object.keys(customValues).length > 0 ? JSON.stringify(customValues) : null,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-0" onClick={onClose}>
      <div
        className="bg-card w-full max-w-lg rounded-t-3xl p-5 space-y-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Editar Etiqueta</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Data */}
        <div>
          <p className="text-sm font-semibold mb-2">Data</p>
          <DateInput
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Operador */}
        <div>
          <p className="text-sm font-semibold mb-2">Operador</p>
          <div className="grid grid-cols-3 gap-2">
            {operators.map((op) => (
              <button
                key={op.id}
                onClick={() => setSelectedOperator(op)}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all text-center
                  ${selectedOperator?.id === op.id ? "border-primary bg-primary/10" : "border-border bg-muted/30"}`}
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
          <p className="text-sm font-semibold mb-2">Atividade</p>
          <OperationFilter
            operations={sortedOperations}
            selectedId={selectedOperation?.code}
            onSelect={(op) => {
              const found = operations.find((o) => o.code === op.id);
              setSelectedOperation(found || null);
              setCustomValues({});
            }}
          />
        </div>

        {/* Campos customizados */}
        {planningFields.length > 0 && (
          <CustomFieldsInput
            fields={planningFields}
            values={customValues}
            onChange={setCustomValues}
            selectedRaData={selectedRA}
          />
        )}

        {/* Pomar */}
        {!skipOrchard ? (
          <div>
            <p className="text-sm font-semibold mb-2">Pomar</p>
            <div className="grid grid-cols-5 gap-1.5">
              {orchards.map((o) => (
                <button
                  key={o}
                  onClick={() => setSelectedOrchard(o)}
                  className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all
                    ${selectedOrchard === o ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/30"}`}
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

        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="lg" onClick={onClose} className="flex-1 rounded-xl h-12">
            Cancelar
          </Button>
          <Button size="lg" disabled={!canSave} onClick={handleSave} className="flex-1 rounded-xl h-12 gap-1">
            <Check className="w-4 h-4" />
            Salvar
          </Button>
        </div>
      </div>
    </div>
  );
}