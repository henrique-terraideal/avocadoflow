import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, UserPlus, UserMinus, Loader2 } from "lucide-react";

export default function OperatorVisibilityModal({ onClose }) {
  const queryClient = useQueryClient();

  const { data: allOperators = [], isLoading } = useQuery({
    queryKey: ["operators-all"],
    queryFn: () => base44.entities.Operator.list("name", 200),
  });

  const toggle = useMutation({
    mutationFn: ({ id, active }) => base44.entities.Operator.update(id, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operators"] });
      queryClient.invalidateQueries({ queryKey: ["operators-inactive"] });
      queryClient.invalidateQueries({ queryKey: ["operators-all"] });
    },
  });

  const activeList = allOperators.filter((o) => o.active !== false);
  const inactiveList = allOperators.filter((o) => o.active === false);

  const row = (op) => {
    const isActive = op.active !== false;
    return (
      <div key={op.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card">
        {op.photo_url ? (
          <img src={op.photo_url} alt={op.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-sm shrink-0">
            {op.name?.[0]}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold truncate ${isActive ? "" : "text-muted-foreground"}`}>{op.name}</p>
          <p className="text-[11px] text-muted-foreground">{isActive ? "No quadro" : "Fora do quadro"}</p>
        </div>
        <button
          onClick={() => toggle.mutate({ id: op.id, active: !isActive })}
          disabled={toggle.isPending}
          className={`flex items-center gap-1.5 px-3 h-9 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50
            ${isActive
              ? "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              : "bg-primary/10 text-primary hover:bg-primary/20"}`}
        >
          {isActive ? <UserMinus className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
          {isActive ? "Retirar" : "Adicionar"}
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card w-full max-w-md rounded-2xl shadow-2xl max-h-[82vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold">Operadores do quadro</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Quem está fora não aparece nas linhas nem nas listas de novos registros, mas o histórico é mantido.
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Ativos ({activeList.length})
                </p>
                {activeList.map(row)}
              </div>

              {inactiveList.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Fora do quadro ({inactiveList.length})
                  </p>
                  {inactiveList.map(row)}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}