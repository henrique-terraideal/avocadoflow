import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Eraser, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

const DEFAULT_CUTOFF = "2026-11-16";

function formatBR(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function SheetCleanup() {
  const { toast } = useToast();
  const [cutoff, setCutoff] = useState(DEFAULT_CUTOFF);
  const [preview, setPreview] = useState(null);
  const [checking, setChecking] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleCheck = async () => {
    setChecking(true);
    setPreview(null);
    try {
      const res = await base44.functions.invoke("cleanSheetBeforeDate", {
        cutoff_date: cutoff,
        dry_run: true,
      });
      if (res.data?.success) {
        setPreview({ to_remove: res.data.to_remove, kept: res.data.kept });
      } else {
        toast({
          title: "Erro ao ler a planilha",
          description: res.data?.error || "Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setChecking(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await base44.functions.invoke("cleanSheetBeforeDate", { cutoff_date: cutoff });
      if (res.data?.success) {
        setPreview(null);
        toast({
          title: "Planilha limpa",
          description: `${res.data.removed} linha(s) removida(s). ${res.data.kept} linha(s) mantida(s).`,
        });
      } else {
        toast({
          title: "Erro ao limpar",
          description: res.data?.error || "Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center">
          <Eraser className="w-5 h-5 text-amber-700" />
        </div>
        <h3 className="font-bold text-lg">Limpar planilha por data</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Remove da aba <span className="font-semibold">Registros</span> as linhas com data da atividade anterior ao dia
        escolhido. O cabeçalho e os dias seguintes são mantidos, e nada é apagado do banco de dados.
      </p>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">Remover atividades anteriores a</label>
        <input
          type="date"
          value={cutoff}
          onChange={(e) => {
            setCutoff(e.target.value);
            setPreview(null);
          }}
          className="w-full h-12 rounded-xl border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {preview && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-sm font-semibold text-amber-800">
              {preview.to_remove} linha(s) serão removidas
            </p>
          </div>
          <p className="text-xs text-amber-700 pl-6">
            {preview.kept} linha(s) de {formatBR(cutoff)} em diante serão mantidas.
          </p>
        </div>
      )}

      {preview ? (
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setPreview(null)}
            disabled={removing}
            className="flex-1 h-11 rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleRemove}
            disabled={removing || preview.to_remove === 0}
            className="flex-1 h-11 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
          >
            {removing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eraser className="w-4 h-4" />}
            Remover {preview.to_remove}
          </Button>
        </div>
      ) : (
        <Button
          onClick={handleCheck}
          disabled={!cutoff || checking}
          variant="outline"
          className="w-full h-11 rounded-xl gap-2"
        >
          {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Verificar linhas afetadas
        </Button>
      )}
    </div>
  );
}