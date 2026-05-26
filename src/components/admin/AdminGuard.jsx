import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ShieldX } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function AdminGuard({ children }) {
  const [status, setStatus] = useState("loading"); // loading | ok | denied

  useEffect(() => {
    base44.auth.me().then((user) => {
      if (user?.role === "admin") setStatus("ok");
      else setStatus("denied");
    }).catch(() => setStatus("denied"));
  }, []);

  if (status === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (status === "denied") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <ShieldX className="w-8 h-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold mb-2">Acesso restrito</h2>
        <p className="text-muted-foreground mb-6">Esta área é exclusiva para administradores.</p>
        <Link to="/"><Button className="rounded-xl">Voltar ao início</Button></Link>
      </div>
    );
  }

  return children;
}