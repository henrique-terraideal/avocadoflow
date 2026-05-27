import React, { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Printer, Plus, Trash2, ClipboardList, ChevronLeft, ChevronRight, CheckSquare, Square } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import BottomNav from "../components/field/BottomNav";
import LabelPreview from "../components/planning/LabelPreview";
import PlanningForm from "../components/planning/PlanningForm";

const today = () => new Date().toISOString().split("T")[0];

export default function Planning() {
  const [selectedDate, setSelectedDate] = useState(today());
  const [showForm, setShowForm] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
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

  const handleAddLabel = (label) => {
    createMutation.mutate({
      date: selectedDate,
      operator_name: label.operatorName,
      operator_photo: label.operatorPhoto || "",
      operation_code: label.operationCode,
      operation_name: label.operationName,
      orchard_number: label.orchardNumber,
      qr_data: label.qrData,
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

  const toLabelPreviewProps = (l) => ({
    operatorName: l.operator_name,
    operatorPhoto: l.operator_photo,
    operationCode: l.operation_code,
    operationName: l.operation_name,
    orchardNumber: l.orchard_number,
    qrData: l.qr_data,
  });

  const handlePrint = () => {
    const toPrint = labels.filter((l) => selectedIds.has(l.id));
    if (toPrint.length === 0) return;

    const items = toPrint.map((label) => {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(label.qr_data)}`;
      return `
        <div class="label-page">
          <div style="border-bottom:2px solid #1a7a3a;padding-bottom:2mm;margin-bottom:3mm;display:flex;justify-content:space-between;align-items:center;">
            <div class="label-title">HP Avocado</div>
            <div class="label-subtitle">Boletim Diário de Serviços</div>
          </div>
          <div style="font-size:16pt;font-weight:900;color:#111;line-height:1.2;margin-bottom:2mm;">${label.operator_name}</div>
          <div style="font-size:14pt;font-weight:800;color:#1a7a3a;line-height:1.3;margin-bottom:3mm;">${label.operation_code}. ${label.operation_name}</div>
          <div style="display:inline-block;background:#f0f0f0;border-radius:3mm;padding:1mm 3mm;font-size:9pt;font-weight:600;color:#444;margin-bottom:4mm;">🌳 Pomar ${label.orchard_number}</div>
          <div style="border-top:1px dashed #ccc;margin:2mm 0 3mm;"></div>
          <div style="display:flex;flex-direction:column;align-items:center;gap:1mm;">
            <img src="${qrUrl}" style="width:50mm;height:50mm;" />
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

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
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
            <Button variant="secondary" size="sm" onClick={handlePrint} className="rounded-xl gap-2">
              <Printer className="w-4 h-4" />
              Imprimir ({selectedIds.size})
            </Button>
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
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); handleRemove(label.id); }}
                    className="text-destructive hover:bg-destructive/10 w-8 h-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="p-4">
                  <LabelPreview label={toLabelPreviewProps(label)} compact />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <PlanningForm operators={operators} operations={operations} onAdd={handleAddLabel} onCancel={() => setShowForm(false)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add button */}
        {!showForm && (
          <Button size="lg" onClick={() => setShowForm(true)} className="w-full rounded-xl h-14 text-base gap-2">
            <Plus className="w-5 h-5" />
            Nova Etiqueta
          </Button>
        )}
      </div>

      <BottomNav />
    </div>
  );
}