import React, { useState } from "react";
import { X, Leaf, Beaker, Thermometer, Tractor, Wrench, Package, Droplets, TreePine, Calendar, SprayCan } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatQtBr = (v) => v != null && !isNaN(v) ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

/**
 * Extracts RA data object from a record's additional_details JSON string.
 * Supports two formats:
 * - Flat: ra_id is a direct key (from createLabelsFromRAs backend function)
 * - Nested: ra_id is inside a JSON string value (from RASelectorField in the UI)
 */
export function extractRAData(additionalDetailsStr) {
  if (!additionalDetailsStr) return null;
  try {
    const parsed = JSON.parse(additionalDetailsStr);
    if (!parsed || typeof parsed !== "object") return null;

    // Case 1: flat format from createLabelsFromRAs — ra_id is a direct top-level key
    if ("ra_id" in parsed) {
      return {
        ra_id: parsed.ra_id,
        code: parsed.ra_code || parsed.code || "",
        type: parsed.type || "",
        orchard: parsed.orchard_code || parsed.orchard || "",
        climate_conditions: parsed.climate_conditions || "",
        machine_config: parsed.machine_config || "",
        machine_name: parsed.machine_name || "",
        implement_config: parsed.implement_config || "",
        implement_name: parsed.implement_name || "",
        tank_capacity_liters: parsed.tank_capacity_liters || null,
        liters_per_ha: parsed.liters_per_ha || null,
        products: parsed.products || [],
      };
    }

    // Case 2: nested format from RASelectorField — value is JSON string containing ra_id
    for (const value of Object.values(parsed)) {
      try {
        const v = typeof value === "string" ? JSON.parse(value) : value;
        if (v && typeof v === "object" && "ra_id" in v) return v;
      } catch {}
    }
  } catch {}
  return null;
}

export default function RADetailModal({ raData, onClose }) {
  if (!raData) return null;

  const code = raData.code || raData.ra_code || "—";
  const products = raData.products || [];

  const generalItems = [
    raData.type && { icon: Beaker, label: "Tipo", value: raData.type },
    raData.orchard && { icon: TreePine, label: "Pomar", value: raData.orchard },
    raData.date && { icon: Calendar, label: "Data prevista", value: format(new Date(raData.date + "T12:00:00"), "dd/MM/yyyy") },
    raData.status && { icon: Leaf, label: "Status", value: raData.status },
    raData.liters_per_ha && { icon: Droplets, label: "Volume de calda", value: `${raData.liters_per_ha} L/ha` },
    raData.tank_capacity_liters && { icon: SprayCan, label: "Capac. tanque", value: `${raData.tank_capacity_liters} L` },
    raData.climate_conditions && { icon: Thermometer, label: "Clima ideal", value: raData.climate_conditions },
    raData.machine_name && { icon: Tractor, label: "Trator", value: raData.machine_name },
    raData.implement_name && { icon: Wrench, label: "Implemento", value: raData.implement_name },
    raData.machine_config && { icon: Tractor, label: "Regulagem máq.", value: raData.machine_config },
    raData.implement_config && { icon: Wrench, label: "Regulagem impl.", value: raData.implement_config },
  ].filter(Boolean);

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card rounded-t-3xl z-10">
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-base">Detalhes da RA</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* RA Code badge */}
          <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-xl px-4 py-3">
            <Leaf className="w-5 h-5 text-primary shrink-0" />
            <span className="text-lg font-bold text-primary">{code}</span>
          </div>

          {/* General fields */}
          {generalItems.length > 0 && (
            <div className="space-y-2">
              {generalItems.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-center gap-3 p-2.5 bg-muted/40 rounded-xl">
                    <Icon className="w-4 h-4 text-primary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase">{item.label}</p>
                      <p className="text-sm font-semibold">{item.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Products */}
          {products.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-primary" />
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Produtos</p>
              </div>
              <div className="space-y-2">
                {products.map((p, i) => (
                  <div key={i} className="bg-muted/40 rounded-xl p-3 space-y-1">
                    <div className="flex items-center gap-2">
                      <Package className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-sm font-bold">{p.product_name}</span>
                    </div>
                    {(p.active_ingredient || p.target) && (
                      <p className="text-[10px] text-primary/70 font-medium pl-5">
                        {p.active_ingredient ? `P.A.: ${p.active_ingredient}` : ""}
                        {p.active_ingredient && p.target ? " · " : ""}
                        {p.target ? `Alvo: ${p.target}` : ""}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground pl-5">
                      {p.application_mode}
                      {p.dose != null ? ` · Dose: ${formatQtBr(p.dose)}${p.unit ? " " + p.unit : ""}${p.application_mode === "PLANTA" ? "/planta" : "/ha"}` : ""}
                      {p.total_quantity != null ? ` · Total: ${formatQtBr(p.total_quantity)}${p.unit ? " " + p.unit : ""}` : ""}
                    </p>
                    {p.qty_per_tank != null && (
                      <p className="text-xs text-blue-600 font-semibold pl-5">🧴 {formatQtBr(p.qty_per_tank)}{p.unit ? " " + p.unit : ""} por tanque</p>
                    )}
                    {p.carencia && (
                      <p className="text-[10px] text-muted-foreground pl-5">⏱ Carência: {p.carencia}</p>
                    )}
                    {p.obs && <p className="text-[10px] text-muted-foreground pl-5">{p.obs}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
