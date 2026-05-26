import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Trash2, User, Upload, Loader2, QrCode } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

import QRGenerator from "../components/field/QRGenerator";
import BottomNav from "../components/field/BottomNav";

export default function Admin() {
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
      await base44.entities.Operator.create({ name, photo_url, active: true });
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
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-primary text-primary-foreground px-4 py-5 rounded-b-3xl">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Administração</h1>
            <p className="text-primary-foreground/70 text-sm">Gerenciar operadores e QR Codes</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Add operator */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h3 className="font-bold text-lg">Novo Operador</h3>
          <Input
            placeholder="Nome do operador"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 rounded-xl"
          />
          <div className="flex gap-3">
            <label className="flex-1 flex items-center gap-2 px-4 h-12 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary/40 transition-colors">
              <Upload className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
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
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Adicionar
            </Button>
          </div>
        </div>

        {/* Operators list */}
        <div className="space-y-3">
          <h3 className="font-bold text-lg">Operadores ({operators.length})</h3>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            operators.map((op) => (
              <div
                key={op.id}
                className="bg-card rounded-xl border border-border p-4 flex items-center gap-3"
              >
                {op.photo_url ? (
                  <img src={op.photo_url} alt={op.name} className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <span className="flex-1 font-semibold">{op.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowQR(showQR === op.id ? null : op.id)}
                  className="text-primary"
                >
                  <QrCode className="w-5 h-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(op.id)}
                  className="text-destructive"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            ))
          )}
        </div>

        {showQR && <QRGenerator operatorName={operators.find(o => o.id === showQR)?.name || ""} />}
      </div>

      <BottomNav />
    </div>
  );
}