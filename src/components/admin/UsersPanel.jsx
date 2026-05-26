import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, ShieldCheck, User, Link2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function UsersPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ["users-admin"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: operators = [], isLoading: loadingOperators } = useQuery({
    queryKey: ["operators"],
    queryFn: () => base44.entities.Operator.filter({ active: true }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ userId, data }) => base44.entities.User.update(userId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-admin"] });
      toast({ title: "Usuário atualizado!" });
    },
  });

  const handleRoleChange = (userId, role) => {
    updateMutation.mutate({ userId, data: { role } });
  };

  const handleOperatorLink = (userId, operatorId) => {
    updateMutation.mutate({ userId, data: { linked_operator_id: operatorId === "none" ? "" : operatorId } });
  };

  if (loadingUsers || loadingOperators) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
        {users.length} usuário{users.length !== 1 ? "s" : ""}
      </p>

      {users.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground">Nenhum usuário cadastrado.</div>
      ) : (
        users.map((user) => (
          <div key={user.id} className="bg-card rounded-2xl border border-border p-4 space-y-3">
            {/* User info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{user.full_name || "—"}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>

            {/* Role */}
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground w-20">Nível de acesso</span>
              <Select
                value={user.role || "user"}
                onValueChange={(val) => handleRoleChange(user.id, val)}
                disabled={updateMutation.isPending}
              >
                <SelectTrigger className="flex-1 h-9 rounded-xl text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Operador</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Linked operator */}
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground w-20">Operador</span>
              <Select
                value={user.linked_operator_id || "none"}
                onValueChange={(val) => handleOperatorLink(user.id, val)}
                disabled={updateMutation.isPending}
              >
                <SelectTrigger className="flex-1 h-9 rounded-xl text-sm">
                  <SelectValue placeholder="Nenhum vinculado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {operators.map((op) => (
                    <SelectItem key={op.id} value={op.id}>
                      {op.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ))
      )}
    </div>
  );
}