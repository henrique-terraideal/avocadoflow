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

  // Carrega todos os produtos vinculados para permitir busca por produto, P.A. e alvo
  const { data: allProducts = [] } = useQuery({
    queryKey: ["recommendation-products-search"],
    queryFn: () => base44.entities.RecommendationProduct.list("sort_order", 1000),
    enabled: recommendations.length > 0,
  });

  const productsByRA = useMemo(() => {
    const map = {};
    for (const p of allProducts) {
      if (!map[p.recommendation_id]) map[p.recommendation_id] = [];
      map[p.recommendation_id].push(p);
    }
    return map;
  }, [allProducts]);

  const selectedRA = useMemo(() => {
    try { return value ? JSON.parse(value) : null; } catch { return null; }
  }, [value]);

  const normalize = (str) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  const filtered = useMemo(() => {
    if (!search) return recommendations;
    const s = normalize(search);
    return recommendations.filter(ra => {
      const prods = productsByRA[ra.id] || [];
      const productText = prods
        .map(p => `${p.product_name || ""} ${p.active_ingredient || ""} ${p.target || ""}`)
        .join(" ");
      return (
        normalize(ra.code).includes(s) ||
        normalize(ra.type).includes(s) ||
        normalize(ra.orchard_code).includes(s) ||
        normalize(productText).includes(s)
      );
    });
  }, [recommendations, productsByRA, search]);

  const handleSelect = async (ra) => {
    const [prods, implement_] = await Promise.all([
      base44.entities.RecommendationProduct.filter({ recommendation_id: ra.id }, "sort_order", 100),
      ra.implement_id ? base44.entities.Implement.get(ra.implement_id).catch(() => null) : Promise.resolve(null),
    ]);

    const tankCapacity = implement_?.tank_capacity_liters ?? null;
    const litersPerHa = ra.liters_per_ha || 1000;
    const haPerTank = tankCapacity && litersPerHa ? tankCapacity / litersPerHa : null;

    const raData = {
      ra_id: ra.id,
      code: ra.code || "",
      type: ra.type || "",
      orchard: ra.orchard_code || "",
      climate_conditions: ra.climate_conditions || "",
      machine_config: ra.machine_config || "",
      implement_config: ra.implement_config || "",
      implement_name: implement_?.name || "",
      tank_capacity_liters: tankCapacity,
      liters_per_ha: litersPerHa,
      products: prods.map(p => ({
        product_name: p.product_name || "",
        active_ingredient: p.active_ingredient || "",
        target: p.target || "",
        application_mode: p.application_mode || "",
        unit: p.unit || "",
        dose: p.dose ?? null,
        total_quantity: p.total_quantity ?? null,
        qty_per_tank: haPerTank && p.dose != null ? parseFloat((p.dose * haPerTank).toFixed(3)) : null,
        obs: p.obs || "",
      })),
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
            <span className="text-sm font-bold text-primary">{selectedRA.code}</span>
            <button onClick={handleClear} className="text-xs text-destructive hover:underline font-medium shrink-0 ml-auto">
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
            placeholder="Buscar por código, produto, P.A., alvo..."
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

export function RADetails({ ra, products = [] }) {
  if (!ra && products.length === 0) return null;

  const generalDetails = [
    ra?.type && { icon: Beaker, label: "Tipo", value: ra.type },
    ra?.orchard && { icon: Leaf, label: "Pomar", value: ra.orchard },
    ra?.climate_conditions && { icon: Thermometer, label: "Clima ideal", value: ra.climate_conditions },
    ra?.machine_config && { icon: Tractor, label: "Maquinário", value: ra.machine_config },
    ra?.implement_config && { icon: Wrench, label: "Implemento", value: ra.implement_config },
  ].filter(Boolean);

  const productList = ra?.products || products;

  if (generalDetails.length === 0 && productList.length === 0) return null;

  return (
    <div className="bg-muted/30 rounded-xl p-3 space-y-2">
      {generalDetails.length > 0 && (
        <div className="space-y-1.5">
          {generalDetails.map((d, i) => {
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
      )}
      {productList.length > 0 && (
        <div className="space-y-1.5">
          {productList.map((p, i) => (
            <div key={i} className="flex items-start gap-2 bg-background/50 rounded-lg p-1.5">
            <Package className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <span className="text-xs text-foreground font-bold">{p.product_name}</span>
              {(p.active_ingredient || p.target) && (
                <div className="text-[9px] text-primary/70 font-medium">
                  {p.active_ingredient ? `P.A.: ${p.active_ingredient}` : ""}
                  {p.active_ingredient && p.target ? " · " : ""}
                  {p.target ? `Alvo: ${p.target}` : ""}
                </div>
              )}
              <div className="text-[10px] text-muted-foreground">
                {p.application_mode}
                {p.dose != null ? ` · Dose: ${Number(p.dose).toLocaleString("pt-BR", {minimumFractionDigits: 2, maximumFractionDigits: 2})}${p.unit ? " " + p.unit : ""}${p.application_mode === "PLANTA" ? "/planta" : "/ha"}` : ""}
                {p.total_quantity != null ? ` · Total: ${Number(p.total_quantity).toLocaleString("pt-BR", {minimumFractionDigits: 2, maximumFractionDigits: 2})}${p.unit ? " " + p.unit : ""}` : ""}
              </div>
              {p.qty_per_tank != null && (
                <div className="text-[10px] text-blue-600 font-semibold">🧴 {Number(p.qty_per_tank).toLocaleString("pt-BR", {minimumFractionDigits: 2, maximumFractionDigits: 2})}{p.unit ? ` ${p.unit}` : ""} por tanque</div>
              )}
              {p.obs && <div className="text-[10px] text-muted-foreground">{p.obs}</div>}
            </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}