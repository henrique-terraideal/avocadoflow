import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Sheet, ExternalLink, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

export default function SheetsConfig() {
  const { toast } = useToast();
  const [sheetId, setSheetId] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [configId, setConfigId] = useState(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const configs = await base44.entities.AppConfig.filter({ key: "google_sheet_id" });
    if (configs.length > 0) {
      setSheetId(configs[0].value);
      setConfigId(configs[0].id);
      setSaved(true);
    }
  };

  const handleSave = async () => {
    if (!sheetId.trim()) return;
    setSaving(true);
    if (configId) {
      await base44.entities.AppConfig.update(configId, { key: "google_sheet_id", value: sheetId.trim() });
    } else {
      const result = await base44.entities.AppConfig.create({ key: "google_sheet_id", value: sheetId.trim() });
      setConfigId(result.id);
    }
    setSaved(true);
    setSaving(false);
    toast({ title: "ID salvo!", description: "Planilha configurada com sucesso." });
  };

  const handleInitSheet = async () => {
    if (!saved) return;
    setInitializing(true);
    const res = await base44.functions.invoke("initSheet", {});
    setInitializing(false);
    if (res.data?.success) {
      toast({ title: "Planilha inicializada!", description: "Cabeçalhos criados na aba Sheet1." });
    } else {
      toast({ title: "Erro", description: res.data?.error || "Tente novamente.", variant: "destructive" });
    }
  };

  // Extract ID from URL if user pastes full URL
  const handleInput = (val) => {
    const match = val.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (match) {
      setSheetId(match[1]);
    } else {
      setSheetId(val);
    }
    setSaved(false);
  };

  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-green-700" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/>
          </svg>
        </div>
        <h3 className="font-bold text-lg">Google Sheets</h3>
        {saved && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />}
      </div>

      <p className="text-sm text-muted-foreground">
        Cole o ID ou a URL completa da planilha onde os registros serão enviados automaticamente.
      </p>

      <a
        href="https://sheets.google.com/create"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
      >
        <ExternalLink className="w-3 h-3" />
        Criar nova planilha no Google
      </a>

      <Input
        placeholder="Cole o ID ou URL da planilha"
        value={sheetId}
        onChange={(e) => handleInput(e.target.value)}
        className="h-12 rounded-xl font-mono text-sm"
      />

      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          disabled={!sheetId.trim() || saving}
          className="flex-1 h-11 rounded-xl"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar ID"}
        </Button>
        <Button
          variant="outline"
          onClick={handleInitSheet}
          disabled={!saved || initializing}
          className="flex-1 h-11 rounded-xl"
        >
          {initializing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Criar cabeçalhos
        </Button>
      </div>

      {saved && (
        <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 rounded-xl p-3">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>Cada novo registro será enviado automaticamente para esta planilha.</span>
        </div>
      )}
    </div>
  );
}