import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Pencil, Check, X, Loader2, FlaskConical } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function ProductsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("-created_date", 500),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Product.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setShowForm(false);
      toast({ title: "Produto criado!" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Product.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setEditingId(null);
      toast({ title: "Produto atualizado!" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Product.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Produto removido!" });
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {!showForm ? (
        <Button onClick={() => setShowForm(true)} className="w-full rounded-xl h-10">
          <Plus className="w-4 h-4" /> Novo Produto
        </Button>
      ) : (
        <ProductForm
          onSave={(data) => createMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
          saving={createMutation.isPending}
        />
      )}

      <div className="space-y-2">
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum produto cadastrado.</p>
        ) : (
          products.map((product) => (
            <div key={product.id}>
              {editingId === product.id ? (
                <ProductForm
                  product={product}
                  onSave={(data) => updateMutation.mutate({ id: product.id, data })}
                  onCancel={() => setEditingId(null)}
                  saving={updateMutation.isPending}
                />
              ) : (
                <div className="bg-card rounded-xl border border-border px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FlaskConical className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {product.active_ingredient ? `Princípio: ${product.active_ingredient}` : ""}
                        {product.target ? ` · Alvo: ${product.target}` : ""}
                      </p>
                    </div>
                    <button onClick={() => setEditingId(product.id)} className="text-muted-foreground hover:text-foreground p-1">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => deleteMutation.mutate(product.id)} className="text-destructive hover:text-destructive/80 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ProductForm({ product, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    name: product?.name || "",
    active_ingredient: product?.active_ingredient || "",
    target: product?.target || "",
    recommended_dose_area: product?.recommended_dose_area ?? "",
    recommended_dose_plant: product?.recommended_dose_plant ?? "",
    active: product?.active ?? true,
  });

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    const data = {
      ...form,
      recommended_dose_area: form.recommended_dose_area === "" ? null : Number(form.recommended_dose_area),
      recommended_dose_plant: form.recommended_dose_plant === "" ? null : Number(form.recommended_dose_plant),
    };
    onSave(data);
  };

  const inputClass = "w-full h-10 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const labelClass = "text-xs font-medium text-muted-foreground mb-1 block";

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <div>
        <label className={labelClass}>Nome do produto *</label>
        <Input value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} className="rounded-xl" placeholder="Ex: BOROPLUS" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Princípio ativo</label>
          <Input value={form.active_ingredient} onChange={(e) => setForm(p => ({ ...p, active_ingredient: e.target.value }))} className="rounded-xl" />
        </div>
        <div>
          <label className={labelClass}>Alvo</label>
          <Input value={form.target} onChange={(e) => setForm(p => ({ ...p, target: e.target.value }))} className="rounded-xl" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Dose/ha</label>
          <Input type="number" step="0.01" value={form.recommended_dose_area} onChange={(e) => setForm(p => ({ ...p, recommended_dose_area: e.target.value }))} className="rounded-xl" placeholder="0.0" />
        </div>
        <div>
          <label className={labelClass}>Dose/planta</label>
          <Input type="number" step="0.01" value={form.recommended_dose_plant} onChange={(e) => setForm(p => ({ ...p, recommended_dose_plant: e.target.value }))} className="rounded-xl" placeholder="0.0" />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button variant="outline" className="flex-1 rounded-xl" onClick={onCancel}>
          <X className="w-4 h-4" /> Cancelar
        </Button>
        <Button className="flex-1 rounded-xl" disabled={!form.name.trim() || saving} onClick={handleSubmit}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}