import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Loader2, ToggleLeft, ToggleRight, Pencil, Check, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const CATEGORIES = ["Irrigação", "Poda", "Colheita", "Adubação", "Fitossanidade", "Mecanização", "Outros"];

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
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editingCategoryValue, setEditingCategoryValue] = useState("");

  const { data: operations = [], isLoading } = useQuery({
    queryKey: ["operations"],
    queryFn: () => base44.entities.Operation.list("sort_order"),
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

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, category }) => base44.entities.Operation.update(id, { category }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operations"] });
      setEditingCategoryId(null);
      toast({ title: "Categoria atualizada!" });
    },
  });

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
            {CATEGORIES.map((cat) => (
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
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${op.color} flex items-center justify-center shrink-0`}>
                <span className="text-white text-xs font-bold">{op.code}</span>
              </div>
              <span className={`flex-1 font-medium text-sm ${!op.active ? "line-through text-muted-foreground" : ""}`}>
                {op.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleMutation.mutate({ id: op.id, active: op.active })}
                className={op.active ? "text-primary" : "text-muted-foreground"}
                title={op.active ? "Desativar" : "Ativar"}
              >
                {op.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteMutation.mutate(op.id)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            {/* Category row */}
            {editingCategoryId === op.id ? (
              <div className="flex flex-wrap gap-1.5 items-center pl-12">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setEditingCategoryValue(cat)}
                    className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all
                      ${editingCategoryValue === cat
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/50 text-muted-foreground border-border hover:border-primary/40"}`}
                  >
                    {cat}
                  </button>
                ))}
                <Button size="icon" className="w-7 h-7 rounded-full" onClick={() => updateCategoryMutation.mutate({ id: op.id, category: editingCategoryValue })}>
                  {updateCategoryMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                </Button>
                <Button size="icon" variant="ghost" className="w-7 h-7 rounded-full" onClick={() => setEditingCategoryId(null)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2 pl-12">
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${op.category ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {op.category || "Sem categoria"}
                </span>
                <button
                  onClick={() => { setEditingCategoryId(op.id); setEditingCategoryValue(op.category || ""); }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}