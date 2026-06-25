import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Leaf, Lock, Thermometer, Wind, Droplets, Package, Beaker, Tractor, Wrench } from "lucide-react";

export default function RASelectorField({ value, onChange, onRASelected, readOnly }) {
  const [search, setSearch] = useState("");

  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ["recommendations-active"],
    queryFn: () => base44.entities.AgronomicRecommendation.filter({ active: true }, "-created_date", 500),
  });

  const selectedRA = useMemo(() => {
    try { return value ? JSON.parse(value) : null; } catch { return null; }
  }, [value]);

  const filtered = useMemo(() => {
    if (!search) return recommendations;
    const s = search.toLowerCase();
    return recommendations.filter(ra =>
      ra.code?.toLowerCase().includes(s) ||
      ra.product_name?.toLowerCase().includes(s) ||
      ra.type?.toLowerCase().includes(s) ||
      ra.orchard_code?.toLowerCase().includes(s)
    );
  }, [recommendations, search]);

  const handleSelect = (ra) => {
    const raData = {
      ra_id: ra.id,
      code: ra.code || "",
      product: ra.product_name || "",
      type: ra.type || "",
      orchard: ra.orchard_code || "",
      application_mode: ra.application_mode || "",
      dose: ra.dose ?? null,
      total_quantity: ra.total_quantity ?? null,
      climate_conditions: ra.climate_conditions || "",
      machine_config: ra.machine_config || "",
      implement_config: ra.implement_config || "",
    };
    onChange(JSON.stringify(raData));
    if (onRASelected) onRASelected(ra);
  };

  const handleClear = () => {
    onChange("");
    if (onRASelected) onRASelected(null);
  };

  // Read-only display (operator viewing pre-selected RA)
  if (readOnly && selectedRA) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-xl px-3 py-2.5">
          <Leaf className="w-4 h-4 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-primary">{selectedRA.code}</span>
            <span className="text-xs text-muted-foreground ml-2">{selectedRA.product}</span>
          </div>
          <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </div>
        <RADetails ra={selectedRA} />
      </div>
    );
  }

  if (readOnly) {
    return (
      <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2.5 text-xs text-muted-foreground">
        <Leaf className="w-4 h-4" />
        Nenhuma RA vinculada
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {selectedRA ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-xl px-3 py-2.5">
            <Leaf className="w-4 h-4 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-primary">{selectedRA.code}</span>
              <span className="text-xs text-muted-foreground ml-2">{selectedRA.product}</span>
            </div>
            <button onClick={handleClear} className="text-xs text-destructive hover:underline font-medium shrink-0">
              Trocar
            </button>
          </div>
          <RADetails ra={selectedRA} />
        </div>
      ) : (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar RA por código, produto, tipo..."
            className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {isLoading ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              {recommendations.length === 0 ? "Nenhuma RA cadastrada." : "Nenhuma RA encontrada."}
            </p>
          ) : (
            <div className="max-h-56 overflow-y-auto rounded-xl border border-border divide-y divide-border">
              {filtered.map((ra) => (
                <button
                  key={ra.id}
                  onClick={() => handleSelect(ra)}
                  className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors flex items-start gap-2"
                >
                  <Leaf className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{ra.code}</span>
                      {ra.orchard_code && (
                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-medium">{ra.orchard_code}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{ra.product_name}</p>
                    {ra.type && <p className="text-[10px] text-muted-foreground/70">{ra.type}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function RADetails({ ra }) {
  if (!ra) return null;

  const details = [
    ra.product && { icon: Package, label: "Produto", value: ra.product },
    ra.type && { icon: Beaker, label: "Tipo", value: ra.type },
    ra.orchard && { icon: Leaf, label: "Pomar", value: ra.orchard },
    ra.application_mode && {
      icon: Beaker,
      label: "Aplicação",
      value: `${ra.application_mode}${ra.dose != null ? ` · Dose: ${ra.dose}` : ""}${ra.total_quantity != null ? ` · Total: ${ra.total_quantity}` : ""}`,
    },
    ra.climate_conditions && { icon: Thermometer, label: "Clima ideal", value: ra.climate_conditions },
    ra.machine_config && { icon: Tractor, label: "Maquinário", value: ra.machine_config },
    ra.implement_config && { icon: Wrench, label: "Implemento", value: ra.implement_config },
  ].filter(Boolean);

  if (details.length === 0) return null;

  return (
    <div className="bg-muted/30 rounded-xl p-3 space-y-1.5">
      {details.map((d, i) => {
        const Icon = d.icon;
        return (
          <div key={i} className="flex items-start gap-2">
            <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="text-[10px] text-muted-foreground font-medium uppercase">{d.label}: </span>
              <span className="text-xs text-foreground font-medium">{d.value}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}