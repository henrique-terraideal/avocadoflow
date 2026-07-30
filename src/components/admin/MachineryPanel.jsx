import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Loader2, Pencil, X, Check, Tractor, Wrench, ChevronDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function MachineryPanel() {
  const [tab, setTab] = useState("machine");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setTab("machine")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm border-2 transition-all
            ${tab === "machine" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}
        >
          <Tractor className="w-4 h-4" />
          Tratores
        </button>
        <button
          onClick={() => setTab("implement")}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-medium text-sm border-2 transition-all
            ${tab === "implement" ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}
        >
          <Wrench className="w-4 h-4" />
          Implementos
        </button>
      </div>
      {tab === "machine"
        ? <MachineryList entityName="Machine" label="Trator" queryKey="machines" />
        : <MachineryList entityName="Implement" label="Implemento" queryKey="implements" />}
    </div>
  );
}

function MachineryList({ entityName, label, queryKey }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(null);

  const { data: items = [], isLoading } = useQuery({
    queryKey: [queryKey],
    queryFn: () => base44.entities[entityName].filter({}, "sort_order", 200),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities[entityName].delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast({ title: `${label} removido` });
    },
  });

  if (editing) {
    return (
      <MachineryForm
        entityName={entityName}
        label={label}
        queryKey={queryKey}
        item={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="space-y-2">
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">Nenhum {label.toLowerCase()} cadastrado.</p>
          <p className="text-xs text-muted-foreground/70 mt-1">Adicione o primeiro abaixo.</p>
        </div>
      ) : (
        items.map((item) => (
          <MachineryCard key={item.id} item={item} label={label} entityName={entityName} onEdit={() => setEditing(item)} onDelete={() => deleteMutation.mutate(item.id)} />
        ))
      )}
      <Button className="w-full rounded-xl h-10 mt-2" onClick={() => setEditing("new")}>
        <Plus className="w-4 h-4" />
        Adicionar {label}
      </Button>
    </div>
  );
}

