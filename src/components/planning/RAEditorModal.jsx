import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Check, Loader2, Calculator } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function RAEditorModal({ ra, onClose }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!ra;

  const [form, setForm] = useState({
    code: ra?.code || "",
    date: ra?.date || "",
    type: ra?.type || "",
    orchard_code: ra?.orchard_code || "",
    status: ra?.status || "PRODUÇÃO",
    product_name: ra?.product_name || "",
    application_mode: ra?.application_mode || "ÁREA",
    dose: ra?.dose ?? "",
    total_quantity: ra?.total_quantity ?? "",
    obs: ra?.obs || "",
    machine_config: ra?.machine_config || "",
    implement_config: ra?.implement_config || "",
    climate_conditions: ra?.climate_conditions || "",
    value: ra?.value ?? "",
    cost_per_ha: ra?.cost_per_ha ?? "",
    purchase_date: ra?.purchase_date || "",
    active: ra?.active ?? true,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.filter({ active: true }, "name", 500),
  });

  const { data: orchards = [] } = useQuery({
    queryKey: ["orchards"],
    queryFn: () => base44.entities.Orchard.filter({ active: true }, "sort_order", 200),
  });

  const selectedProduct = products.find(p => p.name === form.product_name);
  const selectedOrchard = orchards.find(o => o.code === form.orchard_code);

  // Auto-fill dose and climate from product
  const handleProductChange = (productName) => {
    const product = products.find(p => p.name === productName);
    setForm(prev => ({
      ...prev,
      product_name: productName,
      dose: product
        ? (prev.application_mode === "ÁREA" ? product.recommended_dose_area : product.recommended_dose_plant) || prev.dose
        : prev.dose,
      climate_conditions: product
        ? buildClimateString(product)
        : prev.climate_conditions,
    }));
  };

  const buildClimateString = (p) => {
    const parts = [];
    if (p.ideal_temp_min != null && p.ideal_temp_max != null)
      parts.push(`Temp: ${p.ideal_temp_min}–${p.ideal_temp_max}°C`);
    if (p.ideal_wind_min != null && p.ideal_wind_max != null)
      parts.push(`Vento: ${p.ideal_wind_min}–${p.ideal_wind_max} km/h`);
    if (p.ideal_humidity_min != null && p.ideal_humidity_max != null)
      parts.push(`Umidade: ${p.ideal_humidity_min}–${p.ideal_humidity_max}%`);
    return parts.join(" | ");
  };

  // Auto-calculate total_quantity
  const handleCalculate = () => {
    const dose = parseFloat(form.dose);
    if (isNaN(dose) || !selectedOrchard) return;
    if (form.application_mode === "ÁREA" && selectedOrchard.area_ha) {
      setForm(prev => ({ ...prev, total_quantity: (dose * selectedOrchard.area_ha).toFixed(2) }));
    } else if (form.application_mode === "PLANTA" && selectedOrchard.plant_count) {
      setForm(prev => ({ ...prev, total_quantity: (dose * selectedOrchard.plant_count).toFixed(2) }));
    }
  };

  const mutation = useMutation({
    mutationFn: (data) => isEdit
      ? base44.entities.AgronomicRecommendation.update(ra.id, data)
      : base44.entities.AgronomicRecommendation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["recommendations-active"] });
      toast({ title: isEdit ? "RA atualizada!" : "RA criada!" });
      onClose();
    },
    onError: (err) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const handleSubmit = () => {
    const data = {
      ...form,
      dose: form.dose === "" ? null : Number(form.dose),
      total_quantity: form.total_quantity === "" ? null : Number(form.total_quantity),
      value: form.value === "" ? null : Number(form.value),
      cost_per_ha: form.cost_per_ha === "" ? null : Number(form.cost_per_ha),
    };
    mutation.mutate(data);
  };

  const canSubmit = form.code.trim() && form.product_name.trim() && form.application_mode;

  const inputClass = "w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "text-xs font-medium text-muted-foreground mb-1 block";

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card rounded-t-3xl z-10">
          <h2 className="font-bold text-base">{isEdit ? "Editar RA" : "Nova RA"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Código RA *</label>
              <Input value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))} className="rounded-xl" placeholder="PER1FERTI" />
            </div>
            <div>
              <label className={labelClass}>Data prevista</label>
              <Input type="date" value={form.date} onChange={(e) => setForm(p => ({ ...p, date: e.target.value }))} className="rounded-xl" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Tipo</label>
            <Input value={form.type} onChange={(e) => setForm(p => ({ ...p, type: e.target.value }))} className="rounded-xl" placeholder="FERTIADUBAÇÃO" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Pomar</label>
              <select value={form.orchard_code} onChange={(e) => setForm(p => ({ ...p, orchard_code: e.target.value }))} className={inputClass}>
                <option value="">Selecione...</option>
                {orchards.map(o => <option key={o.id} value={o.code}>{o.code}{o.name ? ` — ${o.name}` : ""}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <Input value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))} className="rounded-xl" placeholder="PRODUÇÃO" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Produto *</label>
            <select value={form.product_name} onChange={(e) => handleProductChange(e.target.value)} className={inputClass}>
              <option value="">Selecione...</option>
              {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
            {selectedProduct && (
              <p className="text-[10px] text-muted-foreground mt-1">
                {selectedProduct.active_ingredient ? `Princípio: ${selectedProduct.active_ingredient}` : ""}
                {selectedProduct.target ? ` · Alvo: ${selectedProduct.target}` : ""}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Aplicação *</label>
              <select value={form.application_mode} onChange={(e) => setForm(p => ({ ...p, application_mode: e.target.value }))} className={inputClass}>
                <option value="ÁREA">Por Área (ha)</option>
                <option value="PLANTA">Por Planta</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Dose</label>
              <Input type="number" step="0.01" value={form.dose} onChange={(e) => setForm(p => ({ ...p, dose: e.target.value }))} className="rounded-xl" placeholder="0.0" />
            </div>
            <div>
              <label className={labelClass}>Qtd. Total</label>
              <div className="flex gap-1">
                <Input type="number" step="0.01" value={form.total_quantity} onChange={(e) => setForm(p => ({ ...p, total_quantity: e.target.value }))} className="rounded-xl" placeholder="0.0" />
                <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={handleCalculate} title="Calcular automaticamente">
                  <Calculator className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {selectedOrchard && (
            <p className="text-[10px] text-muted-foreground">
              Pomar: {selectedOrchard.area_ha ? `${selectedOrchard.area_ha} ha` : "sem área"} {selectedOrchard.plant_count ? `· ${selectedOrchard.plant_count} plantas` : ""}
            </p>
          )}

          <div>
            <label className={labelClass}>Condições climáticas ideais</label>
            <Input value={form.climate_conditions} onChange={(e) => setForm(p => ({ ...p, climate_conditions: e.target.value }))} className="rounded-xl" placeholder="Temp: 15-30°C | Vento: 3-10 km/h | Umidade: 60-90%" />
          </div>

          <div>
            <label className={labelClass}>Regulagem do maquinário</label>
            <Input value={form.machine_config} onChange={(e) => setForm(p => ({ ...p, machine_config: e.target.value }))} className="rounded-xl" placeholder="Ex: Pressão 3 bar, bicos XR 11002" />
          </div>

          <div>
            <label className={labelClass}>Regulagem do implemento</label>
            <Input value={form.implement_config} onChange={(e) => setForm(p => ({ ...p, implement_config: e.target.value }))} className="rounded-xl" placeholder="Ex: Largura 12m, 48 bicos" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Valor (R$)</label>
              <Input type="number" step="0.01" value={form.value} onChange={(e) => setForm(p => ({ ...p, value: e.target.value }))} className="rounded-xl" placeholder="0.00" />
            </div>
            <div>
              <label className={labelClass}>Custo/ha (R$)</label>
              <Input type="number" step="0.01" value={form.cost_per_ha} onChange={(e) => setForm(p => ({ ...p, cost_per_ha: e.target.value }))} className="rounded-xl" placeholder="0.00" />
            </div>
            <div>
              <label className={labelClass}>Compra prevista</label>
              <Input type="date" value={form.purchase_date} onChange={(e) => setForm(p => ({ ...p, purchase_date: e.target.value }))} className="rounded-xl" />
            </div>
          </div>

          <div>
            <label className={labelClass}>Observações</label>
            <textarea value={form.obs} onChange={(e) => setForm(p => ({ ...p, obs: e.target.value }))} rows={2} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Observações adicionais..." />
          </div>

          <div className="flex gap-2 pt-2 pb-2">
            <Button variant="outline" className="flex-1 rounded-xl h-12" onClick={onClose}>
              <X className="w-4 h-4" /> Cancelar
            </Button>
            <Button className="flex-1 rounded-xl h-12" disabled={!canSubmit || mutation.isPending} onClick={handleSubmit}>
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isEdit ? "Salvar" : "Criar RA"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}