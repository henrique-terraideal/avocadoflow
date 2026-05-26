import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, ListChecks, Settings2, UserCog } from "lucide-react";
import { Link } from "react-router-dom";

import OperatorsPanel from "../components/admin/OperatorsPanel";
import OperationsPanel from "../components/admin/OperationsPanel";
import SheetsConfig from "../components/admin/SheetsConfig";
import UsersPanel from "../components/admin/UsersPanel";
import BottomNav from "../components/field/BottomNav";

const TABS = [
  { id: "operators", label: "Operadores", icon: Users },
  { id: "operations", label: "Operações", icon: ListChecks },
  { id: "users", label: "Usuários", icon: UserCog },
  { id: "config", label: "Config", icon: Settings2 },
];

export default function Admin() {
  const [activeTab, setActiveTab] = useState("operators");

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-primary text-primary-foreground px-4 py-5 rounded-b-3xl">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <Link to="/">
            <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-white/10">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Administração</h1>
            <p className="text-primary-foreground/70 text-sm">Gerencie operadores, operações e configurações</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-lg mx-auto px-4 mt-5">
        <div className="flex bg-muted rounded-2xl p-1 gap-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all
                  ${isActive ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab labels on mobile */}
      <div className="max-w-lg mx-auto px-4 mt-1 flex sm:hidden">
        {TABS.map((tab) => (
          <div key={tab.id} className="flex-1 text-center text-[10px] font-semibold text-muted-foreground">
            {tab.label}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="max-w-lg mx-auto px-4 py-5">
        {activeTab === "operators" && <OperatorsPanel />}
        {activeTab === "operations" && <OperationsPanel />}
        {activeTab === "users" && <UsersPanel />}
        {activeTab === "config" && <SheetsConfig />}
      </div>

      <BottomNav />
    </div>
  );
}