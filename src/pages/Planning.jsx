import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Printer, Plus, Trash2, ClipboardList, ChevronLeft, ChevronRight, CheckSquare, Square, Pencil, Clock, CalendarDays } from "lucide-react";
import EditLabelModal from "../components/planning/EditLabelModal";
import FillTimesModal from "../components/planning/FillTimesModal";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import BottomNav from "../components/field/BottomNav";
import QuickActionFAB from "../components/QuickActionFAB";
import LabelPreview from "../components/planning/LabelPreview";
import PlanningForm from "../components/planning/PlanningForm";
import BulkRescheduleModal from "../components/planning/BulkRescheduleModal";
import NewLabelModal from "../components/planning/NewLabelModal";

const today = () => new Date().toISOString().split("T")[0];

export default function Planning() {
  const [selectedDate, setSelectedDate] = useState(today());
  const [showForm, setShowForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [editingLabel, setEditingLabel] = useState(null);
  const [fillingLabel, setFillingLabel] = useState(null);
  const [showBulkReschedule, setShowBulkReschedule] = useState(false);
  const printRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: operators = [] } = useQuery({
    queryKey: ["operators"],
    queryFn: () => base44.entities.Operator.filter({ active: true }),
  });

  const { data: operations = [] } = useQuery({
    queryKey: ["operations"],
    queryFn: () => base44.entities.Operation.filter({ active: true }),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["operation-templates"],
    queryFn: () => base44.entities.OperationTemplate.list(),
  });

  const { data: allCustomFields = [] } = useQuery({
    queryKey: ["all-custom-fields"],
    queryFn: () => base44.entities.CustomField.list(),
    enabled: templates.length > 0,
  });

  const { data: labels = [] } = useQuery({
    queryKey: ["planning-labels", selectedDate],
    queryFn: () => base44.entities.PlanningLabel.filter({ date: selectedDate }, "-created_date", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.PlanningLabel.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["planning-labels", selectedDate] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.PlanningLabel.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["planning-labels", selectedDate] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.PlanningLabel.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["planning-labels", selectedDate] }),
  });

  const handleEditSave = (updatedData) => {
    updateMutation.mutate({ id: editingLabel.id, data: updatedData });
    setEditingLabel(null);
  };

  const handleBulkReschedule = async (newDate) => {
    const ids = [...selectedIds];
    await Promise.all(ids.map((id) => base44.entities.PlanningLabel.update(id, { date: newDate })));
    queryClient.invalidateQueries({ queryKey: ["planning-labels"] });
    setSelectedIds(new Set());
    setShowBulkReschedule(false);
  };

  const handleFillTimes = ({ startTime, endTime, observations, customValues }) => {
    const label = fillingLabel;
    const params = new URLSearchParams(new URL(label.qr_data).search);

    // Start with PlanningLabel's existing additional_details (from planning stage)
    let mergedDetails = {};
    try { mergedDetails = label.additional_details ? JSON.parse(label.additional_details) : {}; }
    catch { mergedDetails = {}; }
    // Merge registration-stage values on top
    if (customValues && typeof customValues === "object") {
      Object.assign(mergedDetails, customValues);
    }

    // Update PlanningLabel with merged details and clear draft
    updateMutation.mutate({ id: label.id, data: { additional_details: JSON.stringify(mergedDetails), draft_data: null } });

    base44.entities.FieldRecord.create({
      operator_name: label.operator_name,
      operator_id: params.get("op_id") || "",
      operation: label.operation_name,
      orchard_number: label.orchard_number,
      start_time: startTime,
      end_time: endTime,
      date: today(),
      planned_date: label.original_date || label.date,
      observations,
      qr_scanned: false,
      additional_details: Object.keys(mergedDetails).length > 0 ? JSON.stringify(mergedDetails) : null,
    });
    setFillingLabel(null);
  };

  const handleSaveDraft = ({ startTime, endTime, observations, customValues }) => {
    const label = fillingLabel;
    let mergedDetails = {};
    try { mergedDetails = label.additional_details ? JSON.parse(label.additional_details) : {}; }
    catch { mergedDetails = {}; }
    if (customValues && typeof customValues === "object") {
      Object.assign(mergedDetails, customValues);
    }
    updateMutation.mutate({
      id: label.id,
      data: {
        additional_details: Object.keys(mergedDetails).length > 0 ? JSON.stringify(mergedDetails) : null,
        draft_data: JSON.stringify({ startTime, endTime, observations, customValues }),
      },
    });
    setFillingLabel(null);
  };

  const handleAddLabel = (label) => {
    createMutation.mutate({
      date: selectedDate,
      operator_name: label.operatorName,
      operator_photo: label.operatorPhoto || "",
      operation_code: label.operationCode,
      operation_name: label.operationName,
      orchard_number: label.orchardNumber,
      qr_data: label.qrData,
      additional_details: label.additionalDetails || null,
    });
    setShowForm(false);
  };

  const handleRemove = (id) => {
    deleteMutation.mutate(id);
    setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === labels.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(labels.map((l) => l.id)));
    }
  };

  // Get registration-stage custom fields for a label's operation
  const getRegistrationFields = (label) => {
    if (!label) return [];
    const op = operations.find(o => o.name === label.operation_name);
    if (!op) return [];
    const tmpl = templates.find(t => t.operation_id === op.id);
    if (!tmpl) return [];
    return allCustomFields.filter(f => f.template_id === tmpl.id);
  };

  const toLabelPreviewProps = (l) => ({
    operatorName: l.operator_name,
    operatorPhoto: l.operator_photo,
    operationCode: l.operation_code,
    operationName: l.operation_name,
    orchardNumber: l.orchard_number,
    qrData: l.qr_data,
    date: l.date,
    additionalDetails: l.additional_details,
  });

  const handlePrint = () => {
    const toPrint = labels.filter((l) => selectedIds.has(l.id));
    if (toPrint.length === 0) return;

    const templateByOpId = Object.fromEntries(templates.map((t) => [t.operation_id, t]));

    const items = toPrint.map((label) => {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(label.qr_data)}`;

      // Build extra fields for this label
      let extraFieldsHtml = "";
      let description = null;
      let photoUrl = null;
      
      // Parse additional details
      if (label.additional_details) {
        let details = {};
        try { details = JSON.parse(label.additional_details); } catch {}
        
        // WhatsApp Quick Action fields
        description = details["O que precisa ser feito?"] || details.descricao;
        photoUrl = details["Foto"] || details.foto_manutencao;
        const usedPhotoKeys = new Set(["Foto", "foto_manutencao"]);

        // Detect RA data
        for (const val of Object.values(details)) {
          try {
            const parsed = typeof val === "string" ? JSON.parse(val) : val;
            if (parsed && typeof parsed === "object" && parsed.ra_id) {
            let raHtml = `<div style="border-top:1px dashed #1a7a3a;margin-top:2mm;padding-top:2mm;margin-bottom:2mm;background:#f0f7f1;border-radius:2mm;padding:2mm;">`;
            raHtml += `<div style="font-size:9pt;font-weight:800;color:#1a7a3a;margin-bottom:1mm;">🌿 RA: ${parsed.code}</div>`;
            if (parsed.type) raHtml += `<div style="font-size:7pt;margin-bottom:1mm;"><span style="font-weight:700;color:#333;">Tipo: </span><span style="color:#555;">${parsed.type}</span></div>`;
            if (parsed.climate_conditions) raHtml += `<div style="font-size:7pt;margin-bottom:1mm;"><span style="font-weight:700;color:#333;">Clima: </span><span style="color:#555;">${parsed.climate_conditions}</span></div>`;
            if (parsed.machine_config) raHtml += `<div style="font-size:7pt;margin-bottom:1mm;"><span style="font-weight:700;color:#333;">Maquinário: </span><span style="color:#555;">${parsed.machine_config}</span></div>`;
            if (parsed.implement_name) raHtml += `<div style="font-size:7pt;margin-bottom:1mm;"><span style="font-weight:700;color:#333;">Implemento: </span><span style="color:#555;">${parsed.implement_name}</span></div>`;
            if (parsed.implement_config) raHtml += `<div style="font-size:7pt;margin-bottom:1mm;"><span style="font-weight:700;color:#333;">Regulagem implemento: </span><span style="color:#555;">${parsed.implement_config}</span></div>`;
            if (parsed.products && parsed.products.length > 0) {
              const tank = parsed.tank_capacity_liters;
              const lpha = parsed.liters_per_ha || 1000;
              for (const p of parsed.products) {
                let qpt = p.qty_per_tank;
                if (qpt == null && tank && lpha && p.dose != null) {
                  qpt = parseFloat((p.dose * (tank / lpha)).toFixed(3));
                }
                raHtml += `<div style="background:white;border-radius:1.5mm;padding:1.5mm;margin-top:1mm;">`;
                raHtml += `<div style="font-size:8pt;font-weight:700;color:#1a7a3a;">${p.product_name}</div>`;
                if (p.active_ingredient || p.target) raHtml += `<div style="font-size:7pt;color:#2a6a4a;font-style:italic;">${p.active_ingredient ? `P.A.: ${p.active_ingredient}` : ""}${p.active_ingredient && p.target ? " · " : ""}${p.target ? `Alvo: ${p.target}` : ""}</div>`;
                raHtml += `<div style="font-size:7pt;color:#555;">${p.application_mode || ""}${p.dose != null ? ` · Dose: ${p.dose}${p.application_mode === "PLANTA" ? "/planta" : "/ha"}` : ""}${p.total_quantity != null ? ` · Total: ${p.total_quantity}` : ""}</div>`;
                if (qpt != null) raHtml += `<div style="font-size:8pt;font-weight:700;color:#1a5599;">🧴 ${qpt} por tanque</div>`;
                if (p.obs) raHtml += `<div style="font-size:7pt;color:#777;">${p.obs}</div>`;
                raHtml += `</div>`;
              }
            }
            raHtml += `</div>`;
            extraFieldsHtml = raHtml + extraFieldsHtml;
            break;
            }
          } catch {}
        }
        
        // Custom fields from templates
        const op = operations.find(o => o.name === label.operation_name);
        if (op) {
          const tmpl = templateByOpId[op.id];
          if (tmpl) {
            const labelFields = allCustomFields
              .filter(f => f.template_id === tmpl.id && f.show_on_label && f.field_type !== "ra_selector")
              .filter(f => details[f.field_label] !== undefined && details[f.field_label] !== "");
            if (labelFields.length > 0) {
            const rows = labelFields.map(f => {
              const val = details[f.field_label];
              if (f.field_type === "photo" && val) {
                // Skip if this photo was already rendered as the main photoUrl
                if (photoUrl && photoUrl === val) return "";
                return `<div style="font-size:8pt;margin-bottom:2mm;"><div style="font-weight:700;color:#333;margin-bottom:1mm;">${f.field_label}:</div><img src="${val}" style="width:100%;max-width:70mm;border-radius:2mm;display:block;" /></div>`;
              }
              if (f.field_type === "hour_meter" && val) {
                let hm = {};
                try { hm = JSON.parse(val); } catch {}
                const hmText = `Inicial: ${hm.start || "-"} / Final: ${hm.end || "-"}`;
                return `<div style="font-size:8pt;margin-bottom:1.5mm;"><span style="font-weight:700;color:#333;">${f.field_label}: </span><span style="color:#555;">${hmText}</span></div>`;
              }
              if (f.field_type === "multiple_choice" && val) {
                let arr = [];
                try { arr = JSON.parse(val); } catch { arr = [val]; }
                return `<div style="font-size:8pt;margin-bottom:1.5mm;"><span style="font-weight:700;color:#333;">${f.field_label}: </span><span style="color:#555;">${arr.join(", ")}</span></div>`;
              }
              return `<div style="font-size:8pt;margin-bottom:1.5mm;"><span style="font-weight:700;color:#333;">${f.field_label}: </span><span style="color:#555;">${val}</span></div>`;
            }).join("");
            extraFieldsHtml += `<div style="border-top:1px dashed #ccc;margin-top:2mm;padding-top:2mm;margin-bottom:2mm;">${rows}</div>`;
            }
          }
        }
      }

      return `
        <div class="label-page">
          <div style="border-bottom:2px solid #1a7a3a;padding-bottom:2mm;margin-bottom:3mm;display:flex;justify-content:space-between;align-items:center;">
            <div class="label-title">HP Avocado</div>
            <div class="label-subtitle">Boletim Diário de Serviços</div>
          </div>
          <div style="font-size:16pt;font-weight:900;color:#111;line-height:1.2;margin-bottom:2mm;">${label.operator_name}</div>
          <div style="font-size:14pt;font-weight:800;color:#1a7a3a;line-height:1.3;margin-bottom:3mm;">${label.operation_code}. ${label.operation_name}</div>
          <div style="display:inline-block;background:#f0f0f0;border-radius:3mm;padding:1mm 3mm;font-size:9pt;font-weight:600;color:#444;margin-bottom:2mm;">🌳 Pomar ${label.orchard_number}</div>
          <div style="font-size:8pt;color:#555;margin-bottom:3mm;">📅 ${new Date(label.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</div>
          <div style="border-top:1px dashed #ccc;margin:2mm 0 3mm;"></div>
          ${description ? `<div style="font-size:8pt;margin-bottom:1.5mm;"><span style="font-weight:700;color:#333;">Descrição: </span><span style="color:#555;">${description}</span></div>` : ""}
          ${photoUrl ? `<div style="font-size:8pt;margin-bottom:1mm;font-weight:700;color:#333;">Foto:</div><img src="${photoUrl}" style="width:100%;max-width:70mm;border-radius:2mm;display:block;margin-bottom:2mm;" />` : ""}
          ${extraFieldsHtml}
          <div style="display:flex;flex-direction:column;align-items:center;gap:1mm;">
            <img src="${qrUrl}" style="width:30mm;height:30mm;" />
            <div style="font-size:7pt;color:#999;">Escaneie para registrar</div>
          </div>
        </div>
      `;
    }).join("");

    const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Etiquetas HP Avocado</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: white; }
      .label-page { width: 58mm; max-width: 58mm; page-break-after: always; padding: 3mm; font-family: Arial, sans-serif; }
      .label-page:last-child { page-break-after: auto; }
      .label-title { font-size: 10pt; font-weight: bold; }
      .label-subtitle { font-size: 7pt; color: #555; }
      @media print { @page { size: 58mm auto; margin: 0; } }
    </style>
  </head>
  <body>${items}</body>
</html>`;

    // Adiciona auto-print no HTML antes de abrir
    const htmlWithPrint = html.replace("</body>", "<script>window.onload=function(){window.print();}<\/script></body>");
    const blob = new Blob([htmlWithPrint], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const formattedDate = format(new Date(selectedDate + "T12:00:00"), "EEEE, d 'de' MMMM", { locale: ptBR });
  const isToday = selectedDate === today();
  const allSelected = labels.length > 0 && selectedIds.size === labels.length;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-5 rounded-b-3xl">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Planejamento</h1>
            <p className="text-primary-foreground/70 text-sm">Crie etiquetas para impressão</p>
          </div>
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowBulkReschedule(true)} className="rounded-xl gap-2">
                <CalendarDays className="w-4 h-4" />
                Reagendar ({selectedIds.size})
              </Button>
              <Button variant="secondary" size="sm" onClick={handlePrint} className="rounded-xl gap-2">
                <Printer className="w-4 h-4" />
                Imprimir
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Filtro de data */}
      <div className="max-w-lg mx-auto px-4 pt-4">
        <div className="flex items-center justify-between bg-card border border-border rounded-2xl px-3 py-2 shadow-sm">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(subDays(new Date(selectedDate + "T12:00:00"), 1).toISOString().split("T")[0])}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-semibold capitalize">{formattedDate}</p>
            {isToday && <p className="text-xs text-primary font-medium">Hoje</p>}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedDate(addDays(new Date(selectedDate + "T12:00:00"), 1).toISOString().split("T")[0])}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-3">
        {/* Selecionar todas */}
        {labels.length > 0 && (
          <div className="flex items-center justify-between">
            <button onClick={toggleAll} className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {allSelected ? <CheckSquare className="w-4 h-4 text-primary" /> : <Square className="w-4 h-4" />}
              {allSelected ? "Desmarcar todas" : "Selecionar todas"}
            </button>
            <span className="text-xs text-muted-foreground">{labels.length} etiqueta{labels.length !== 1 ? "s" : ""}</span>
          </div>
        )}

        {/* Empty state */}
        {labels.length === 0 && !showForm && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Nenhuma etiqueta para este dia</p>
            <p className="text-muted-foreground/70 text-sm mt-1">Adicione atividades para gerar etiquetas</p>
          </motion.div>
        )}

        {/* Labels list */}
        <AnimatePresence>
          {labels.map((label) => {
            const isSelected = selectedIds.has(label.id);
            return (
              <motion.div
                key={label.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 50 }}
                className={`bg-card rounded-2xl border-2 overflow-hidden shadow-sm transition-colors cursor-pointer
                  ${isSelected ? "border-primary" : "border-border"}`}
                onClick={() => toggleSelect(label.id)}
              >
                <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
                  <div className="flex items-center gap-2">
                    {isSelected
                      ? <CheckSquare className="w-4 h-4 text-primary shrink-0" />
                      : <Square className="w-4 h-4 text-muted-foreground shrink-0" />}
                    <span className="font-semibold text-sm text-foreground">
                      {label.operator_name} · {label.orchard_number}
                    </span>
                    {label.draft_data && (
                      <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                        <Clock className="w-3 h-3" />
                        Rascunho
                      </span>
                    )}
                    {label.auto_rescheduled && (
                      <span className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
                        {label.original_date && (
                          <span className="text-xs text-red-500 font-medium">
                            {format(new Date(label.original_date + "T12:00:00"), "dd/MM", { locale: ptBR })}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); setFillingLabel(label); }}
                      className="text-primary hover:bg-primary/10 w-8 h-8"
                      title="Preencher horários"
                    >
                      <Clock className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); setEditingLabel(label); }}
                      className="text-muted-foreground hover:bg-muted w-8 h-8"
                      title="Editar etiqueta"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); handleRemove(label.id); }}
                      className="text-destructive hover:bg-destructive/10 w-8 h-8"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-4">
                  <LabelPreview label={toLabelPreviewProps(label)} compact />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Spacer so last label isn't hidden behind FAB */}
        <div className="h-4" />
      </div>

      {/* Floating Action Button */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="fixed bottom-24 right-4 z-50 bg-primary text-primary-foreground rounded-full shadow-lg w-14 h-14 flex items-center justify-center hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      <QuickActionFAB />
      <BottomNav />

      {editingLabel && (
        <EditLabelModal
          label={editingLabel}
          operators={operators}
          operations={operations}
          onSave={handleEditSave}
          onClose={() => setEditingLabel(null)}
        />
      )}

      {fillingLabel && (
        <FillTimesModal
          label={fillingLabel}
          customFields={getRegistrationFields(fillingLabel)}
          onSave={handleFillTimes}
          onSaveDraft={handleSaveDraft}
          onClose={() => setFillingLabel(null)}
        />
      )}

      {showBulkReschedule && (
        <BulkRescheduleModal
          count={selectedIds.size}
          onSave={handleBulkReschedule}
          onClose={() => setShowBulkReschedule(false)}
        />
      )}

      {showForm && (
        <NewLabelModal
          operators={operators}
          operations={operations}
          onAdd={handleAddLabel}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}