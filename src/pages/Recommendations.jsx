import React, { useState, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Pencil, Leaf, Upload, Loader2, FileSpreadsheet, Search, CheckSquare, Square, X, Layers } from "lucide-react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { RADetails } from "../components/planning/RASelectorField";
import RAEditorModal from "../components/planning/RAEditorModal";
import RAFilterBar from "../components/recommendations/RAFilterBar";
import BulkEditModal from "../components/recommendations/BulkEditModal";
import BottomNav from "../components/field/BottomNav";
import QuickActionFAB from "../components/QuickActionFAB";

export default function Recommendations() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingRA, setEditingRA] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [filterTypes, setFilterTypes] = useState(new Set());
  const [filterOrchards, setFilterOrchards] = useState(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const fileRef = useRef(null);

  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ["recommendations"],
    queryFn: () => base44.entities.AgronomicRecommendation.list("-created_date", 500),
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ["recommendation-products"],
    queryFn: () => base44.entities.RecommendationProduct.list("-created_date", 1000),
    enabled: recommendations.length > 0,
  });

  // Group products by recommendation_id
  const productsByRA = useMemo(() => {
    const map = {};
    for (const p of allProducts) {
      if (!map[p.recommendation_id]) map[p.recommendation_id] = [];
      map[p.recommendation_id].push(p);
    }
    for (const id in map) {
      map[id].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }
    return map;
  }, [allProducts]);

  const uniqueTypes = useMemo(() => {
    const set = new Set();
    for (const ra of recommendations) { if (ra.type) set.add(ra.type); }
    return [...set].sort();
  }, [recommendations]);

  const uniqueOrchards = useMemo(() => {
    const set = new Set();
    for (const ra of recommendations) { if (ra.orchard_code) set.add(ra.orchard_code); }
    return [...set].sort();
  }, [recommendations]);

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      await base44.entities.RecommendationProduct.deleteMany({ recommendation_id: id });
      await base44.entities.AgronomicRecommendation.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["recommendations-active"] });
      queryClient.invalidateQueries({ queryKey: ["recommendation-products"] });
      toast({ title: "RA removida!" });
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, changes }) => {
      const updates = ids.map((id) => ({ id, ...changes }));
      await base44.entities.AgronomicRecommendation.bulkUpdate(updates);
    },
    onSuccess: (_, { ids }) => {
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["recommendations-active"] });
      toast({ title: `${ids.length} RA${ids.length !== 1 ? "s" : ""} atualizada${ids.length !== 1 ? "s" : ""}!` });
      setSelectedIds(new Set());
      setShowBulkEdit(false);
    },
  });

  const normalize = (str) => {
    if (!str) return "";
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  const filtered = useMemo(() => {
    const s = search ? normalize(search) : "";
    return recommendations.filter(ra => {
      if (filterTypes.size > 0 && !filterTypes.has(ra.type)) return false;
      if (filterOrchards.size > 0 && !filterOrchards.has(ra.orchard_code)) return false;
      if (!s) return true;
      const prods = productsByRA[ra.id] || [];
      const productText = prods
        .map(p => `${p.product_name || ""} ${p.active_ingredient || ""} ${p.target || ""}`)
        .join(" ");
      return (
        normalize(ra.code).includes(s) ||
        normalize(ra.type).includes(s) ||
        normalize(ra.orchard_code).includes(s) ||
        normalize(productText).includes(s)
      );
    });
  }, [recommendations, productsByRA, search, filterTypes, filterOrchards]);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const res = await base44.functions.invoke("importRecommendations", { file_url });
      if (res.data?.error) throw new Error(res.data.error);
      toast({
        title: "Importação concluída!",
        description: `${res.data.imported} RAs (${res.data.created} novas, ${res.data.updated} atualizadas)${res.data.products_created ? ` · ${res.data.products_created} produtos criados` : ""}`,
      });
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["recommendations-active"] });
      queryClient.invalidateQueries({ queryKey: ["recommendation-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err) {
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
    }
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-5 rounded-b-3xl">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link to="/">
            <button className="p-2 rounded-xl hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Leaf className="w-5 h-5" />
              Recomendações Agronômicas
            </h1>
            <p className="text-primary-foreground/70 text-sm">Safra 2025/2026</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Search + Actions */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar RA..."
              className="w-full h-10 rounded-xl border border-input bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <Button variant="outline" size="icon" className="rounded-xl shrink-0" onClick={() => fileRef.current?.click()} disabled={importing} title="Importar Excel">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          </Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          <Button size="icon" className="rounded-xl shrink-0" onClick={() => { setEditingRA(null); setShowEditor(true); }} title="Nova RA">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Import hint */}
        <div className="bg-muted/30 rounded-xl border border-border p-3 flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-muted-foreground shrink-0" />
          <p className="text-xs text-muted-foreground">
            Importe planilhas .xlsx com colunas: RA, DATA, TIPO, POMAR, STATUS, PRODUTO, APLICAÇÃO, DOSE, QUANT. TOTAL, OBS — linhas com o mesmo código de RA são agrupadas automaticamente.
          </p>
        </div>

        {/* Filters */}
        <RAFilterBar
          types={uniqueTypes}
          orchards={uniqueOrchards}
          activeTypes={filterTypes}
          activeOrchards={filterOrchards}
          onToggleType={(t) => {
            const next = new Set(filterTypes);
            next.has(t) ? next.delete(t) : next.add(t);
            setFilterTypes(next);
          }}
          onToggleOrchard={(o) => {
            const next = new Set(filterOrchards);
            next.has(o) ? next.delete(o) : next.add(o);
            setFilterOrchards(next);
          }}
          onClear={() => { setFilterTypes(new Set()); setFilterOrchards(new Set()); }}
        />

        {/* List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Leaf className="w-16 h-16 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Nenhuma recomendação cadastrada</p>
            <p className="text-muted-foreground/70 text-sm mt-1">Crie uma nova RA ou importe de uma planilha</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((ra) => {
              const raProducts = productsByRA[ra.id] || [];
              return (
                <div key={ra.id} className={`bg-card rounded-2xl border p-4 transition-colors ${selectedIds.has(ra.id) ? "border-primary ring-1 ring-primary/30" : "border-border"}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={() => {
                          const next = new Set(selectedIds);
                          next.has(ra.id) ? next.delete(ra.id) : next.add(ra.id);
                          setSelectedIds(next);
                        }}
                        className="shrink-0 p-0.5"
                      >
                        {selectedIds.has(ra.id)
                          ? <CheckSquare className="w-5 h-5 text-primary" />
                          : <Square className="w-5 h-5 text-muted-foreground/40" />}
                      </button>
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Leaf className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">{ra.code}</p>
                          {ra.orchard_code && (
                            <span className="text-[10px] font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded-md shrink-0">
                              {ra.orchard_code}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {raProducts.length} produto{raProducts.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => { setEditingRA(ra); setShowEditor(true); }} className="text-muted-foreground hover:text-foreground p-1">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(ra.id)} className="text-destructive hover:text-destructive/80 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <RADetails ra={ra} products={raProducts} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-40 px-4">
          <div className="max-w-lg mx-auto bg-primary text-primary-foreground rounded-2xl shadow-lg p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5" />
              <span className="text-sm font-semibold">{selectedIds.size} selecionada{selectedIds.size !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkEdit(true)}
                className="text-sm font-medium bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl transition-colors"
              >
                Editar
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="p-1.5 rounded-xl hover:bg-white/20"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <QuickActionFAB />
      <BottomNav />

      {showEditor && (
        <RAEditorModal
          ra={editingRA}
          onClose={() => { setShowEditor(false); setEditingRA(null); }}
        />
      )}

      {showBulkEdit && (
        <BulkEditModal
          selectedIds={selectedIds}
          onApply={(changes) => bulkUpdateMutation.mutate({ ids: [...selectedIds], changes })}
          onClose={() => setShowBulkEdit(false)}
        />
      )}
    </div>
  );
}