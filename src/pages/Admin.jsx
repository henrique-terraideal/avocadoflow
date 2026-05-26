import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, ListChecks, Settings2, UserCog, TreePine } from "lucide-react";
import { Link } from "react-router-dom";

import OperatorsPanel from "../components/admin/OperatorsPanel";
import OperationsPanel from "../components/admin/OperationsPanel";
import SheetsConfig from "../components/admin/SheetsConfig";
import UsersPanel from "../components/admin/UsersPanel";
import OrchardsPanel from "../components/admin/OrchardsPanel";
import BottomNav from "../components/field/BottomNav";

const TABS = [
  { id: "operators", label: "Operadores", icon: Users, description: "Adicione e gerencie os operadores de campo" },
  { id: "operations", label: "Operações", icon: ListChecks, description: "Configure as operações disponíveis" },
  { id: "orchards", label: "Pomares", icon: TreePine, description: "Gerencie os pomares cadastrados" },
  { id: "users", label: "Usuários", icon: UserCog, description: "Controle de acesso e permissões" },
  { id: "config", label: "Configurações", icon: Settings2, description: "Integração com Google Sheets" },
];

export default function Admin() {
  const [activeTab, setActiveTab] = useState(null);

  if (activeTab) {
    const tab = TABS.find((t) => t.id === activeTab);
    const Icon = tab.icon;
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="bg-primary text-primary-foreground px-4 py-5 rounded-b-3xl">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={() => setActiveTab(null)} className="p-2 rounded-xl hover:bg-white/10 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold">{tab.label}</h1>
            </div>
          </div>
        </div>
        <div className="max-w-lg mx-auto px-4 py-5">
          {activeTab === "operators" && <OperatorsPanel />}
          {activeTab === "operations" && <OperationsPanel />}
          {activeTab === "orchards" && <OrchardsPanel />}
          {activeTab === "users" && <UsersPanel />}
          {activeTab === "config" && <SheetsConfig />}
        </div>
        <BottomNav />
      </div>
    );
  }

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
          <div>
            <h1 className="text-xl font-bold">Administração</h1>
            <p className="text-primary-foreground/70 text-sm">Gerencie operadores, operações e configurações</p>
          </div>
        </div>
      </div>

      {/* Menu Cards */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-3">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="w-full bg-card border border-border rounded-2xl px-5 py-4 flex items-center gap-4 hover:border-primary/40 hover:shadow-md transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-base">{tab.label}</p>
                <p className="text-sm text-muted-foreground">{tab.description}</p>
              </div>
              <ArrowLeft className="w-5 h-5 text-muted-foreground rotate-180" />
            </button>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}