function MachineryCard({ item, label, entityName, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const isImplement = entityName === "Implement";
  let specs = [];
  try { specs = item.specs ? JSON.parse(item.specs) : []; } catch {}

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm truncate">{item.name}</p>
            {item.tank_capacity_liters && (
              <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium shrink-0">{item.tank_capacity_liters}L</span>
            )}
            {isImplement && item.marcha_trabalho && (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium shrink-0">⚙️ {item.marcha_trabalho}</span>
            )}
            {isImplement && item.rpm && (
              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium shrink-0">🔄 {item.rpm} RPM</span>
            )}
            {!item.active && <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">Inativo</span>}
          </div>
          {specs.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {specs.map(s => `${s.label}: ${s.value}`).join(" · ")}
            </p>
          )}
        </div>
        <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground p-1.5 hover:text-foreground">
          <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        <button onClick={onEdit} className="text-muted-foreground hover:text-foreground p-1.5">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={onDelete} className="text-destructive hover:text-destructive/80 p-1.5">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      {expanded && (
        <div className="px-4 pb-3 space-y-3 border-t border-border pt-3">
          {isImplement && (item.marcha_trabalho || item.rpm) && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Regulagem Padrão de Trabalho</p>
              <div className="flex gap-4 text-sm">
                {item.marcha_trabalho && (
                  <div><span className="text-muted-foreground">Marcha: </span><strong>{item.marcha_trabalho}</strong></div>
                )}
                {item.rpm && (
                  <div><span className="text-muted-foreground">RPM: </span><strong>{item.rpm}</strong></div>
                )}
              </div>
            </div>
          )}
          {item.adjustment_standard && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Padrão de Regulagem e Calibração</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{item.adjustment_standard}</p>
            </div>
          )}
          {specs.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Especificações Técnicas</p>
              <div className="space-y-1">
                {specs.map((s, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{s.label}</span>
                    <span className="font-medium text-foreground">{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MachineryForm({ entityName, label, queryKey, item, onClose }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState(item?.name || "");
  const [tankCapacity, setTankCapacity] = useState(item?.tank_capacity_liters ?? "");
  const [marchaTrabalho, setMarchaTrabalho] = useState(item?.marcha_trabalho || "");
  const [rpm, setRpm] = useState(item?.rpm ?? "");
  const [adjustmentStandard, setAdjustmentStandard] = useState(item?.adjustment_standard || "");
  const [specs, setSpecs] = useState(() => {
    try { return item?.specs ? JSON.parse(item.specs) : []; } catch { return []; }
  });
  const [active, setActive] = useState(item?.active !== false);
  const [saving, setSaving] = useState(false);

  const isImplement = entityName === "Implement";

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const cleanSpecs = specs.filter(s => s.label.trim());
    const data = {
      name: name.trim(),
      adjustment_standard: adjustmentStandard.trim(),
      specs: cleanSpecs.length > 0 ? JSON.stringify(cleanSpecs) : "",
      active,
      sort_order: item?.sort_order || 0,
      ...(isImplement && {
        tank_capacity_liters: tankCapacity === "" ? null : Number(tankCapacity),
        marcha_trabalho: marchaTrabalho.trim(),
        rpm: rpm === "" ? null : Number(rpm),
      }),
    };
    try {
      if (item?.id) {
        await base44.entities[entityName].update(item.id, data);
      } else {
        await base44.entities[entityName].create(data);
      }
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      toast({ title: `${label} ${item?.id ? "atualizado" : "criado"}!` });
      onClose();
    } catch (err) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const addSpec = () => setSpecs([...specs, { label: "", value: "" }]);
  const updateSpec = (i, field, val) => setSpecs(specs.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  const removeSpec = (i) => setSpecs(specs.filter((_, idx) => idx !== i));

  const labelClass = "text-xs font-semibold text-muted-foreground mb-1 block";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-base">{item ? `Editar ${label}` : `Novo ${label}`}</h3>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>

      <div>
        <label className={labelClass}>Nome *</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={`Ex: ${label === "Trator" ? "Trator John Deere 5078E" : "Pulverizador Jacto 2000L"}`} className="h-11 rounded-xl" />
      </div>

      {isImplement && (
        <>
          <div>
            <label className={labelClass}>Capacidade do Tanque (L)</label>
            <Input type="number" step="1" value={tankCapacity} onChange={(e) => setTankCapacity(e.target.value)} placeholder="Ex: 4000" className="h-11 rounded-xl" />
            <p className="text-[10px] text-muted-foreground mt-1">Usado para calcular quantidade de produto por tanque nas RAs.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Marcha de Trabalho</label>
              <Input
                value={marchaTrabalho}
                onChange={(e) => setMarchaTrabalho(e.target.value)}
                placeholder="Ex: 4L, 5A, 3R"
                className="h-11 rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground mt-1">Marcha recomendada para aplicação</p>
            </div>
            <div>
              <label className={labelClass}>RPM do Motor</label>
              <Input
                type="number"
                step="50"
                value={rpm}
                onChange={(e) => setRpm(e.target.value)}
                placeholder="Ex: 1800"
                className="h-11 rounded-xl"
              />
              <p className="text-[10px] text-muted-foreground mt-1">RPM recomendado para aplicação</p>
            </div>
          </div>
        </>
      )}

      <div>
        <label className={labelClass}>Padrão de Regulagem e Calibração</label>
        <textarea
          value={adjustmentStandard}
          onChange={(e) => setAdjustmentStandard(e.target.value)}
          placeholder="Instruções de regulagem, calibração, pressão de bicos..."
          rows={3}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={labelClass}>Especificações Técnicas</label>
          <Button size="sm" variant="outline" className="h-7 rounded-lg text-xs" onClick={addSpec}>
            <Plus className="w-3 h-3" /> Adicionar
          </Button>
        </div>
        {specs.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nenhuma especificação. Clique em Adicionar.</p>
        ) : (
          <div className="space-y-2">
            {specs.map((s, i) => (
              <div key={i} className="flex gap-2 items-center">
                <Input value={s.label} onChange={(e) => updateSpec(i, "label", e.target.value)} placeholder="Campo" className="flex-1 h-9 rounded-lg" />
                <Input value={s.value} onChange={(e) => updateSpec(i, "value", e.target.value)} placeholder="Valor" className="flex-1 h-9 rounded-lg" />
                <button onClick={() => removeSpec(i)} className="text-destructive p-1.5"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="active" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-4 h-4 rounded" />
        <label htmlFor="active" className="text-sm text-muted-foreground">Ativo</label>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" className="flex-1 rounded-xl h-11" onClick={onClose}>
          <X className="w-4 h-4" /> Cancelar
        </Button>
        <Button className="flex-1 rounded-xl h-11" disabled={!name.trim() || saving} onClick={handleSave}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}
