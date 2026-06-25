import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, GripVertical, Pencil, Check, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function OrchardsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newArea, setNewArea] = useState("");
  const [newPlants, setNewPlants] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editArea, setEditArea] = useState("");
  const [editPlants, setEditPlants] = useState("");

  const { data: orchards = [], isLoading } = useQuery({
    queryKey: ["orchards-admin"],
    queryFn: () => base44.entities.Orchard.list("sort_order", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Orchard.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orchards-admin"] });
      queryClient.invalidateQueries({ queryKey: ["orchards"] });
      setNewCode("");
      setNewName("");
      setNewArea("");
      setNewPlants("");
      toast({ title: "Pomar adicionado!" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => base44.entities.Orchard.update(id, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orchards-admin"] });
      queryClient.invalidateQueries({ queryKey: ["orchards"] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Orchard.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orchards-admin"] });
      queryClient.invalidateQueries({ queryKey: ["orchards"] });
      setEditingId(null);
      toast({ title: "Pomar atualizado!" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Orchard.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orchards-admin"] });
      queryClient.invalidateQueries({ queryKey: ["orchards"] });
      toast({ title: "Pomar removido!" });
    },
  });

  const startEdit = (orchard) => {
    setEditingId(orchard.id);
    setEditCode(orchard.code);
    setEditName(orchard.name || "");
    setEditArea(orchard.area_ha?.toString() || "");
    setEditPlants(orchard.plant_count?.toString() || "");
  };

  const handleSaveEdit = (id) => {
    if (!editCode.trim()) return;
    updateMutation.mutate({ id, data: {
      code: editCode.trim().toUpperCase(),
      name: editName.trim(),
      area_ha: editArea === "" ? null : Number(editArea),
      plant_count: editPlants === "" ? null : Number(editPlants),
    }});
  };

  const handleAdd = () => {
    if (!newCode.trim()) return;
    createMutation.mutate({
      code: newCode.trim().toUpperCase(),
      name: newName.trim(),
      area_ha: newArea === "" ? null : Number(newArea),
      plant_count: newPlants === "" ? null : Number(newPlants),
      active: true,
      sort_order: orchards.length + 1,
    });
  };

  return (
    <div className="space-y-5">
      {/* Add Form */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <h3 className="font-semibold text-sm">Novo Pomar</h3>
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Código (ex: P21)"
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            className="rounded-xl"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Input
            placeholder="Nome/descrição"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="rounded-xl"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            type="number"
            step="0.01"
            placeholder="Área (ha)"
            value={newArea}
            onChange={(e) => setNewArea(e.target.value)}
            className="rounded-xl"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Input
            type="number"
            placeholder="Nº de plantas"
            value={newPlants}
            onChange={(e) => setNewPlants(e.target.value)}
            className="rounded-xl"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
        </div>
        <Button onClick={handleAdd} disabled={!newCode.trim() || createMutation.isPending} className="w-full rounded-xl">
          <Plus className="w-4 h-4" /> Adicionar Pomar
        </Button>
      </div>

      {/* List */}
      <div className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
        ) : orchards.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum pomar cadastrado. Adicione acima.</p>
        ) : (
          orchards.map((orchard) => (
            <div key={orchard.id} className="bg-card rounded-xl border border-border px-4 py-3 flex items-center gap-3">
              <GripVertical className="w-4 h-4 text-muted-foreground shrink-0" />

              {editingId === orchard.id ? (
                <>
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <Input
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value)}
                      className="h-8 text-sm font-bold rounded-lg"
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(orchard.id)}
                    />
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nome/descrição"
                      className="h-8 text-sm rounded-lg"
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(orchard.id)}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      value={editArea}
                      onChange={(e) => setEditArea(e.target.value)}
                      placeholder="Área (ha)"
                      className="h-8 text-sm rounded-lg"
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(orchard.id)}
                    />
                    <Input
                      type="number"
                      value={editPlants}
                      onChange={(e) => setEditPlants(e.target.value)}
                      placeholder="Nº de plantas"
                      className="h-8 text-sm rounded-lg"
                      onKeyDown={(e) => e.key === "Enter" && handleSaveEdit(orchard.id)}
                    />
                  </div>
                  <Button size="icon" variant="ghost" className="text-primary hover:bg-primary/10 shrink-0 h-8 w-8" onClick={() => handleSaveEdit(orchard.id)} disabled={updateMutation.isPending}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="text-muted-foreground shrink-0 h-8 w-8" onClick={() => setEditingId(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </>
              ) : (
                <>
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm shrink-0
                    ${orchard.active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {orchard.code}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{orchard.code}</p>
                    {orchard.name && <p className="text-xs text-muted-foreground truncate">{orchard.name}</p>}
                    <p className="text-[10px] text-muted-foreground/70">
                      {orchard.area_ha ? `${orchard.area_ha} ha` : ""}
                      {orchard.area_ha && orchard.plant_count ? " · " : ""}
                      {orchard.plant_count ? `${orchard.plant_count} plantas` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleMutation.mutate({ id: orchard.id, active: !orchard.active })}
                    className={`text-xs font-semibold px-3 py-1 rounded-full transition-colors
                      ${orchard.active
                        ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700"
                        : "bg-muted text-muted-foreground hover:bg-green-100 hover:text-green-700"
                      }`}
                  >
                    {orchard.active ? "Ativo" : "Inativo"}
                  </button>
                  <Button variant="ghost" size="icon" onClick={() => startEdit(orchard)} className="text-muted-foreground hover:text-foreground shrink-0">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(orchard.id)} className="text-destructive hover:bg-destructive/10 shrink-0">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}