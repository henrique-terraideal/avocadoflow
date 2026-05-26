import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { PlusCircle, List, Settings, ClipboardList } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function BottomNav() {
  const location = useLocation();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    base44.auth.me().then((u) => setIsAdmin(u?.role === "admin")).catch(() => {});
  }, []);

  const NAV_ITEMS = [
    { to: "/", icon: PlusCircle, label: "Novo" },
    { to: "/registros", icon: List, label: "Registros" },
    ...(isAdmin ? [
      { to: "/planejamento", icon: ClipboardList, label: "Planejar" },
      { to: "/admin", icon: Settings, label: "Admin" },
    ] : []),
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border z-40">
      <div className="max-w-lg mx-auto flex">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.to;
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors
                ${isActive ? "text-primary" : "text-muted-foreground"}`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="h-safe-area-bottom" />
    </div>
  );
}