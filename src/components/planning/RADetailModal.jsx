import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { X, Leaf, Thermometer, Tractor, Wrench, Package, Loader2, CheckCircle2, Clock, AlertCircle } from "lucide-react";

const formatQtBr = (v) => v != null && !isNaN(v) ? Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';

const STATUS_CONFIG = {
  planejada: { label: "Planejada", color: "bg-blue-100 text-blue-700", icon: Clock },
  pendente: { label: "Pendente", color: "bg-amber-100 text-amber-700", icon: AlertCircle },
  executada: { label: "Executada", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
};

export default function RADetailModal({ raId, onClose }) {
  const [ra, setRa] = useState(null);
  const [products, setProducts] = useState([]);
  const [machine, setMachine] = useState(null);
  const [implement, setImplement] = useState(null);
  const [orchard, setOrchard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!raId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const raData = await base44.entities.AgronomicRecommendation.get(raId);
        if (cancelled) return;
        setRa(raData);

        const [prods, orchards] = await Promise.all([
          base44.entities.RecommendationProduct.filter({ recommendation_id: raId }, "sort_order", 100),
          base44.entities.Orchard.filter({ active: true }, "sort_order", 200),
        ]);
        if (cancelled) return;
        setProducts(prods);
        const matchedOrchard = orchards.find(o => o.code === raData.orchard_code);
        if (matchedOrchard) setOrchard(matchedOrchard);

        if (raData.machine_id) {
          try { const m = await base44.entities.Machine.get(raData.machine_id); if (!cancelled) setMachine(m); } catch {}
        }
        if (raData.implement_id) {
          try { const i = await base44.entities.Implement.get(raData.implement_id); if (!cancelled) setImplement(i); } catch {}
        }
      } catch (e) {
        console.error("Error loading RA:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [raId]);

  const status = (ra?.status || "planejada").toLowerCase();
  const StatusIcon = STATUS_CONFIG[status]?.icon || Clock;

  const tankCapacity = implement?.tank_capacity_liters || 0;
  const litersPerHa = ra?.liters_per_ha || 1000;
  const haPerTank = tankCapacity && litersPerHa ? tankCapacity / litersPerHa : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card rounded-t-3xl z-10">
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-base">Detalhes da RA</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !ra ? (
          <p className="text-center py-12 text-muted-foreground">RA não encontrada.</p>
        ) : (
          <div className="px-5 py-4 space-y-4">
            {/* RA Code + Status */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Leaf className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-bold text-lg text-primary">{ra.code}</p>
                  {ra.type && <p className="text-xs text-muted-foreground">{ra.type}</p>}
                </div>
              </div>
              <span className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full ${STATUS_CONFIG[status]?.color || ""}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {STATUS_CONFIG[status]?.label || status}
              </span>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-2">
              {ra.orchard_code && (
                <div className="bg-muted/40 rounded-xl px-3 py-2">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase">Pomar</p>
                  <p className="text-sm font-semibold">{ra.orchard_code}{orchard?.name ? ` — ${orchard.name}` : ""}</p>
                  {orchard?.area_ha && <p className="text-[10px] text-muted-foreground">{orchard.area_ha} ha</p>}
                </div>
              )}
              {ra.date && (
                <div className="bg-muted/40 rounded-xl px-3 py-2">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase">Data prevista</p>
                  <p className="text-sm font-semibold">{new Date(ra.date + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                </div>
              )}
              {ra.liters_per_ha != null && (
                <div className="bg-muted/40 rounded-xl px-3 py-2">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase">Calda</p>
                  <p className="text-sm font-semibold">{ra.liters_per_ha} L/ha</p>
                </div>
              )}
              {tankCapacity > 0 && (
                <div className="bg-muted/40 rounded-xl px-3 py-2">
                  <p className="text-[10px] text-muted-foreground font-medium uppercase">Tanque</p>
                  <p className="text-sm font-semibold">{tankCapacity} L</p>
                </div>
              )}
            </div>

            {/* Machine + Implement */}
            {(machine?.name || implement?.name) && (
              <div className="space-y-1.5">
                {machine?.name && (
                  <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-1.5">
                    <Tractor className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground font-medium">Trator: </span>
                    <span className="text-xs font-semibold">{machine.name}</span>
                  </div>
                )}
                {implement?.name && (
                  <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-1.5">
                    <Wrench className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground font-medium">Implemento: </span>
                    <span className="text-xs font-semibold">{implement.name}</span>
                  </div>
                )}
                {implement?.marcha_trabalho && (
                  <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-1.5">
                    <span className="text-xs text-muted-foreground font-medium">Marcha: </span>
                    <span className="text-xs font-semibold">{implement.marcha_trabalho}</span>
                  </div>
                )}
                {implement?.rpm && (
                  <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-1.5">
                    <span className="text-xs text-muted-foreground font-medium">RPM: </span>
                    <span className="text-xs font-semibold">{implement.rpm}</span>
                  </div>
                )}
              </div>
            )}

            {/* Climate conditions */}
            {ra.climate_conditions && (
              <div className="flex items-start gap-2 bg-muted/40 rounded-lg px-3 py-1.5">
                <Thermometer className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs text-muted-foreground font-medium">Clima ideal: </span>
                  <span className="text-xs font-semibold">{ra.climate_conditions}</span>
                </div>
              </div>
            )}

            {/* Application observations */}
            {ra.application_observations && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Observações</p>
                <p className="text-xs text-foreground">{ra.application_observations}</p>
              </div>
            )}

            {/* Products */}
            {products.length > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="w-4 h-4 text-primary" />
                  <p className="text-xs text-muted-foreground font-semibold uppercase">Produtos</p>
                </div>
                {products.map((p, i) => {
                  const qtyPerTank = haPerTank && p.dose != null ? parseFloat((p.dose * haPerTank).toFixed(3)) : null;
                  return (
                    <div key={i} className="bg-muted/30 rounded-xl p-3 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-primary">{i + 1}.</span>
                        <span className="text-sm font-bold">{p.product_name}</span>
                      </div>
                      {(p.active_ingredient || p.target) && (
                        <p className="text-[10px] text-primary/70 font-medium pl-5">
                          {p.active_ingredient ? `P.A.: ${p.active_ingredient}` : ""}
                          {p.active_ingredient && p.target ? " · " : ""}
                          {p.target ? `Alvo: ${p.target}` : ""}
                        </p>
                      )}
                      <div className="text-xs text-muted-foreground pl-5 flex flex-wrap gap-x-3">
                        <span>{p.application_mode || "ÁREA"}</span>
                        {p.dose != null && (
                          <span>Dose: <strong className="text-foreground">{formatQtBr(p.dose)}{p.unit ? " " + p.unit : ""}{p.application_mode === "PLANTA" ? "/planta" : "/ha"}</strong></span>
                        )}
                        {p.total_quantity != null && (
                          <span>Total: <strong className="text-foreground">{formatQtBr(p.total_quantity)}{p.unit ? " " + p.unit : ""}</strong></span>
                        )}
                      </div>
                      {qtyPerTank != null && (
                        <p className="text-xs text-blue-600 font-semibold pl-5">🧴 {formatQtBr(qtyPerTank)}{p.unit ? " " + p.unit : ""} por tanque</p>
                      )}
                      {p.carencia && (
                        <p className="text-[10px] text-orange-600 font-medium pl-5">⏰ Carência: {p.carencia}</p>
                      )}
                      {p.obs && <p className="text-[10px] text-muted-foreground pl-5">{p.obs}</p>}
                    </div>
                  );
                })}
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}