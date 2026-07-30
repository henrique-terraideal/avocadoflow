import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, User, Wrench, TreePine, Clock, ArrowLeft, Trash2, Leaf, X, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import BottomNav from "../components/field/BottomNav";
import QuickActionFAB from "../components/QuickActionFAB";
import RecordDetailModal from "../components/field/RecordDetailModal";
import RecordsFilterBar from "../components/field/RecordsFilterBar";

const normalize = (str) => {
  if (!str) return "";
  return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export default function Records() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [raDetail, setRaDetail] = useState(null);
  const [loadingRA, setLoadingRA] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [showOnlyRA, setShowOnlyRA] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => { setCurrentUser(u); setUserLoaded(true); }).catch(() => setUserLoaded(true));
  }, []);

  const isAdmin = currentUser?.role === "admin";
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const sheetRes = await base44.functions.invoke("deleteFromSheet", { record_id: id });
      if (sheetRes.data?.error) throw new Error("Erro ao remover da planilha: " + sheetRes.data.error);
      await base44.entities.FieldRecord.delete(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["field-records"] }),
    onError: (err) => alert(err.message),
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["field-records", currentUser?.id, isAdmin],
    queryFn: () => isAdmin
      ? base44.entities.FieldRecord.list("-created_date", 200)
      : base44.entities.FieldRecord.filter({ created_by_user_id: currentUser?.id }, "-created_date", 200),
    enabled: userLoaded,
  });

  // Fetch PlanningLabels to enrich old records that lack additional_details
  const { data: planningLabels = [] } = useQuery({
    queryKey: ["planning-labels-enrich"],
    queryFn: () => base44.entities.PlanningLabel.list("-created_date", 500),
    enabled: userLoaded,
  });

  // Enrich records: if a FieldRecord has no additional_details, try to find it on the matching PlanningLabel
  const enrichedRecords = records.map((r) => {
    if (r.additional_details) return r;
    const opCode = r.operation?.split(".")[0]?.trim();
    const opName = r.operation?.replace(/^\d+[\.\-]\s*/, "").trim().toLowerCase();
    const match = planningLabels.find((l) =>
      l.operator_name === r.operator_name &&
      l.orchard_number === r.orchard_number &&
      l.additional_details &&
      l.date === r.date &&
      (l.operation_code === opCode || l.operation_name?.toLowerCase() === opName)
    );
    return match ? { ...r, additional_details: match.additional_details } : r;
  });

  // Helper: extract RA info from a record's additional_details
  const getRAInfo = (record) => {
    if (!record.additional_details) return null;
    try {
      const details = JSON.parse(record.additional_details);
      if (details.ra_id) {
        return { ra_id: details.ra_id, ra_code: details.ra_code || details.code, orchard: details.orchard, type: details.type };
      }
      for (const val of Object.values(details)) {
        try {
          const parsed = JSON.parse(val);
          if (parsed && parsed.ra_id) {
            return { ra_id: parsed.ra_id, ra_code: parsed.ra_code || parsed.code, orchard: parsed.orchard, type: parsed.type };
          }
        } catch {}
      }
    } catch {}
    return null;
  };

  // Helper: open RA details (read-only)
  const handleOpenRA = async (raInfo) => {
    if (!raInfo?.ra_id) return;
    setLoadingRA(true);
    try {
      const ra = await base44.entities.AgronomicRecommendation.get(raInfo.ra_id);
      const products = await base44.entities.RecommendationProduct.filter({ recommendation_id: raInfo.ra_id }, "-created_date", 100);
      setRaDetail({ ra, products });
    } catch (e) {
      console.warn("Failed to load RA:", e);
    }
    setLoadingRA(false);
  };

  // Apply filters
  const filteredRecords = useMemo(() => {
    return enrichedRecords.filter((r) => {
      const matchDate = selectedDate ? r.date === selectedDate : true;
      const matchRA = showOnlyRA ? !!(r.additional_details && r.additional_details.includes("ra_selector")) : true;
      const matchSearch = search
        ? normalize(r.operator_name + " " + r.operation + " " + (r.observations || "")).includes(normalize(search))
        : true;
      return matchDate && matchRA && matchSearch;
    });
  }, [enrichedRecords, selectedDate, showOnlyRA, search]);

  // Group by date
  const grouped = filteredRecords.reduce((acc, r) => {
    const date = r.date || "Sem data";
    if (!acc[date]) acc[date] = [];
    acc[date].push(r);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-primary text-primary-foreground px-4 py-5 rounded-b-3xl">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Registros</h1>
            <p className="text-primary-foreground/70 text-sm">{records.length} registros</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {!isLoading && records.length > 0 && (
          <RecordsFilterBar
            search={search}
            setSearch={setSearch}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            showOnlyRA={showOnlyRA}
            setShowOnlyRA={setShowOnlyRA}
            resultCount={filteredRecords.length}
            totalCount={records.length}
          />
        )}
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
          ))
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Calendar className="w-12 h-12 mx-auto mb-4 opacity-40" />
            <p className="font-medium">{records.length === 0 ? "Nenhum registro ainda" : "Nenhum registro encontrado"}</p>
          </div>
        ) : (
          Object.entries(grouped)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([date, items]) => (
              <div key={date}>
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {(() => {
                    try {
                      return format(new Date(date + "T12:00:00"), "EEEE, dd 'de' MMMM", { locale: ptBR });
                    } catch {
                      return date;
                    }
                  })()}
                </h3>
                <div className="space-y-3">
                  {items.map((record) => (
                    <div
                      key={record.id}
                      onClick={() => setSelectedRecord(record)}
                      className="bg-card rounded-2xl border border-border p-4 space-y-2 cursor-pointer hover:border-primary/40 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-primary" />
                          <span className="font-semibold text-sm">{record.operator_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {record.start_time} → {record.end_time}
                          </div>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                              onClick={() => deleteMutation.mutate(record.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <div className="flex items-center gap-1">
                          <Wrench className="w-3.5 h-3.5" />
                          {record.operation}
                        </div>
                        <div className="flex items-center gap-1">
                          <TreePine className="w-3.5 h-3.5" />
                          {record.orchard_number}
                        </div>
                      </div>
                      {(() => {
                        const raInfo = getRAInfo(record);
                        if (!raInfo) return null;
                        return (
                          <div
                            onClick={(e) => { e.stopPropagation(); handleOpenRA(raInfo); }}
                            className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/30 rounded-lg px-2.5 py-1 cursor-pointer hover:bg-primary/20 transition-colors"
                          >
                            <Leaf className="w-3.5 h-3.5 text-primary" />
                            <span className="text-xs font-bold text-primary">RA {raInfo.ra_code}</span>
                            {raInfo.type && <span className="text-[10px] text-muted-foreground">· {raInfo.type}</span>}
                          </div>
                        );
                      })()}
                      {record.planned_date && record.planned_date !== record.date && (
                        <p className="text-xs text-muted-foreground/70">
                          📅 Planejado para {format(new Date(record.planned_date + "T12:00:00"), "dd/MM/yyyy")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
        )}
      </div>

      {selectedRecord && (
        <RecordDetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} onOpenRA={handleOpenRA} />
      )}
      {loadingRA && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="bg-card rounded-2xl p-6 flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium">Carregando RA...</span>
          </div>
        </div>
      )}
      {raDetail && (
        <RADetailModal data={raDetail} onClose={() => setRaDetail(null)} />
      )}

      <QuickActionFAB />
      <BottomNav />
    </div>
  );
}

// Read-only RA Detail Modal
function RADetailModal({ data, onClose }) {
  const { ra, products } = data;
  if (!ra) return null;

  const items = [
    { label: "Código", value: ra.code },
    { label: "Tipo", value: ra.type },
    { label: "Pomar", value: ra.orchard_code },
    { label: "Data", value: ra.date ? new Date(ra.date + "T12:00:00").toLocaleDateString("pt-BR") : "—" },
    { label: "Status", value: ra.status },
    { label: "Litros/ha", value: ra.liters_per_ha || "—" },
    { label: "Clima ideal", value: ra.climate_conditions || "—" },
  ];

  if (ra.machine_config) items.push({ label: "Maquinário", value: ra.machine_config });
  if (ra.implement_config) items.push({ label: "Implemento", value: ra.implement_config });
  if (ra.application_observations) items.push({ label: "Obs. aplicação", value: ra.application_observations });

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card rounded-t-3xl z-10">
          <div className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-base">RA {ra.code} — Detalhes</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full font-semibold">Somente leitura</span>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Header info */}
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-2.5 bg-muted/40 rounded-xl">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
                  <p className="text-sm font-semibold">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Products */}
          {products && products.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Package className="w-4 h-4 text-primary" />
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Produtos ({products.length})</p>
              </div>
              <div className="space-y-2">
                {products.map((p, i) => (
                  <div key={i} className="p-3 bg-muted/40 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-sm font-bold">{p.product_name}</span>
                      {p.unit && <span className="text-[10px] text-primary/70 font-semibold">[{p.unit}]</span>}
                    </div>
                    {(p.active_ingredient || p.target) && (
                      <p className="text-[10px] text-primary/70 font-medium pl-5 mb-0.5">
                        {p.active_ingredient ? `P.A.: ${p.active_ingredient}` : ""}
                        {p.active_ingredient && p.target ? " · " : ""}
                        {p.target ? `Alvo: ${p.target}` : ""}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground pl-5">
                      {p.application_mode || "ÁREA"}
                      {p.dose != null ? ` · Dose: ${Number(p.dose).toLocaleString("pt-BR", {minimumFractionDigits: 2, maximumFractionDigits: 2})}${p.unit ? " " + p.unit : ""}${p.application_mode === "PLANTA" ? "/planta" : "/ha"}` : ""}
                      {p.total_quantity != null ? ` · Total: ${Number(p.total_quantity).toLocaleString("pt-BR", {minimumFractionDigits: 2, maximumFractionDigits: 2})}${p.unit ? " " + p.unit : ""}` : ""}
                    </p>
                    {p.carencia && <p className="text-[10px] text-muted-foreground pl-5">Carência: {p.carencia}</p>}
                    {p.obs && <p className="text-[10px] text-muted-foreground pl-5 italic">{p.obs}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}