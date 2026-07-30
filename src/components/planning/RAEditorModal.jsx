import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Check, Loader2, Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import RAProductRow from "./RAProductRow";

export default function RAEditorModal({ ra, onClose }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isEdit = !!ra;

  const DEFAULT_CLIMATE = "Temp: 15–30°C | Vento: 0–10 km/h | Umidade: 60–90%";

  const [form, setForm] = useState({
    code: ra?.code || "",
    date: ra?.date || "",
    type: ra?.type || "",
    orchard_code: ra?.orchard_code || "",
    status: ra?.status || "PRODUÇÃO",
    machine_id: ra?.machine_id || "",
    implement_id: ra?.implement_id || "",
    liters_per_ha: ra?.liters_per_ha ?? 1000,
    machine_config: ra?.machine_config || "",
    implement_config: ra?.implement_config || "",
    application_observations: ra?.application_observations || "",
    climate_conditions: ra?.climate_conditions || DEFAULT_CLIMATE,
    active: ra?.active ?? true,
  });

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(isEdit);

  const { data: productList = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.filter({ active: true }, "name", 500),
  });

  const { data: orchards = [] } = useQuery({
    queryKey: ["orchards"],
    queryFn: () => base44.entities.Orchard.filter({ active: true }, "sort_order", 200),
  });

  const { data: implements_ = [] } = useQuery({
    queryKey: ["implements"],
    queryFn: () => base44.entities.Implement.filter({ active: true }, "sort_order", 200),
  });

  const { data: machines = [] } = useQuery({
    queryKey: ["machines"],
    queryFn: () => base44.entities.Machine.filter({ active: true }, "sort_order", 200),
  });

  const selectedImplement = implements_.find(i => i.id === form.implement_id) || null;
  const selectedMachine = machines.find(m => m.id === form.machine_id) || null;

  const calcQtyPerTank = (dose) => {
    if (!selectedImplement?.tank_capacity_liters || !form.liters_per_ha || !dose) return null;
    const haPerTank = selectedImplement.tank_capacity_liters / form.liters_per_ha;
    return parseFloat((parseFloat(dose) * haPerTank).toFixed(3));
  };

  useEffect(() => {
    if (!isEdit) return;
    base44.entities.RecommendationProduct.filter({ recommendation_id: ra.id }, "sort_order", 100)
      .then((prods) => {
        setProducts(prods.map(p => ({
          id: p.id,
          product_name: p.product_name || "",
          active_ingredient: p.active_ingredient || "",
          target: p.target || "",
          application_mode: p.application_mode || "ÁREA",
          dose: p.dose ?? "",
          total_quantity: p.total_quantity ?? "",
          carencia: p.carencia || "",
          obs: p.obs || "",
        })));
      })
      .finally(() => setLoadingProducts(false));
  }, [ra, isEdit]);

  const selectedOrchard = orchards.find(o => o.code === form.orchard_code || o.name === form.orchard_code);
  const orchardSelectValue = selectedOrchard ? selectedOrchard.code : form.orchard_code;

  const handleProductChange = (index, updated) => {
    setProducts(prev => prev.map((p, i) => i === index ? updated : p));
  };

  const handleAddProduct = () => {
    setProducts(prev => [...prev, {
      product_name: "",
      active_ingredient: "",
      target: "",
      application_mode: "ÁREA",
      dose: "",
      total_quantity: "",
      carencia: "",
      obs: "",
    }]);
  };

  const handleRemoveProduct = (index) => {
    setProducts(prev => prev.filter((_, i) => i !== index));
  };

  const mutation = useMutation({
    mutationFn: async (data) => {
      const { products: prods, ...raFields } = data;
      let raId;
      if (isEdit) {
        await base44.entities.AgronomicRecommendation.update(ra.id, raFields);
        await base44.entities.RecommendationProduct.deleteMany({ recommendation_id: ra.id });
        raId = ra.id;
      } else {
        const newRA = await base44.entities.AgronomicRecommendation.create(raFields);
        raId = newRA.id;
      }
      if (prods.length > 0) {
        await base44.entities.RecommendationProduct.bulkCreate(
          prods.map((p, i) => ({
            recommendation_id: raId,
            product_name: p.product_name,
            active_ingredient: p.active_ingredient || "",
            target: p.target || "",
            application_mode: p.application_mode,
            dose: p.dose === "" ? null : Number(p.dose),
            total_quantity: p.total_quantity === "" ? null : Number(p.total_quantity),
            carencia: p.carencia || "",
            obs: p.obs,
            sort_order: i,
          }))
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["recommendations-active"] });
      queryClient.invalidateQueries({ queryKey: ["recommendation-products"] });
      toast({ title: isEdit ? "RA atualizada!" : "RA criada!" });
      onClose();
    },
    onError: (err) => toast({ title: "Erro", description: err.message, variant: "destructive" }),
  });

  const handleSubmit = () => {
    mutation.mutate({ ...form, products });
  };

  const canSubmit = form.code.trim() && products.length > 0 && products.every(p => p.product_name.trim() && p.application_mode);

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
          {/* General fields */}
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
              <select value={orchardSelectValue} onChange={(e) => setForm(p => ({ ...p, orchard_code: e.target.value }))} className={inputClass}>
                <option value="">Selecione...</option>
                {orchards.map(o => <option key={o.id} value={o.code}>{o.code}{o.name ? ` — ${o.name}` : ""}</option>)}
              </select>
              {!selectedOrchard && form.orchard_code && (
                <p className="text-[10px] text-amber-600">Pomar não cadastrado: "{form.orchard_code}"</p>
              )}
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <Input value={form.status} onChange={(e) => setForm(p => ({ ...p, status: e.target.value }))} className="rounded-xl" placeholder="PRODUÇÃO" />
            </div>
          </div>

          {selectedOrchard && (
            <p className="text-[10px] text-muted-foreground">
              Pomar: {selectedOrchard.area_ha ? `${selectedOrchard.area_ha} ha` : "sem área"} {selectedOrchard.plant_count ? `· ${selectedOrchard.plant_count} plantas` : ""}
            </p>
          )}

          {/* Trator + Implemento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Trator / Máquina</label>
              <select
                value={form.machine_id}
                onChange={(e) => setForm(p => ({ ...p, machine_id: e.target.value }))}
                className={inputClass}
              >
                <option value="">Nenhum</option>
                {machines.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Implemento (pulverizador)</label>
              <select
                value={form.implement_id}
                onChange={(e) => setForm(p => ({ ...p, implement_id: e.target.value }))}
                className={inputClass}
              >
                <option value="">Nenhum</option>
                {implements_.map(i => (
                  <option key={i.id} value={i.id}>
                    {i.name}{i.tank_capacity_liters ? ` (${i.tank_capacity_liters}L)` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Marcha + RPM from implement */}
          {selectedImplement && (selectedImplement.marcha_trabalho || selectedImplement.rpm) && (
            <div className="bg-muted/30 rounded-xl border border-border px-3 py-2 text-xs text-muted-foreground flex gap-4">
              {selectedImplement.marcha_trabalho && <span>⚙️ Marcha: <strong className="text-foreground">{selectedImplement.marcha_trabalho}</strong></span>}
              {selectedImplement.rpm && <span>🔄 RPM: <strong className="text-foreground">{selectedImplement.rpm}</strong></span>}
            </div>
          )}

          {/* Calda + Regulagem maquinário */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Calda (L/ha)</label>
              <Input
                type="number"
                step="1"
                value={form.liters_per_ha}
                onChange={(e) => setForm(p => ({ ...p, liters_per_ha: e.target.value === "" ? "" : Number(e.target.value) }))}
                className="rounded-xl"
                placeholder="1000"
              />
            </div>
            <div>
              <label className={labelClass}>Regulagem maquinário</label>
              <Input value={form.machine_config} onChange={(e) => setForm(p => ({ ...p, machine_config: e.target.value }))} className="rounded-xl" placeholder="Ex: Pressão 3 bar" />
            </div>
          </div>

          {selectedImplement?.tank_capacity_liters && form.liters_per_ha > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-700">
              🧴 <strong>1 tanque = {(selectedImplement.tank_capacity_liters / form.liters_per_ha).toFixed(1)} ha</strong>
              {" "}({selectedImplement.tank_capacity_liters}L ÷ {form.liters_per_ha} L/ha)
            </div>
          )}

          {/* Observações da aplicação */}
          <div>
            <label className={labelClass}>Observações da aplicação</label>
            <textarea
              value={form.application_observations}
              onChange={(e) => setForm(p => ({ ...p, application_observations: e.target.value }))}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              rows={2}
              placeholder="Ex: não aplicar com vento >10km/h, aplicar no período da manhã..."
            />
          </div>

          {/* Condições climáticas */}
          <div>
            <label className={labelClass}>Condições climáticas ideais</label>
            <Input value={form.climate_conditions} onChange={(e) => setForm(p => ({ ...p, climate_conditions: e.target.value }))} className="rounded-xl" placeholder="Temp: 15–30°C | Vento: 0–10 km/h | Umidade: 60–90%" />
          </div>

          {/* Regulagem do implemento */}
          <div>
            <label className={labelClass}>Regulagem do implemento</label>
            <Input value={form.implement_config} onChange={(e) => setForm(p => ({ ...p, implement_config: e.target.value }))} className="rounded-xl" placeholder="Ex: Largura 12m, 48 bicos" />
          </div>

          {/* Products section */}
          <div className="border-t border-border pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Produtos</span>
              <Button type="button" variant="outline" size="sm" className="rounded-lg h-8" onClick={handleAddProduct}>
                <Plus className="w-3.5 h-3.5" /> Adicionar
              </Button>
            </div>

            {loadingProducts ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : products.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">Nenhum produto adicionado. Clique em "Adicionar".</p>
            ) : (
              <div className="space-y-2">
                {products.map((p, i) => (
                  <RAProductRow
                    key={i}
                    product={p}
                    index={i}
                    products={productList}
                    orchard={selectedOrchard}
                    onChange={(updated) => handleProductChange(i, updated)}
                    onRemove={() => handleRemoveProduct(i)}
                    qtyPerTank={calcQtyPerTank(p.dose)}
                  />
                ))}
              </div>
            )}
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
