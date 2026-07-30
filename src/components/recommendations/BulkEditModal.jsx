import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import DateInput from "@/components/ui/DateInput";

const EDITABLE_FIELDS = [
  { key: "date", label: "Data", type: "date" },
  { key: "type", label: "Tipo", type: "text" },
  { key: "status", label: "Status", type: "text" },
  { key: "implement_id", label: "Implemento", type: "implement" },
  { key: "liters_per_ha", label: "Volume de calda (L/ha)", type: "number" },
  { key: "machine_config", label: "Config. maquinário", type: "text" },
  { key: "implement_config", label: "Config. implemento", type: "text" },
  { key: "climate_conditions", label: "Condições climáticas", type: "text" },
];

export default function BulkEditModal({ selectedIds, onApply, onClose }) {
  const [selectedField, setSelectedField] = useState("");
  const [value, setValue] = useState("");
  const [applying, setApplying] = useState(false);

  const { data: implementsList = [] } = useQuery({
    queryKey: ["implements"],
    queryFn: () => base44.entities.Implement.list("sort_order", 100),
  });

  const fieldConfig = EDITABLE_FIELDS.find((f) => f.key === selectedField);

  const handleApply = async () => {
    if (!selectedField || value === "") return;
    setApplying(true);
    const changes = {};
    if (fieldConfig.type === "number") {
      changes[selectedField] = parseFloat(value);
    } else {
      changes[selectedField] = value;
    }
    await onApply(changes);
    setApplying(false);
  };

  const ids = [...selectedIds];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-card w-full max-w-lg rounded-t-3xl sm:rounded-3xl p-5 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">Editar em Massa</h2>
            <p className="text-sm text-muted-foreground">
              {ids.length} RA{ids.length !== 1 ? "s" : ""} selecionada{ids.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Campo a alterar</label>
            <select
              value={selectedField}
              onChange={(e) => {
                setSelectedField(e.target.value);
                setValue("");
              }}
              className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecione um campo...</option>
              {EDITABLE_FIELDS.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {fieldConfig && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">{fieldConfig.label}</label>
              {fieldConfig.type === "date" ? (
                <DateInput
                  value={value}
                  onChange={setValue}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ) : fieldConfig.type === "implement" ? (
                <select
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione um implemento...</option>
                  {implementsList.map((imp) => (
                    <option key={imp.id} value={imp.id}>
                      {imp.name}
                    </option>
                  ))}
                </select>
              ) : fieldConfig.type === "number" ? (
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ) : (
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              className="flex-1 rounded-xl"
              disabled={!selectedField || value === "" || applying}
              onClick={handleApply}
            >
              {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aplicar"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}