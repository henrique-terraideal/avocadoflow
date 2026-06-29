import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, LogOut, Save, User, Loader2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import BottomNav from "../components/field/BottomNav";

export default function Profile() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [fullName, setFullName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => {
      setUser(u);
      setFullName(u?.full_name || "");
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await base44.auth.updateMe({ full_name: fullName });
    toast({ title: "Perfil atualizado!" });
    setSaving(false);
  };

  const handleLogout = () => {
    base44.auth.logout("/");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="bg-primary text-primary-foreground px-4 py-5 rounded-b-3xl">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Meu Perfil</h1>
            <p className="text-primary-foreground/70 text-sm">Edite suas informações</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-3xl font-bold">
            {user?.full_name?.[0]?.toUpperCase() || <User className="w-8 h-8" />}
          </div>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        {/* Form */}
        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nome completo</label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Email</label>
            <Input value={user?.email || ""} disabled className="opacity-60" />
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || !fullName.trim()}
            className="w-full rounded-xl h-11"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" />Salvar</>}
          </Button>
        </div>

        {/* Atualizar app */}
        <div className="bg-card rounded-2xl border border-border p-4">
          <p className="text-sm text-muted-foreground mb-3">
            Não está vendo as atualizações? Recarregue o aplicativo para garantir a versão mais recente.
          </p>
          <Button
            variant="outline"
            onClick={() => window.location.reload(true)}
            className="w-full rounded-xl h-11"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar aplicativo
          </Button>
        </div>

        {/* Logout */}
        <Button
          variant="outline"
          onClick={handleLogout}
          className="w-full rounded-xl h-11 text-destructive border-destructive/30 hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair da conta
        </Button>
      </div>

      <BottomNav />
    </div>
  );
}