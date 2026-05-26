import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Loader2, ToggleLeft, ToggleRight, Pencil, Check, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const DEFAULT_CATEGORIES = ["Irrigação", "Poda", "Colheita", "Adubação", "Fitossanidade", "Mecanização", "Outros"];

const COLOR_OPTIONS = [
  "bg-green-500", "bg-emerald-500", "bg-teal-500", "bg-cyan-500",
  "bg-blue-500", "bg-indigo-500", "bg-violet-500", "bg-purple-500",
  "bg-pink-500", "bg-red-500", "bg-rose-500", "bg-orange-500",
  "bg-amber-500", "bg-yellow-500", "bg-lime-500", "bg-slate-500",
];

// Default operations to seed if DB is empty
const DEFAULT_OPERATIONS = [
  { code: "01", name: "Roçada", color: "bg-green-500", sort_order: 1, active: true },
  { code: "02", name: "Adubação", color: "bg-amber-500", sort_order: 2, active: true },
  { code: "03", name: "Herbicida", color: "bg-yellow-600", sort_order: 3, active: true },
  { code: "04", name: "Controle de Pragas", color: "bg-red-500", sort_order: 4, active: true },
  { code: "05", name: "Plantio e Replantio", color: "bg-emerald-500", sort_order: 5, active: true },
  { code: "06", name: "Aplicação de Ferti", color: "bg-purple-500", sort_order: 6, active: true },
  { code: "07", name: "Poda, Desbrota e Condução", color: "bg-green-700", sort_order: 7, active: true },
  { code: "08", name: "Manutenção e Limpeza de Máquinas", color: "bg-slate-500", sort_order: 8, active: true },
  { code: "09", name: "Manutenção Centro de Serviço", color: "bg-slate-600", sort_order: 9, active: true },
  { code: "10", name: "Drench", color: "bg-blue-500", sort_order: 10, active: true },
  { code: "11", name: "Inspeção Manutenção de Irrigação", color: "bg-blue-600", sort_order: 11, active: true },
  { code: "12", name: "Motosserra", color: "bg-orange-600", sort_order: 12, active: true },
  { code: "13", name: "Capacitação e Treinamento", color: "bg-indigo-500", sort_order: 13, active: true },
  { code: "14", name: "Colheita", color: "bg-red-600", sort_order: 14, active: true },
  { code: "15", name: "Fator Climático", color: "bg-sky-500", sort_order: 15, active: true },
  { code: "16", name: "Limpeza de Pomar", color: "bg-teal-500", sort_order: 16, active: true },
  { code: "17", name: "Coleta de Amostras e Dados", color: "bg-violet-500", sort_order: 17, active: true },
  { code: "18", name: "Lavagem e Lubrificação", color: "bg-cyan-600", sort_order: 18, active: true },
  { code: "19", name: "Inspeção de Pragas e Doenças", color: "bg-rose-500", sort_order: 19, active: true },
];

