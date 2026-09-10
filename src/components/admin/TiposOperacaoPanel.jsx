import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Pencil, Check, X, Loader2, ShieldAlert, Search, HardHat } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const EPI_PRESETS = [
  "Luva nitrílica",
  "Óculos de proteção",
  "Máscara/Respirador",
  "Botas",
  "Avental",
  "Capacete",
];

const normalize = (str) => {
  if (!str) return "";
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export default function TiposOperacaoPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

  const { data: tipos = [], isLoading } = useQuery({
    queryKey: ["tipos-operacao"],
    queryFn: () => base44.entities.TipoOperacao.list("-created_date", 500),
  });

  const filteredTipos = useMemo(() => {
    if (!search.trim()) return tipos;
    const s = normalize(search);
    return tipos.filter((t) =>
      normalize(t.name).includes(s) ||
      normalize(t.epis_adicionais).includes(s) ||
      normalize(t.lembretes).includes(s) ||
      normalize(t.aviso_critico).includes(s)
    );
  }, [tipos, search]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TipoOperacao.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos-operacao"] });
      setShowForm(false);
      toast({ title: "Tipo de operação criado!" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TipoOperacao.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos-operacao"] });
      setEditingId(null);
      toast({ title: "Tipo de operação atualizado!" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TipoOperacao.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos-operacao"] });
      toast({ title: "Tipo de operação removido!" });
    },
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      {!showForm ? (
        <Button onClick={() => setShowForm(true)} className="w-full rounded-xl h-10">
          <Plus className="w-4 h-4" /> Novo Tipo de Operação
        </Button>
      ) : (
        <TipoForm
          onSave={(data) => createMutation.mutate(data)}
          onCancel={() => setShowForm(false)}
          saving={createMutation.isPending}
        />
      )}

      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm space-y-1.5">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tipo de operação..."
            className="pl-9 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {tipos.length > 0 && (
          <p className="text-xs text-muted-foreground px-1">
            {filteredTipos.length === tipos.length
              ? `${tipos.length} tipo(s)`
              : `${filteredTipos.length} de ${tipos.length} tipo(s)`}
          </p>
        )}
      </div>

      <div className="space-y-2">
        {tipos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum tipo de operação cadastrado.</p>
        ) : filteredTipos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum tipo encontrado.</p>
        ) : (
          filteredTipos.map((tipo) => (
            <div key={tipo.id}>
              {editingId === tipo.id ? (
                <TipoForm
                  tipo={tipo}
                  onSave={(data) => updateMutation.mutate({ id: tipo.id, data })}
                  onCancel={() => setEditingId(null)}
                  saving={updateMutation.isPending}
                />
              ) : (
                <TipoCard tipo={tipo} onEdit={() => setEditingId(tipo.id)} onDelete={() => deleteMutation.mutate(tipo.id)} />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TipoCard({ tipo, onEdit, onDelete }) {
  const epis = parseEpis(tipo);
  return (
    <div className="bg-card rounded-xl border border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <HardHat className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{tipo.name}</p>
          {epis.length > 0 && (
            <p className="text-xs text-muted-foreground truncate">
              <span className="font-medium">EPIs:</span> {epis.join(", ")}
            </p>
          )}
          {tipo.lembretes && (
            <p className="text-xs text-muted-foreground truncate">
              <span className="font-medium">Lembretes:</span> {tipo.lembretes}
            </p>
          )}
          {tipo.aviso_critico && (
            <p className="text-xs text-destructive truncate flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 shrink-0" /> {tipo.aviso_critico}
            </p>
          )}
        </div>
        <button onClick={onEdit} className="text-muted-foreground hover:text-foreground p-1">
          <Pencil className="w-4 h-4" />
        </button>
        <button onClick={onDelete} className="text-destructive hover:text-destructive/80 p-1">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function parseEpis(tipo) {
  let arr = [];
  try { arr = JSON.parse(tipo.epis_predefinidos || "[]"); } catch { arr = []; }
  const adicionais = (tipo.epis_adicionais || "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return [...arr, ...adicionais];
}

function TipoForm({ tipo, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    name: tipo?.name || "",
    epis_predefinidos: (() => { try { return JSON.parse(tipo?.epis_predefinidos || "[]"); } catch { return []; } })(),
    epis_adicionais: tipo?.epis_adicionais || "",
    lembretes: tipo?.lembretes || "",
    aviso_critico: tipo?.aviso_critico || "",
    active: tipo?.active ?? true,
  });

  const toggleEpi = (epi) => {
    setForm((p) => ({
      ...p,
      epis_predefinidos: p.epis_predefinidos.includes(epi)
        ? p.epis_predefinidos.filter((e) => e !== epi)
        : [...p.epis_predefinidos, epi],
    }));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    onSave({
      ...form,
      epis_predefinidos: JSON.stringify(form.epis_predefinidos),
    });
  };

  const labelClass = "text-xs font-medium text-muted-foreground mb-1 block";

  return (
    <div className="bg-card rounded-xl border border-border p-4 space-y-3">
      <div>
        <label className={labelClass}>Nome do tipo *</label>
        <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} className="rounded-xl" placeholder="Ex: FERTIADUBAÇÃO" />
      </div>

      <div>
        <label className={labelClass}>EPIs obrigatórios (checklist)</label>
        <div className="grid grid-cols-2 gap-2">
          {EPI_PRESETS.map((epi) => (
            <button
              key={epi}
              type="button"
              onClick={() => toggleEpi(epi)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                form.epis_predefinidos.includes(epi)
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:border-primary/30"
              }`}
            >
              <span className={`w-4 h-4 rounded flex items-center justify-center border ${
                form.epis_predefinidos.includes(epi) ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40"
              }`}>
                {form.epis_predefinidos.includes(epi) && <Check className="w-3 h-3" />}
              </span>
              {epi}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass}>EPIs adicionais (texto livre)</label>
        <textarea
          value={form.epis_adicionais}
          onChange={(e) => setForm((p) => ({ ...p, epis_adicionais: e.target.value }))}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          rows={2}
          placeholder="Um por linha ou separados por vírgula"
        />
      </div>

      <div>
        <label className={labelClass}>Lembretes</label>
        <textarea
          value={form.lembretes}
          onChange={(e) => setForm((p) => ({ ...p, lembretes: e.target.value }))}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          rows={2}
          placeholder="Ex: Conferir bicos antes de iniciar, respeitar intervalo de segurança..."
        />
      </div>

      <div>
        <label className={labelClass}>Aviso crítico</label>
        <textarea
          value={form.aviso_critico}
          onChange={(e) => setForm((p) => ({ ...p, aviso_critico: e.target.value }))}
          className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          rows={2}
          placeholder="Ex: Realizar Tripla Lavagem e descartar as embalagens no depósito de vasilhames"
        />
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