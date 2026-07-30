import React, { useState, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Pencil, Leaf, Upload, Loader2, FileSpreadsheet, Search, CheckSquare, Square, X, Layers, Printer, RefreshCw } from "lucide-react";
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
  const [filterMonth, setFilterMonth] = useState("");
  const [filterStatus, setFilterStatus] = useState("planejada");
  const [printing, setPrinting] = useState(false);
  const [syncing, setSyncing] = useState(false);
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
      if (filterMonth && (!ra.date || !ra.date.startsWith(filterMonth))) return false;
      if (filterStatus && filterStatus !== "todas" && (ra.status || "planejada").toLowerCase() !== filterStatus) return false;
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
  }, [recommendations, productsByRA, search, filterTypes, filterOrchards, filterMonth, filterStatus]);

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

  // === Sync RAs with catalog data ===
  const handleSyncRAs = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke("syncRAData", {});
      if (res.data?.error) throw new Error(res.data.error);
      const data = res.data;
      toast({
        title: data.products_updated > 0 ? "RAs sincronizadas" : "Tudo atualizado",
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["recommendation-products"] });
    } catch (err) {
      toast({ title: "Erro na sincronização", description: err.message, variant: "destructive" });
    }
    setSyncing(false);
  };

  // === Ficha printing ===

  const handlePrintFichas = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    setPrinting(true);
    try {
      const res = await base44.functions.invoke("createLabelsFromRAs", { ra_ids: ids });
      if (res.data?.error) throw new Error(res.data.error);

      const results = res.data?.results || [];
      if (results.length === 0) throw new Error("Nenhuma RA encontrada");

      const fichasHtml = results.map((item, idx) => generateFichaHTML(item, idx === results.length - 1)).join("");

      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Fichas de Aplicação — HP Avocado</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: white; font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; }
    .ficha-page {
      width: 210mm;
      min-height: 297mm;
      max-width: 210mm;
      padding: 12mm 15mm;
      page-break-after: always;
      position: relative;
    }
    .ficha-page:last-child { page-break-after: auto; }
    @media print {
      @page { size: A4 portrait; margin: 0; }
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid #1a7a3a;
      padding-bottom: 3mm;
      margin-bottom: 4mm;
    }
    .header-left { font-size: 16pt; font-weight: 900; color: #1a7a3a; letter-spacing: -0.5px; }
    .header-right { text-align: right; }
    .header-right .title { font-size: 11pt; font-weight: 700; color: #333; text-transform: uppercase; }
    .header-right .subtitle { font-size: 8pt; color: #666; margin-top: 1mm; }

    .ra-info-box {
      background: #f0f7f1;
      border: 1.5px solid #1a7a3a;
      border-radius: 2mm;
      padding: 3.5mm;
      margin-bottom: 3mm;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .ra-info-left { flex: 1; }
    .ra-info-right { text-align: right; }
    .ra-code { font-size: 13pt; font-weight: 900; color: #1a7a3a; margin-bottom: 1.5mm; }
    .ra-type { font-size: 9.5pt; font-weight: 600; color: #333; }
    .ra-orchard { font-size: 9pt; color: #555; margin-top: 1mm; }
    .ra-date { font-size: 9pt; color: #555; }

    .section-title {
      font-size: 9.5pt;
      font-weight: 800;
      color: #1a7a3a;
      text-transform: uppercase;
      border-bottom: 1px solid #ccc;
      padding-bottom: 1.5mm;
      margin-top: 4mm;
      margin-bottom: 2.5mm;
    }

    .products-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 3mm;
    }
    .products-table th {
      background: #1a7a3a;
      color: white;
      font-size: 7.5pt;
      font-weight: 700;
      padding: 2.5mm 1.5mm;
      text-align: left;
      border: 0.5mm solid #1a7a3a;
    }
    .products-table td {
      font-size: 8pt;
      padding: 2.5mm 1.5mm;
      border: 0.5mm solid #ddd;
      vertical-align: top;
    }
    .products-table tr:nth-child(even) td { background: #f9faf9; }
    .product-name { font-weight: 700; color: #1a3a1a; }
    .product-pa { font-style: italic; color: #2a6a4a; font-size: 7pt; }
    .product-target { color: #555; font-size: 7pt; }
    .product-carencia { font-weight: 700; color: #c44; font-size: 7.5pt; }

    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 2.5mm;
      margin-bottom: 3mm;
    }
    .info-item {
      font-size: 8.5pt;
      padding: 1.5mm 0;
    }
    .info-label { font-weight: 700; color: #333; display: block; font-size: 7.5pt; text-transform: uppercase; color: #888; }
    .info-value { color: #1a1a1a; font-weight: 600; }

    .obs-box {
      background: #fffde8;
      border: 0.5mm solid #e0c200;
      border-radius: 2mm;
      padding: 3mm;
      margin-bottom: 3mm;
      font-size: 8.5pt;
      color: #555;
    }
    .obs-box strong { color: #333; }

    .critical-box {
      background: #fff0f0;
      border: 1mm solid #c33;
      border-radius: 2mm;
      padding: 3.5mm;
      margin: 3mm 0;
      display: flex;
      align-items: center;
      gap: 3mm;
    }
    .critical-icon {
      font-size: 16pt;
      flex-shrink: 0;
    }
    .critical-text {
      font-size: 9pt;
      font-weight: 700;
      color: #c33;
      text-transform: uppercase;
      line-height: 1.4;
    }

    .climate-box {
      background: #f5f5f5;
      border: 0.5mm solid #ddd;
      border-radius: 2mm;
      padding: 3mm;
      margin-bottom: 3mm;
      font-size: 8pt;
      color: #555;
    }

    .qr-section {
      display: flex;
      align-items: center;
      gap: 5mm;
      margin-top: 4mm;
      padding-top: 4mm;
      border-top: 1px dashed #ccc;
    }
    .qr-img { width: 28mm; height: 28mm; }
    .qr-text { font-size: 8pt; color: #777; }
    .qr-text strong { display: block; font-size: 9pt; color: #1a7a3a; margin-bottom: 1mm; }

    .footer {
      position: absolute;
      bottom: 8mm;
      left: 15mm;
      right: 15mm;
      font-size: 7pt;
      color: #999;
      text-align: center;
      border-top: 0.5pt solid #eee;
      padding-top: 2mm;
    }
  </style>
</head>
<body>
${fichasHtml}
<script>window.onload=function(){window.print();}<\/script>
</body>
</html>`;

      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10000);

      queryClient.invalidateQueries({ queryKey: ["planning-labels"] });
      queryClient.invalidateQueries({ queryKey: ["recommendations"] });

      toast({
        title: "Fichas geradas!",
        description: `${results.length} ficha(s) impressa(s). ${results.length} etiqueta(s) criada(s) no Planejamento.`,
      });
      setSelectedIds(new Set());
    } catch (err) {
      toast({ title: "Erro ao gerar fichas", description: err.message, variant: "destructive" });
    }
    setPrinting(false);
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
          <Button variant="outline" size="icon" className="rounded-xl shrink-0" onClick={handleSyncRAs} disabled={syncing} title="Sincronizar RAs com cadastros">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
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

        {/* Status filter */}
        <div className="flex items-center gap-1.5">
          {[
            { key: "planejada", label: "📋 Planejada", active: "bg-blue-100 text-blue-700 border-blue-300" },
            { key: "pendente",  label: "⏳ Pendente",  active: "bg-amber-100 text-amber-700 border-amber-300" },
            { key: "executada", label: "✅ Executada", active: "bg-green-100 text-green-700 border-green-300" },
            { key: "todas",     label: "Todas",         active: "bg-primary text-primary-foreground border-primary" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setFilterStatus(s.key)}
              className={`flex-1 text-xs font-semibold px-2 py-1.5 rounded-lg border transition-all ${
                filterStatus === s.key
                  ? s.active
                  : "bg-background border-border text-muted-foreground hover:border-primary/30"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <RAFilterBar
          types={uniqueTypes}
          orchards={uniqueOrchards}
          activeTypes={filterTypes}
          activeOrchards={filterOrchards}
          filterMonth={filterMonth}
          onMonthChange={setFilterMonth}
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
          onClear={() => {     setFilterTypes(new Set()); setFilterOrchards(new Set()); setFilterMonth(""); }}
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
            {filtered.length > 0 && (
              <button
                onClick={() => {
                  if (filtered.every(ra => selectedIds.has(ra.id))) {
                    const next = new Set(selectedIds);
                    filtered.forEach(ra => next.delete(ra.id));
                    setSelectedIds(next);
                  } else {
                    const next = new Set(selectedIds);
                    filtered.forEach(ra => next.add(ra.id));
                    setSelectedIds(next);
                  }
                }}
                className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {filtered.every(ra => selectedIds.has(ra.id))
                  ? <CheckSquare className="w-4 h-4" />
                  : <Square className="w-4 h-4" />}
                {filtered.every(ra => selectedIds.has(ra.id)) ? "Desmarcar todas" : `Selecionar todas (${filtered.length})`}
              </button>
            )}
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
                          {ra.status === "planejada" && (
                            <span className="text-[10px] font-medium bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md shrink-0">📋 Planejada</span>
                          )}
                          {ra.status === "pendente" && (
                            <span className="text-[10px] font-medium bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md shrink-0">⏳ Pendente</span>
                          )}
                          {ra.status === "executada" && (
                            <span className="text-[10px] font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded-md shrink-0">✅ Executada</span>
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
                onClick={handlePrintFichas}
                disabled={printing}
                className="text-sm font-medium bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {printing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                Imprimir
              </button>
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

// === Ficha A4 HTML Generator ===

function generateFichaHTML(item, isLast) {
  const { ra, products, label, implement, machine, operation } = item;

  const formatDate = (dateStr) => {
    if (!dateStr) return '___/___/_____';
    try {
      const d = new Date(dateStr + 'T12:00:00');
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch { return dateStr; }
  };

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(label.qr_data || '')}`;

  // Check if it's a pulverização type (show volume de calda)
  const isPulverizacao = (ra.type || '').toUpperCase().includes('PULVER');

  // Check if any product has active_ingredient or target filled
  const hasPA = products.some(p => p.active_ingredient && p.active_ingredient.trim());
  const hasTarget = products.some(p => p.target && p.target.trim());

  // Dynamic column widths based on how many columns are visible
  const colCount = 7 + (hasPA ? 1 : 0) + (hasTarget ? 1 : 0);

  // Products table rows
  const productRows = products.map((p, i) => {
    const tankCapacity = implement?.tank_capacity_liters || 0;
    const litersPerHa = ra.liters_per_ha || 1000;
    const qtyPerTank = tankCapacity && p.dose != null
      ? (p.dose * (tankCapacity / litersPerHa)).toFixed(3)
      : null;

    const paCell = hasPA ? `<td style="text-align: left; font-style: italic; color: #2a6a4a;">${p.active_ingredient || '—'}</td>` : '';
    const targetCell = hasTarget ? `<td style="text-align: left; color: #555;">${p.target || '—'}</td>` : '';

    return `
      <tr>
        <td style="width: 6mm; text-align: center; font-weight: 700; color: #1a7a3a;">${i + 1}</td>
        <td style="width: 40mm;">
          <div class="product-name">${p.product_name || '—'}</div>
        </td>
        ${paCell}
        ${targetCell}
        <td style="width: 14mm; text-align: center;">${p.application_mode || 'ÁREA'}</td>
        <td style="width: 16mm; text-align: center; font-weight: 700;">
          ${p.dose != null ? `${p.dose}${p.application_mode === 'PLANTA' ? '/pl' : '/ha'}` : '—'}
        </td>
        <td style="width: 16mm; text-align: center;">
          ${qtyPerTank ? `<strong style="color: #1a5599;">${qtyPerTank}</strong>` : '—'}
        </td>
        <td style="width: 14mm; text-align: center;">
          ${p.total_quantity != null ? p.total_quantity : '—'}
        </td>
        <td style="width: 16mm; text-align: center;">
          ${p.carencia ? `<span class="product-carencia">${p.carencia}</span>` : '—'}
        </td>
      </tr>
    `;
  }).join('');

  // Orchard info
  const orchardText = ra.orchard_code
    ? `${ra.orchard_code}${ra.orchard_name ? ' — ' + ra.orchard_name : ''}${ra.orchard_area ? ' (' + ra.orchard_area + ' ha)' : ''}`
    : '—';

  // Machine/Tractor/Implement info block — pulled from Machine and Implement entities
  const machineItems = [];
  if (machine?.name) machineItems.push({ label: 'Trator', value: machine.name });
  if (implement?.name) machineItems.push({ label: 'Implemento', value: implement.name });
  if (implement?.tank_capacity_liters) machineItems.push({ label: 'Capac. Tanque', value: `${implement.tank_capacity_liters} L` });
  if (implement?.marcha_trabalho) machineItems.push({ label: 'Marcha', value: implement.marcha_trabalho });
  if (implement?.rpm) machineItems.push({ label: 'RPM', value: `${implement.rpm}` });
  if (ra.machine_config) machineItems.push({ label: 'Regulagem Máq.', value: ra.machine_config });
  if (ra.implement_config) machineItems.push({ label: 'Regulagem Impl.', value: ra.implement_config });
  if (isPulverizacao && ra.liters_per_ha) machineItems.push({ label: 'Volume de Calda', value: `${ra.liters_per_ha} L/ha` });

  // Build machine info grid (3 columns)
  let machineHtml = '';
  for (let i = 0; i < machineItems.length; i += 3) {
    const row = machineItems.slice(i, i + 3);
    let cells = row.map(m => `
      <div class="info-item">
        <span class="info-label">${m.label}</span>
        <span class="info-value">${m.value || '—'}</span>
      </div>
    `).join('');
    const emptyCells = 3 - row.length;
    for (let j = 0; j < emptyCells; j++) {
      cells += '<div class="info-item"></div>';
    }
    machineHtml += `<div class="info-grid">${cells}</div>`;
  }

  return `
    <div class="ficha-page">
      <!-- Header -->
      <div class="header">
        <div class="header-left">HP AVOCADO</div>
        <div class="header-right">
          <div class="title">Ficha de Aplicação</div>
          <div class="subtitle">Recomendação Agronômica · ${formatDate(ra.date)}</div>
        </div>
      </div>

      <!-- RA Info Box -->
      <div class="ra-info-box">
        <div class="ra-info-left">
          <div class="ra-code">RA: ${ra.code || '—'}</div>
          <div class="ra-type">${ra.type || '—'}</div>
          ${ra.orchard_code ? `<div class="ra-orchard">🌳 Pomar: ${orchardText}</div>` : ''}
        </div>
        <div class="ra-info-right">
          ${ra.date ? `<div class="ra-date">📅 Data prevista: ${formatDate(ra.date)}</div>` : ''}
          ${operation ? `<div class="ra-date" style="margin-top:1mm;">🔧 ${operation.code} - ${operation.name}</div>` : ''}
        </div>
      </div>

      <!-- Products Table -->
      <div class="section-title">Produtos / Insumos</div>
      <table class="products-table">
        <thead>
          <tr>
            <th style="width: 6mm; text-align: center;">#</th>
            <th style="width: 40mm;">Produto Comercial</th>
            ${hasPA ? '<th style="width: 22mm;">Princípio Ativo</th>' : ''}
            ${hasTarget ? '<th style="width: 18mm;">Alvo</th>' : ''}
            <th style="width: 14mm; text-align: center;">Modo</th>
            <th style="width: 16mm; text-align: center;">Dose</th>
            <th style="width: 16mm; text-align: center;">Qtd/Tanque</th>
            <th style="width: 14mm; text-align: center;">Total</th>
            <th style="width: 16mm; text-align: center;">Carência</th>
          </tr>
        </thead>
        <tbody>
          ${productRows || `<tr><td colspan="${colCount}" style="text-align:center;color:#999;padding:4mm;">Nenhum produto cadastrado</td></tr>`}
        </tbody>
      </table>

      <!-- Machine / Tractor / Implement -->
      ${machineItems.length > 0 ? `
      <div class="section-title">Maquinário · Trator · Implemento</div>
      ${machineHtml}
      ` : ''}

      <!-- Application Observations -->
      ${ra.application_observations ? `
      <div class="section-title">Observações da Aplicação</div>
      <div class="obs-box">${ra.application_observations}</div>
      ` : ''}

      <!-- Climate Conditions -->
      ${ra.climate_conditions ? `
      <div class="section-title">Condições Climáticas Ideais</div>
      <div class="climate-box">${ra.climate_conditions}</div>
      ` : ''}

      <!-- Product-specific observations -->
      ${products.some(p => p.obs) ? `
      <div class="section-title">Observações dos Produtos</div>
      <div class="obs-box">
        ${products.filter(p => p.obs).map(p => `<strong>${p.product_name}:</strong> ${p.obs}`).join('<br/>')}
      </div>
      ` : ''}

      <!-- Critical Message -->
      <div class="critical-box">
        <div class="critical-icon">⚠️</div>
        <div class="critical-text">
          Realizar Tripla Lavagem e descartar as embalagens no depósito de vasilhames
        </div>
      </div>

      <!-- QR Code Section -->
      <div class="qr-section">
        <img src="${qrUrl}" class="qr-img" alt="QR Code" />
        <div class="qr-text">
          <strong>Escaneie para registrar a operação</strong>
          Após a execução, escaneie o QR Code para abrir<br/>
          o registro no app AvocadoFlow e preencher os dados da operação.
        </div>
      </div>

      <!-- Footer -->
      <div class="footer">
        HP Avocado · AvocadoFlow · RA ${ra.code || ''} · Gerado em ${new Date().toLocaleDateString('pt-BR')}
      </div>
    </div>
  `;
}