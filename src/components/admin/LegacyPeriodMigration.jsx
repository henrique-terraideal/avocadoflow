import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { RefreshCw, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function LegacyPeriodMigration() {
  const { toast } = useToast();
  const [preview, setPreview] = useState(null);
  const [checking, setChecking] = useState(false);
  const [migrating, setMigrating] = useState(false);

  const handleCheck = async () => {
    setChecking(true);
    setPreview(null);
    try {
      const res = await base44.functions.invoke("migrateLegacyPeriodRows", { dry_run: true });
      if (res.data?.success) {
        setPreview({
          legacy_rows: res.data.legacy_rows,
          new_rows: res.data.new_rows,
          records_updated: res.data.records_updated,
        });
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

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const res = await base44.functions.invoke("migrateLegacyPeriodRows", {});
      if (res.data?.success) {
        setPreview(null);
        toast({
          title: "Períodos migrados",
          description: `${res.data.legacy_rows} linha(s) convertida(s) em ${res.data.new_rows} linha(s) com horários padrão. ${res.data.records_updated} registro(s) ajustado(s) na base.`,
        });
      } else {
        toast({
          title: "Erro ao migrar",
          description: res.data?.error || "Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-sky-100 flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-sky-700" />
        </div>
        <h3 className="font-bold text-lg">Migrar períodos antigos</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Converte as linhas da aba <span className="font-semibold">Registros</span> que ainda trazem o período escrito no
        lugar do horário para o formato novo: uma linha por período (Manhã 07:00–11:00, Tarde 12:00–17:00, Noite
        18:00–23:59). Os demais dados de cada registro são mantidos.
      </p>

      {preview && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-sky-600 shrink-0" />
            <p className="text-sm font-semibold text-sky-800">
              {preview.legacy_rows} linha(s) antiga(s) serão convertidas em {preview.new_rows} linha(s)
            </p>
          </div>
          <p className="text-xs text-sky-700 pl-6">
            {preview.records_updated} registro(s) da base serão ajustados para o formato novo.
          </p>
        </div>
      )}

      {preview ? (
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => setPreview(null)}
            disabled={migrating}
            className="flex-1 h-11 rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleMigrate}
            disabled={migrating || preview.legacy_rows === 0}
            className="flex-1 h-11 rounded-xl gap-2"
          >
            {migrating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Migrar
          </Button>
        </div>
      ) : (
        <Button
          onClick={handleCheck}
          disabled={checking}
          variant="outline"
          className="w-full h-11 rounded-xl gap-2"
        >
          {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Verificar linhas antigas
        </Button>
      )}
    </div>
  );
}