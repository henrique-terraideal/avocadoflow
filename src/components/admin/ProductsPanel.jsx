import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Pencil, Check, X, Loader2, FlaskConical, Search } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const normalize = (str) => {
  if (!str) return "";
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export default function ProductsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: () => base44.entities.Product.list("-created_date", 500),
  });

  const filteredProducts = useMemo(() => {
    if (!search.trim()) return products;
    const s = normalize(search);
    return products.filter(p =>
      normalize(p.name).includes(s) ||
      normalize(p.active_ingredient).includes(s) ||
      normalize(p.target).includes(s)
    );
  }, [products, search]);

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

      {/* Barra de busca */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm space-y-1.5">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, P.A. ou alvo..."
            className="pl-9 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {products.length > 0 && (
          <p className="text-xs text-muted-foreground px-1">
            {filteredProducts.length === products.length
              ? `${products.length} produto(s)`
              : `${filteredProducts.length} de ${products.length} produto(s)`}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum produto cadastrado.</p>
        ) : filteredProducts.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum produto encontrado.</p>
        ) : (
          filteredProducts.map((product) => (
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
    active: product?.active ?? true,
  });

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    onSave(form);
  };

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