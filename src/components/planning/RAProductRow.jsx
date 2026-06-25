import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Calculator, Package } from "lucide-react";

export default function RAProductRow({ product, index, products, orchard, onChange, onRemove, qtyPerTank }) {
  const inputClass = "w-full h-9 rounded-lg border border-input bg-background px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "text-[10px] font-medium text-muted-foreground mb-0.5 block";

  const selectedProduct = products.find(p => p.name === product.product_name);

  const handleCalculate = () => {
    const dose = parseFloat(product.dose);
    if (isNaN(dose) || !orchard) return;
    let total = null;
    if (product.application_mode === "ÁREA" && orchard.area_ha) {
      total = (dose * orchard.area_ha).toFixed(2);
    } else if (product.application_mode === "PLANTA" && orchard.plant_count) {
      total = (dose * orchard.plant_count).toFixed(2);
    }
    if (total != null) onChange({ ...product, total_quantity: total });
  };

  return (
    <div className="bg-muted/30 rounded-xl border border-border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-bold">Produto {index + 1}</span>
        </div>
        <button onClick={onRemove} className="text-destructive hover:text-destructive/80 p-1">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div>
        <label className={labelClass}>Produto *</label>
        <select
          value={product.product_name}
          onChange={(e) => {
            const p = products.find(p => p.name === e.target.value);
            onChange({
              ...product,
              product_name: e.target.value,
              active_ingredient: p?.active_ingredient || "",
              target: p?.target || "",
            });
          }}
          className={inputClass}
        >
          <option value="">Selecione...</option>
          {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
        </select>
        {(product.active_ingredient || product.target || selectedProduct?.active_ingredient || selectedProduct?.target) && (
          <p className="text-[9px] text-muted-foreground mt-0.5">
            {(product.active_ingredient || selectedProduct?.active_ingredient) ? `Princípio: ${product.active_ingredient || selectedProduct?.active_ingredient}` : ""}
            {(product.target || selectedProduct?.target) ? ` · Alvo: ${product.target || selectedProduct?.target}` : ""}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className={labelClass}>Aplicação</label>
          <select
            value={product.application_mode}
            onChange={(e) => onChange({ ...product, application_mode: e.target.value })}
            className={inputClass}
          >
            <option value="ÁREA">Área</option>
            <option value="PLANTA">Planta</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Dose</label>
          <Input type="number" step="0.01" value={product.dose} onChange={(e) => onChange({ ...product, dose: e.target.value })} className="rounded-lg h-9" placeholder="0.0" />
        </div>
        <div>
          <label className={labelClass}>Qtd. Total</label>
          <div className="flex gap-1">
            <Input type="number" step="0.01" value={product.total_quantity} onChange={(e) => onChange({ ...product, total_quantity: e.target.value })} className="rounded-lg h-9" placeholder="0.0" />
            <Button type="button" variant="outline" size="icon" className="shrink-0 h-9 w-9" onClick={handleCalculate} title="Calcular">
              <Calculator className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {qtyPerTank != null && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5 text-xs text-blue-700">
          🧴 <strong>{qtyPerTank}</strong> por tanque
        </div>
      )}

      <div>
        <label className={labelClass}>Obs.</label>
        <Input value={product.obs} onChange={(e) => onChange({ ...product, obs: e.target.value })} className="rounded-lg h-9" placeholder="..." />
      </div>
    </div>
  );
}