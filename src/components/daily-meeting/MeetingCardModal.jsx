import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Check, X, Clock, AlertCircle } from "lucide-react";
import CustomFieldsInput from "@/components/planning/CustomFieldsInput";
import { useOperationTemplate } from "@/hooks/useOperationTemplate";

function nowTime() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function MeetingCardModal({ label, operators, operations, onClose, onSaved }) {
  const queryClient = useQueryClient();

  const [selectedOperator, setSelectedOperator] = useState(
    operators.find((o) => o.name === label.operator_name) || null
  );
  const [selectedOperation, setSelectedOperation] = useState(
    (label.operation_code && operations.find((o) => String(o.code) === String(label.operation_code))) ||
      operations.find((o) => o.name === label.operation_name) || null
  );
  const [selectedOrchard, setSelectedOrchard] = useState(label.orchard_number || "");
  const [selectedDate, setSelectedDate] = useState(label.date || "");
  const [concluded, setConcluded] = useState(!!label.concluded);

  const [customValues, setCustomValues] = useState(() => {
    try { return label.additional_details ? JSON.parse(label.additional_details) : {}; }
    catch { return {}; }
  });

  const draftData = (() => { try { return label.draft_data ? JSON.parse(label.draft_data) : null; } catch { return null; } })();
  const [startTime, setStartTime] = useState(draftData?.startTime || "");
  const [endTime, setEndTime] = useState(draftData?.endTime || "");
  const [observations, setObservations] = useState(draftData?.observations || "");
  const [regValues, setRegValues] = useState(() => {
    let base = {};
    try { base = label.additional_details ? JSON.parse(label.additional_details) : {}; } catch {}
    return draftData?.customValues ? { ...base, ...draftData.customValues } : base;
  });

  const { template, customFields } = useOperationTemplate(selectedOperation?.id);

  const planningFields = useMemo(
    () => customFields.filter((f) => !f.input_stage || f.input_stage === "planning" || f.input_stage === "both"),
    [customFields]
  );
  const registrationFields = useMemo(
    () => customFields.filter((f) => !f.input_stage || f.input_stage === "registration" || f.input_stage === "both"),
    [customFields]
  );

  const { data: orchardList = [] } = useQuery({
    queryKey: ["orchards"],
    queryFn: () => base44.entities.Orchard.filter({ active: true }, "sort_order", 200),
  });
  const orchards = orchardList.map((o) => o.code);
  const sortedOperations = [...operations].sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99));

  const skipOrchard = template?.skip_orchard || false;
  const effectiveOrchard = skipOrchard ? (template?.default_orchard || "N/A") : selectedOrchard;

  const requiredPlanningFilled = planningFields
    .filter((f) => f.is_required)
    .every((f) => customValues[f.field_label]?.toString().trim());
  const requiredRegFilled = registrationFields
    .filter((f) => f.is_required)
    .every((f) => regValues[f.field_label]?.toString().trim());

  const canSaveDetails = selectedOperator && selectedOperation && effectiveOrchard && selectedDate && requiredPlanningFilled;
  const canRegister = startTime && endTime && requiredRegFilled && canSaveDetails;

  const buildQrData = () => {
    const base = window.location.origin;
    const params = new URLSearchParams({
      op_id: selectedOperator.id,
      op_name: selectedOperator.name,
      act_id: selectedOperation.id,
      act_code: selectedOperation.code,
      act_name: selectedOperation.name,
      orchard: effectiveOrchard,
    });
    return `${base}/?${params.toString()}`;
  };

  const handleSaveDetails = () => {
    if (!canSaveDetails) return;
    const merged = { ...customValues, ...regValues };
    onSaved({
      id: label.id,
      data: {
        operator_name: selectedOperator.name,
        operator_photo: selectedOperator.photo_url || "",
        operation_code: selectedOperation.code,
        operation_name: selectedOperation.name,
        orchard_number: effectiveOrchard,
        qr_data: buildQrData(),
        date: selectedDate,
        concluded,
        additional_details: Object.keys(merged).length > 0 ? JSON.stringify(merged) : null,
      },
    });
  };

  const [saving, setSaving] = useState(false);

  const handleRegister = async () => {
    if (!canRegister || saving) return;
    setSaving(true);
    try {
      const merged = { ...customValues, ...regValues };
      merged.label_id = label.id;
      await base44.entities.FieldRecord.create({
        operator_name: selectedOperator.name,
        operator_id: selectedOperator.id,
        operation: `${selectedOperation.code}. ${selectedOperation.name}`,
        orchard_number: effectiveOrchard,
        start_time: startTime,
        end_time: endTime,
        date: selectedDate,
        planned_date: label.original_date || label.date,
        observations,
        qr_scanned: false,
        additional_details: Object.keys(merged).length > 0 ? JSON.stringify(merged) : null,
      });
      if (merged.ra_id) {
        try { await base44.functions.invoke("markRAExecuted", { ra_id: merged.ra_id }); } catch {}
      }
      onSaved({
        id: label.id,
        data: {
          operator_name: selectedOperator.name,
          operator_photo: selectedOperator.photo_url || "",
          operation_code: selectedOperation.code,
          operation_name: selectedOperation.name,
          orchard_number: effectiveOrchard,
          qr_data: buildQrData(),
          date: selectedDate,
          concluded: true,
          additional_details: Object.keys(merged).length > 0 ? JSON.stringify(merged) : null,
          draft_data: null,
        },
      });
    } catch (err) {
      alert(`Erro ao registrar: ${err.message}`);
    }
    setSaving(false);
  };

  const today = new Date().toISOString().split("T")[0];
  const status = concluded ? "executada" : (label.date < today ? "pendente" : "planejada");
  const statusLabel = { executada: "Executada", pendente: "Pendente", planejada: "Planejada" }[status];
  const statusColor = {
    executada: "bg-emerald-100 text-emerald-700",
    pendente: "bg-rose-100 text-rose-700",
    planejada: "bg-sky-100 text-sky-700",
  }[status];

  const inputClass = "w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "text-xs font-medium text-muted-foreground mb-1 block";

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card w-full max-w-2xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold">Detalhes da Atividade</h2>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor}`}>{statusLabel}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Planejamento */}
          <div className="space-y-3">
            <p className="text-sm font-bold text-foreground">Planejamento</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Data</label>
                <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Operador</label>
                <select value={selectedOperator?.id || ""} onChange={(e) => setSelectedOperator(operators.find((o) => o.id === e.target.value) || null)} className={inputClass}>
                  <option value="">Selecione...</option>
                  {operators.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Atividade</label>
                <select value={selectedOperation?.id || ""} onChange={(e) => { setSelectedOperation(operations.find((o) => o.id === e.target.value) || null); setCustomValues({}); }} className={inputClass}>
                  <option value="">Selecione...</option>
                  {sortedOperations.map((o) => <option key={o.id} value={o.id}>{o.code}. {o.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Pomar</label>
                {skipOrchard ? (
                  <div className="h-10 flex items-center px-3 rounded-xl bg-muted/40 text-sm font-medium text-muted-foreground">
                    {template?.default_orchard || "N/A"}
                  </div>
                ) : (
                  <select value={selectedOrchard} onChange={(e) => setSelectedOrchard(e.target.value)} className={inputClass}>
                    <option value="">Selecione...</option>
                    {orchards.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                )}
              </div>
            </div>

            {planningFields.length > 0 && (
              <CustomFieldsInput fields={planningFields} values={customValues} onChange={setCustomValues} />
            )}
          </div>

          {/* Registro em campo */}
          <div className="space-y-3 border-t border-border pt-4">
            <p className="text-sm font-bold text-foreground">Registro em Campo</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Início</label>
                <div className="flex gap-1.5">
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="flex-1 h-10 rounded-xl border border-input bg-background px-3 text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-ring" />
                  <button onClick={() => setStartTime(nowTime())} className="h-10 px-3 rounded-xl border border-input bg-muted hover:bg-muted/80" title="Agora">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>Término</label>
                <div className="flex gap-1.5">
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="flex-1 h-10 rounded-xl border border-input bg-background px-3 text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-ring" />
                  <button onClick={() => setEndTime(nowTime())} className="h-10 px-3 rounded-xl border border-input bg-muted hover:bg-muted/80" title="Agora">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>
            </div>

            {registrationFields.length > 0 && (
              <CustomFieldsInput fields={registrationFields} values={regValues} onChange={setRegValues} />
            )}

            <div>
              <label className={labelClass}>Observações</label>
              <textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={2} placeholder="Digite observações..." className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>

            <button
              onClick={() => setConcluded((c) => !c)}
              className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 transition-colors text-sm font-medium
                ${concluded ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-border bg-muted/30 text-muted-foreground"}`}
            >
              <Check className={`w-4 h-4 ${concluded ? "text-emerald-600" : ""}`} />
              {concluded ? "Marcada como executada" : "Marcar como executada"}
            </button>
          </div>

          <div className="flex gap-2 pt-1 pb-2">
            <Button variant="outline" onClick={onClose} className="flex-1 rounded-xl h-11">Cancelar</Button>
            <Button onClick={handleSaveDetails} disabled={!canSaveDetails} className="flex-1 rounded-xl h-11 gap-1">
              <Check className="w-4 h-4" /> Salvar
            </Button>
            <Button onClick={handleRegister} disabled={!canRegister || saving} className="flex-1 rounded-xl h-11 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? <Clock className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Registrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}