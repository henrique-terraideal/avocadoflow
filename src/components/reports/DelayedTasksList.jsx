import React from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, User, Wrench, TreePine, Calendar, CheckCircle2 } from "lucide-react";

export default function DelayedTasksList({ tasks }) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-green-500" />
        <p className="text-sm font-medium">Nenhuma tarefa atrasada</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => (
        <div key={task.id} className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-red-500" />
              <span className="font-semibold text-sm">{task.operator_name}</span>
            </div>
            <span className="flex items-center gap-1 text-xs text-red-500 font-bold">
              <AlertTriangle className="w-3 h-3" />
              Atrasada
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Wrench className="w-3 h-3" />
              {task.operation_code}. {task.operation_name}
            </span>
            <span className="flex items-center gap-1">
              <TreePine className="w-3 h-3" />
              {task.orchard_number}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {(() => {
                try { return format(new Date(task.date + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR }); }
                catch { return task.date; }
              })()}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}