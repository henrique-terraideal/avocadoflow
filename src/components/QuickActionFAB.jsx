import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, X, Check, ChevronLeft, ChevronRight, Loader2, Lock } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useOperationTemplate } from "@/hooks/useOperationTemplate";
import CustomFieldsInput from "./planning/CustomFieldsInput";
import { format, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from "react-router-dom";

const today = () => new Date().toISOString().split("T")[0];

function QuickActionModal({ operation, operators, orchards, onClose, onSuccess }) {
  const [selectedOperator, setSelectedOperator] = useState(null);
  const [selectedOrchard, setSelectedOrchard] = useState(null);
  const [customValues, setCustomValues] = useState({});
  const [selectedDate, setSelectedDate] = useState(today());
  const [saving, setSaving] = useState(false);

  const { template, customFields } = useOperationTemplate(operation?.id);

  const skipOrchard = template?.skip_orchard || false;

  // Detect RA from customValues — orchard from RA prevails
  const selectedRA = useMemo(() => {
    for (const val of Object.values(customValues)) {
      try {
        const parsed = JSON.parse(val);
        if (parsed && parsed.ra_id) return parsed;
      } catch {}
    }
    return null;
  }, [customValues]);

  const effectiveOrchard = selectedRA?.orchard || (skipOrchard ? (template?.default_orchard || "N/A") : selectedOrchard);

  // Filter fields to show in planning stage
  const planningFields = customFields.filter(
    (f) => !f.input_stage || f.input_stage === "planning" || f.input_stage === "both"
  );

  const requiredFieldsFilled = planningFields
    .filter((f) => f.is_required)
    .every((f) => customValues[f.field_label]?.trim?.());

  const canSave = selectedOperator && effectiveOrchard && requiredFieldsFilled;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    const base = window.location.origin;
    const params = new URLSearchParams({
      op_id: selectedOperator.id,
      op_name: selectedOperator.name,
      act_id: operation.id,
      act_code: operation.code,
      act_name: operation.name,
      orchard: effectiveOrchard,
    });
    const qrData = `${base}/?${params.toString()}`;
    await base44.entities.PlanningLabel.create({
      date: selectedDate,
      operator_name: selectedOperator.name,
      operator_photo: selectedOperator.photo_url || "",
      operation_code: operation.code,
      operation_name: operation.name,
      orchard_number: effectiveOrchard,
      qr_data: qrData,
      additional_details: Object.keys(customValues).length > 0 ? JSON.stringify(customValues) : null,
    });
    setSaving(false);
    onSuccess();
    onClose();
  };

  const formattedDate = format(new Date(selectedDate + "T12:00:00"), "EEE, d 'de' MMM", { locale: ptBR });
  const isToday = selectedDate === today();

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card rounded-t-3xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Ação Rápida</p>
              <p className="text-xs text-orange-500 font-semibold">{operation.code}. {operation.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Data */}
          <div>
            <p className="text-sm font-semibold mb-2 text-foreground">Data de Execução</p>
            <div className="flex items-center justify-between bg-muted/40 rounded-2xl px-3 py-2">
              <button
                onClick={() => setSelectedDate(subDays(new Date(selectedDate + "T12:00:00"), 1).toISOString().split("T")[0])}
                className="p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-center">
                <p className="text-sm font-semibold capitalize">{formattedDate}</p>
                {isToday && <p className="text-xs text-primary font-medium">Hoje</p>}
              </div>
              <button
                onClick={() => setSelectedDate(addDays(new Date(selectedDate + "T12:00:00"), 1).toISOString().split("T")[0])}
                className="p-1 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

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

          {/* Campos customizados */}
          {planningFields.length > 0 && (
            <CustomFieldsInput
              fields={planningFields}
              values={customValues}
              onChange={setCustomValues}
              onRASelected={(ra) => {
                if (ra?.orchard_code) setSelectedOrchard(ra.orchard_code);
              }}
            />
          )}

          {/* Pomar */}
          {!skipOrchard ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold text-foreground">Pomar</p>
                {selectedRA?.orchard && (
                  <span className="flex items-center gap-1 text-xs text-primary font-medium">
                    <Lock className="w-3 h-3" /> Definido pela RA
                  </span>
                )}
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {orchards.map((o) => (
                  <button
                    key={o}
                    onClick={() => !selectedRA && setSelectedOrchard(o)}
                    disabled={!!selectedRA}
                    className={`py-2.5 rounded-xl text-sm font-bold border-2 transition-all
                      ${effectiveOrchard === o
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted/30 hover:border-primary/40"}
                      ${selectedRA ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          ) : template?.default_orchard ? (
            <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-4 py-3">
              <span className="text-sm text-muted-foreground">Pomar fixo:</span>
              <span className="text-sm font-bold">{template.default_orchard}</span>
            </div>
          ) : null}

          {/* Actions */}
          <div className="flex gap-2 pt-1 pb-2">
            <Button variant="outline" size="lg" onClick={onClose} className="flex-1 rounded-xl h-12">
              <X className="w-4 h-4" />
              Cancelar
            </Button>
            <Button
              size="lg"
              disabled={!canSave || saving}
              onClick={handleSave}
              className="flex-1 rounded-xl h-12 bg-orange-500 hover:bg-orange-600 text-white"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Registrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QuickActionFAB() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const location = useLocation();

  const { data: config = [] } = useQuery({
    queryKey: ["app-config-quick-action"],
    queryFn: () => base44.entities.AppConfig.filter({ key: "quick_action_operation_id" }),
  });

  const quickOpId = config[0]?.value;

  const { data: operations = [] } = useQuery({
    queryKey: ["operations"],
    queryFn: () => base44.entities.Operation.filter({ active: true }),
    enabled: !!quickOpId,
  });

  const { data: operators = [] } = useQuery({
    queryKey: ["operators"],
    queryFn: () => base44.entities.Operator.filter({ active: true }),
    enabled: open,
  });

  const { data: orchardList = [] } = useQuery({
    queryKey: ["orchards"],
    queryFn: () => base44.entities.Orchard.filter({ active: true }, "sort_order", 200),
    enabled: open,
  });

  const orchards = orchardList.map((o) => o.code);
  const operation = operations.find((o) => o.id === quickOpId);

  if (!quickOpId || !operation) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 left-4 z-50 bg-orange-500 text-white rounded-full shadow-lg w-14 h-14 flex items-center justify-center hover:bg-orange-600 transition-colors"
        title="Ação Rápida"
      >
        <AlertTriangle className="w-6 h-6" />
      </button>

      {open && operation && (
        <QuickActionModal
          key={location.pathname}
          operation={operation}
          operators={operators}
          orchards={orchards}
          onClose={() => setOpen(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["planning-labels"] })}
        />
      )}
    </>
  );
}