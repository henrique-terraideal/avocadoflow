import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, User, Upload, Loader2, QrCode } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import QRGenerator from "../field/QRGenerator";

export default function OperatorsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showQR, setShowQR] = useState(null);

  const { data: operators = [], isLoading } = useQuery({
    queryKey: ["operators"],
    queryFn: () => base44.entities.Operator.list("-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      setUploading(true);
      let photo_url = "";
      if (photoFile) {
        const result = await base44.integrations.Core.UploadFile({ file: photoFile });
        photo_url = result.file_url;
      }
      await base44.entities.Operator.create({ name: name.trim(), photo_url, active: true });
      setUploading(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operators"] });
      setName("");
      setPhotoFile(null);
      toast({ title: "Operador adicionado!" });
    },
    onError: () => setUploading(false),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Operator.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operators"] });
      toast({ title: "Operador removido" });
    },
  });

  return (
    <div className="space-y-5">
      {/* Add operator */}
      <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
        <h3 className="font-bold text-base">Novo Operador</h3>
        <Input
          placeholder="Nome do operador"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-12 rounded-xl"
        />
        <div className="flex gap-3">
          <label className="flex-1 flex items-center gap-2 px-4 h-12 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary/40 transition-colors">
            <Upload className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground truncate">
              {photoFile ? photoFile.name : "Foto (opcional)"}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
            />
          </label>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={!name.trim() || uploading}
            className="h-12 rounded-xl px-6"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Adicionar
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          {operators.length} operador{operators.length !== 1 ? "es" : ""}
        </p>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : operators.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">Nenhum operador cadastrado.</div>
        ) : (
          operators.map((op) => (
            <div key={op.id} className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
              {op.photo_url ? (
                <img src={op.photo_url} alt={op.name} className="w-11 h-11 rounded-full object-cover" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <span className="flex-1 font-semibold">{op.name}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteMutation.mutate(op.id)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </div>
          ))
        )}
      </div>

      {showQR && (
        <QRGenerator operatorName={operators.find((o) => o.id === showQR)?.name || ""} />
      )}
    </div>
  );
}