export default function OperationsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newColor, setNewColor] = useState("bg-green-500");
  const [newCategory, setNewCategory] = useState("");
  const [seeding, setSeeding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingFields, setEditingFields] = useState({});
  const [editingCatId, setEditingCatId] = useState(null);
  const [editingCatName, setEditingCatName] = useState("");
  const [newCatName, setNewCatName] = useState("");

  const { data: operations = [], isLoading } = useQuery({
    queryKey: ["operations"],
    queryFn: () => base44.entities.Operation.list("sort_order"),
  });

  const { data: categoryConfig } = useQuery({
    queryKey: ["appconfig-categories"],
    queryFn: async () => {
      const results = await base44.entities.AppConfig.filter({ key: "operation_categories" });
      return results[0] || null;
    },
  });

  const categories = categoryConfig
    ? JSON.parse(categoryConfig.value)
    : DEFAULT_CATEGORIES;

  const saveCategoriesMutation = useMutation({
    mutationFn: async (newList) => {
      const value = JSON.stringify(newList);
      if (categoryConfig?.id) {
        return base44.entities.AppConfig.update(categoryConfig.id, { value });
      } else {
        return base44.entities.AppConfig.create({ key: "operation_categories", value });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["appconfig-categories"] }),
  });

  // Seed defaults if empty
  useEffect(() => {
    if (!isLoading && operations.length === 0) {
      setSeeding(true);
      base44.entities.Operation.bulkCreate(DEFAULT_OPERATIONS)
        .then(() => queryClient.invalidateQueries({ queryKey: ["operations"] }))
        .finally(() => setSeeding(false));
    }
  }, [isLoading, operations.length]);

  const createMutation = useMutation({
    mutationFn: () => base44.entities.Operation.create({
      code: newCode.trim() || String(operations.length + 1).padStart(2, "0"),
      name: newName.trim(),
      color: newColor,
      category: newCategory || undefined,
      active: true,
      sort_order: operations.length + 1,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operations"] });
      setNewName("");
      setNewCode("");
      setNewCategory("");
      toast({ title: "Operação adicionada!" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Operation.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operations"] });
      setEditingId(null);
      toast({ title: "Operação atualizada!" });
    },
  });

  const startEdit = (op) => {
    setEditingId(op.id);
    setEditingFields({ name: op.name, code: op.code, color: op.color || "bg-green-500", category: op.category || "" });
  };

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => base44.entities.Operation.update(id, { active: !active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["operations"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Operation.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operations"] });
      toast({ title: "Operação removida" });
    },
  });

  if (isLoading || seeding) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Add new operation */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <h3 className="font-bold text-base">Nova Operação</h3>
        <div className="flex gap-3">
          <Input
            placeholder="Código (ex: 20)"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            className="h-12 rounded-xl w-28"
          />
          <Input
            placeholder="Nome da operação"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="h-12 rounded-xl flex-1"
          />
        </div>
        {/* Color picker */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Cor</p>
          <div className="flex flex-wrap gap-2">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className={`w-7 h-7 rounded-full ${c} transition-transform ${newColor === c ? "ring-2 ring-offset-2 ring-primary scale-110" : ""}`}
              />
            ))}
          </div>
        </div>
        {/* Category picker */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Macrocategoria</p>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setNewCategory(newCategory === cat ? "" : cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all
                  ${newCategory === cat
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40"}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
        <Button
          onClick={() => createMutation.mutate()}
          disabled={!newName.trim() || createMutation.isPending}
          className="h-12 rounded-xl w-full"
        >
          {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Adicionar Operação
        </Button>
      </div>

      {/* Manage categories */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
        <h3 className="font-bold text-base">Macrocategorias</h3>
        <div className="space-y-2">
          {categories.map((cat, idx) => (
            <div key={idx} className="flex items-center gap-2">
              {editingCatId === idx ? (
                <>
                  <Input
                    value={editingCatName}
                    onChange={(e) => setEditingCatName(e.target.value)}
                    className="h-8 rounded-lg flex-1 text-sm"
                    autoFocus
                  />
                  <Button size="icon" className="w-8 h-8 rounded-lg shrink-0"
                    disabled={!editingCatName.trim()}
                    onClick={() => {
                      const updated = categories.map((c, i) => i === idx ? editingCatName.trim() : c);
                      saveCategoriesMutation.mutate(updated);
                      setEditingCatId(null);
                    }}>
                    <Check className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="w-8 h-8 rounded-lg shrink-0" onClick={() => setEditingCatId(null)}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm px-3 py-1.5 bg-muted/50 rounded-lg">{cat}</span>
                  <Button size="icon" variant="ghost" className="w-8 h-8 rounded-lg shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => { setEditingCatId(idx); setEditingCatName(cat); }}>
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="w-8 h-8 rounded-lg shrink-0 text-destructive hover:bg-destructive/10"
                    onClick={() => saveCategoriesMutation.mutate(categories.filter((_, i) => i !== idx))}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
        {/* Add new category */}
        <div className="flex gap-2 pt-1">
          <Input
            placeholder="Nova macrocategoria..."
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            className="h-9 rounded-xl flex-1 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && newCatName.trim()) {
                saveCategoriesMutation.mutate([...categories, newCatName.trim()]);
                setNewCatName("");
              }
            }}
          />
          <Button size="sm" className="rounded-xl h-9 px-3"
            disabled={!newCatName.trim() || saveCategoriesMutation.isPending}
            onClick={() => {
              saveCategoriesMutation.mutate([...categories, newCatName.trim()]);
              setNewCatName("");
            }}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Operations list */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {operations.filter(o => o.active).length} ativas · {operations.filter(o => !o.active).length} inativas
        </p>
        {operations.map((op) => (
          <div
            key={op.id}
            className={`bg-card rounded-xl border p-4 flex flex-col gap-2 transition-opacity ${op.active ? "border-border" : "border-border/50 opacity-60"}`}
          >
            {/* Row principal */}
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${op.color || "bg-primary"} flex items-center justify-center shrink-0`}>
                <span className="text-white text-xs font-bold">{op.code}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-medium text-sm truncate ${!op.active ? "line-through text-muted-foreground" : ""}`}>{op.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${op.category ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {op.category || "Sem categoria"}
                </span>
              </div>
              <Button variant="ghost" size="icon" onClick={() => editingId === op.id ? setEditingId(null) : startEdit(op)} className="text-muted-foreground hover:text-foreground">
                <Pencil className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => toggleMutation.mutate({ id: op.id, active: op.active })} className={op.active ? "text-primary" : "text-muted-foreground"} title={op.active ? "Desativar" : "Ativar"}>
                {op.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(op.id)} className="text-destructive hover:bg-destructive/10">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Formulário de edição inline */}
            {editingId === op.id && (
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex gap-2">
                  <Input value={editingFields.code} onChange={(e) => setEditingFields(f => ({ ...f, code: e.target.value }))} placeholder="Código" className="h-9 rounded-xl w-20" />
                  <Input value={editingFields.name} onChange={(e) => setEditingFields(f => ({ ...f, name: e.target.value }))} placeholder="Nome" className="h-9 rounded-xl flex-1" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5 font-semibold uppercase tracking-wide">Cor</p>
                  <div className="flex flex-wrap gap-1.5">
                    {COLOR_OPTIONS.map((c) => (
                      <button key={c} onClick={() => setEditingFields(f => ({ ...f, color: c }))}
                        className={`w-6 h-6 rounded-full ${c} transition-transform ${editingFields.color === c ? "ring-2 ring-offset-1 ring-primary scale-110" : ""}`} />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1.5 font-semibold uppercase tracking-wide">Macrocategoria</p>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((cat) => (
                      <button key={cat} onClick={() => setEditingFields(f => ({ ...f, category: f.category === cat ? "" : cat }))}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all
                          ${editingFields.category === cat ? "bg-primary text-primary-foreground border-primary" : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40"}`}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 rounded-xl" disabled={!editingFields.name?.trim() || updateMutation.isPending}
                    onClick={() => updateMutation.mutate({ id: op.id, data: { name: editingFields.name.trim(), code: editingFields.code.trim(), color: editingFields.color, category: editingFields.category || undefined } })}>
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Salvar
                  </Button>
                  <Button size="sm" variant="outline" className="rounded-xl" onClick={() => setEditingId(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}