import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import CustomFieldsInput from "./CustomFieldsInput";
import PeriodSelector from "../field/PeriodSelector";
import { validateHourMeters, persistMachineHourMeter } from "@/lib/hourMeter";

export default function FillTimesModal({ label, customFields, onSave, onSaveDraft, onClose }) {
  // Parse draft data if it exists (partial save from a previous session)
  const draftData = (() => {
    try { return label.draft_data ? JSON.parse(label.draft_data) : null; }
    catch { return null; }
  })();

  const [periods, setPeriods] = useState(draftData?.periods || []);
  const [observations, setObservations] = useState(draftData?.observations || "");

  // Pre-fill custom values from existing additional_details, then overlay draft values
  const [customValues, setCustomValues] = useState(() => {
    let base = {};
    try { base = label.additional_details ? JSON.parse(label.additional_details) : {}; }
    catch { base = {}; }
    if (draftData?.customValues) {
      return { ...base, ...draftData.customValues };
    }
    return base;
  });

  // Filter fields to show in registration (registration or both)
  const registrationFields = useMemo(
    () => (customFields || []).filter(
      (f) => !f.input_stage || f.input_stage === "registration" || f.input_stage === "both"
    ),
    [customFields]
  );

  // Validate required registration fields
  const requiredRegistrationFilled = registrationFields
    .filter((f) => f.is_required)
    .every((f) => customValues[f.field_label]?.toString().trim());

  const hourMeterError = validateHourMeters(customFields, customValues);
  const canSave = periods.length > 0 && requiredRegistrationFilled && !hourMeterError;

  const handleSave = async () => {
    if (!canSave) return;
    await persistMachineHourMeter(customFields, customValues);
    onSave({ periods, observations, customValues });
  };

  const handleSaveDraft = () => {
    onSaveDraft({ periods, observations, customValues });
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center p-0" onClick={onClose}>
      <div
        className="bg-card w-full max-w-lg rounded-t-3xl p-5 space-y-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Registrar Atividade</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info da etiqueta */}
        <div className="bg-muted/50 rounded-xl p-3 text-sm space-y-1">
          <p className="font-semibold">{label.operator_name}</p>
          <p className="text-primary font-medium">{label.operation_code}. {label.operation_name}</p>
          <p className="text-muted-foreground">🌳 Pomar {label.orchard_number}</p>
        </div>

        {/* Período */}
        <div>
          <p className="text-sm font-semibold mb-1.5">
            Período <span className="text-destructive">*</span>
          </p>
          <PeriodSelector value={periods} onChange={setPeriods} invalid={periods.length === 0} />
        </div>

        {/* Campos de registro em campo */}
        {registrationFields.length > 0 && (
          <CustomFieldsInput
            fields={registrationFields}
            values={customValues}
            onChange={setCustomValues}
          />
        )}

        {/* Observações */}
        <div>
          <p className="text-sm font-semibold mb-1.5">Observações (opcional)</p>
          <textarea
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Digite observações..."
            rows={2}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {hourMeterError && (
          <p className="text-xs font-medium text-destructive">{hourMeterError}</p>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="lg" onClick={onClose} className="flex-1 rounded-xl h-12">
            Cancelar
          </Button>
          <Button variant="secondary" size="lg" onClick={handleSaveDraft} className="flex-1 rounded-xl h-12 gap-1">
            Salvar Rascunho
          </Button>
          <Button size="lg" disabled={!canSave} onClick={handleSave} className="flex-1 rounded-xl h-12 gap-1">
            <Check className="w-4 h-4" />
            Registrar
          </Button>
        </div>
      </div>
    </div>
  );
}