import React from "react";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";

export default function TimeEntry({ startTime, endTime, onStartChange, onEndChange }) {
  const setCurrentTime = (setter) => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    setter(`${hh}:${mm}`);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Hora Início
        </label>
        <div className="flex gap-3 items-center">
          <input
            type="time"
            value={startTime}
            onChange={(e) => onStartChange(e.target.value)}
            className="flex-1 h-14 px-4 text-2xl font-mono bg-card border-2 border-border rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setCurrentTime(onStartChange)}
            className="h-14 px-4 rounded-xl border-2"
          >
            <Clock className="w-5 h-5 mr-2" />
            Agora
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Hora Fim
        </label>
        <div className="flex gap-3 items-center">
          <input
            type="time"
            value={endTime}
            onChange={(e) => onEndChange(e.target.value)}
            className="flex-1 h-14 px-4 text-2xl font-mono bg-card border-2 border-border rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          />
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={() => setCurrentTime(onEndChange)}
            className="h-14 px-4 rounded-xl border-2"
          >
            <Clock className="w-5 h-5 mr-2" />
            Agora
          </Button>
        </div>
      </div>
    </div>
  );
}