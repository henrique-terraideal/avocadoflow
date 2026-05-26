import React, { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Printer, Plus, Trash2, ClipboardList } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BottomNav from "../components/field/BottomNav";
import LabelPreview from "../components/planning/LabelPreview";
import PlanningForm from "../components/planning/PlanningForm";

export default function Planning() {
  const [labels, setLabels] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const printRef = useRef(null);

  const { data: operators = [] } = useQuery({
    queryKey: ["operators"],
    queryFn: () => base44.entities.Operator.filter({ active: true }),
  });

  const { data: operations = [] } = useQuery({
    queryKey: ["operations"],
    queryFn: () => base44.entities.Operation.filter({ active: true }),
  });

  const handleAddLabel = (label) => {
    setLabels((prev) => [...prev, { ...label, id: Date.now() }]);
    setShowForm(false);
  };

  const handleRemove = (id) => {
    setLabels((prev) => prev.filter((l) => l.id !== id));
  };

  const handlePrint = () => {
    const printContent = printRef.current?.innerHTML;
    const win = window.open("", "_blank");
    win.document.write(`
      <html>
        <head>
          <title>Etiquetas HP Avocado</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { background: white; }
            .label-page {
              width: 80mm;
              page-break-after: always;
              padding: 4mm;
              font-family: Arial, sans-serif;
            }
            .label-page:last-child { page-break-after: auto; }
            .label-title { font-size: 11pt; font-weight: bold; margin-bottom: 2mm; }
            .label-subtitle { font-size: 8pt; color: #555; margin-bottom: 1mm; }
            .label-row { font-size: 9pt; margin-bottom: 1.5mm; display: flex; align-items: center; gap: 2mm; }
            .label-row span { font-weight: bold; }
            .label-qr { text-align: center; margin-top: 3mm; }
            .label-qr img { width: 35mm; height: 35mm; }
            .label-divider { border-top: 1px dashed #ccc; margin: 2mm 0; }
            @media print {
              @page { size: 80mm auto; margin: 0; }
            }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-5 rounded-b-3xl">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Planejamento</h1>
            <p className="text-primary-foreground/70 text-sm">Crie etiquetas para impressão</p>
          </div>
          {labels.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              onClick={handlePrint}
              className="rounded-xl gap-2"
            >
              <Printer className="w-4 h-4" />
              Imprimir ({labels.length})
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-5 space-y-3">
        {/* Empty state */}
        {labels.length === 0 && !showForm && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <ClipboardList className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Nenhuma etiqueta criada</p>
            <p className="text-muted-foreground/70 text-sm mt-1">Adicione atividades para gerar etiquetas</p>
          </motion.div>
        )}

        {/* Labels list */}
        <AnimatePresence>
          {labels.map((label) => (
            <motion.div
              key={label.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm"
            >
              <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
                <span className="font-semibold text-sm text-foreground">
                  {label.operatorName} · {label.orchardNumber}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(label.id)}
                  className="text-destructive hover:bg-destructive/10 w-8 h-8"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-4">
                <LabelPreview label={label} compact />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Form */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-card rounded-2xl border border-border p-5 shadow-sm"
            >
              <PlanningForm
                operators={operators}
                operations={operations}
                onAdd={handleAddLabel}
                onCancel={() => setShowForm(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add button */}
        {!showForm && (
          <Button
            size="lg"
            onClick={() => setShowForm(true)}
            className="w-full rounded-xl h-14 text-base gap-2"
          >
            <Plus className="w-5 h-5" />
            Nova Etiqueta
          </Button>
        )}
      </div>

      {/* Hidden print area */}
      <div className="hidden">
        <div ref={printRef}>
          {labels.map((label) => (
            <LabelPreview key={label.id} label={label} forPrint />
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}