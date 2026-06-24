import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, User, Wrench, TreePine, Clock, ArrowLeft, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import BottomNav from "../components/field/BottomNav";
import QuickActionFAB from "../components/QuickActionFAB";

export default function Records() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userLoaded, setUserLoaded] = useState(false);

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

  // Group by date
  const grouped = records.reduce((acc, r) => {
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
            <p className="font-medium">Nenhum registro ainda</p>
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
                      className="bg-card rounded-2xl border border-border p-4 space-y-2"
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

      <QuickActionFAB />
      <BottomNav />
    </div>
  );
}