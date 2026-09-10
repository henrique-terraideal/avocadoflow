import React, { useState } from "react";
import { format } from "date-fns";
import { X, Check, Loader2, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import CustomFieldsInput from "../planning/CustomFieldsInput";

/**
 * Modal de conclusão: coleta campos personalizados (se houver) e resolve
 * conflito de data (se a atividade foi planejada para outra data).
 */
export default function CompleteActivityModal({ label, customFields, onClose, onConfirm }) {
  const today = new Date().toISOString().split("T")[0];
  const dateConflict = !!label.date && label.date !== today;

  const [customValues, setCustomValues] = useState(() => {
    try {
      return label.additional_details ? JSON.parse(label.additional_details) : {};
    } catch {
      return {};
    }
  });
  const [dateChoice, setDateChoice] = useState(dateConflict ? null : "today");
  const [submitting, setSubmitting] = useState(false);

  const requiredFields = customFields.filter((f) => f.is_required);
  const requiredFilled = requiredFields.every((f) =>
    customValues[f.field_label]?.toString().trim()
  );
  const canConfirm = requiredFilled && dateChoice !== null;

  // RA data (se existir) para repassar ao CustomFieldsInput (ra_selector read-only)
  let selectedRaData = null;
  try {
    const d = JSON.parse(label.additional_details || "{}");
    if (d.ra_id) selectedRaData = d;
  } catch {}

  const handleConfirm = async () => {
    if (!canConfirm || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(customValues, dateChoice);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end justify-center" onClick={onClose}>
      <div
        className="bg-card w-full max-w-lg rounded-t-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Concluir Atividade</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {dateConflict && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 space-y-2">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-sm font-semibold text-amber-700">
                Atividade planejada para outra data — registrar quando?
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDateChoice("today")}
                className={`p-3 rounded-xl border-2 text-left transition-colors
                  ${dateChoice === "today" ? "border-primary bg-primary/10" : "border-border bg-white"}`}
              >
                <p className="text-xs font-bold">Hoje</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(today + "T12:00:00"), "dd/MM/yyyy")}
                </p>
              </button>
              <button
                onClick={() => setDateChoice("original")}
                className={`p-3 rounded-xl border-2 text-left transition-colors
                  ${dateChoice === "original" ? "border-primary bg-primary/10" : "border-border bg-white"}`}
              >
                <p className="text-xs font-bold">Data original</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date((label.original_date || label.date) + "T12:00:00"), "dd/MM/yyyy")}
                </p>
              </button>
            </div>
          </div>
        )}

        {customFields.length > 0 && (
          <CustomFieldsInput
            fields={customFields}
            values={customValues}
            onChange={setCustomValues}
            readOnlyRA={true}
            selectedRaData={selectedRaData}
          />
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="lg" onClick={onClose} className="flex-1 rounded-xl h-12">
            Cancelar
          </Button>
          <Button
            size="lg"
            disabled={!canConfirm || submitting}
            onClick={handleConfirm}
            className="flex-1 rounded-xl h-12 gap-1.5 bg-green-700 hover:bg-green-700/90"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <>
                <Check className="w-4 h-4" /> Concluir
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}