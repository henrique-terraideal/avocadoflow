import React from "react";
import { User, Wrench, TreePine, Clock, X, Calendar, MapPin, ScanLine, FileText, Tag } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function RecordDetailModal({ record, onClose }) {
  if (!record) return null;

  const details = [];
  if (record.observations) details.push({ label: "Observações", value: record.observations });

  // Parse additional_details if present
  let customFields = [];
  if (record.additional_details) {
    try {
      const parsed = JSON.parse(record.additional_details);
      if (parsed && typeof parsed === "object") {
        customFields = Object.entries(parsed).map(([label, value]) => {
          let displayValue = value;
          // Try to parse JSON values (hour_meter, multiple_choice, etc.)
          try {
            const parsedVal = JSON.parse(value);
            if (Array.isArray(parsedVal)) displayValue = parsedVal.join(", ");
            else if (typeof parsedVal === "object") {
              displayValue = Object.entries(parsedVal)
                .map(([k, v]) => `${k}: ${v}`)
                .join(" · ");
            }
          } catch {}
          // Check if it's a URL (photo/media)
          const isMedia = typeof displayValue === "string" && displayValue.match(/^https?:\/\/.+\.(jpg|jpeg|png|webp|gif|mp4|webm|mp3|wav|ogg|m4a)/i);
          return { label, value: displayValue, isMedia };
        });
      }
    } catch {}
  }

  const items = [
    { icon: User, label: "Operador", value: record.operator_name },
    { icon: Wrench, label: "Operação", value: record.operation },
    { icon: TreePine, label: "Pomar", value: record.orchard_number },
    { icon: Clock, label: "Horário", value: `${record.start_time} → ${record.end_time}` },
    { icon: Calendar, label: "Data", value: record.date ? format(new Date(record.date + "T12:00:00"), "dd/MM/yyyy") : "—" },
  ];

  if (record.planned_date && record.planned_date !== record.date) {
    items.push({ icon: Calendar, label: "Planejado para", value: format(new Date(record.planned_date + "T12:00:00"), "dd/MM/yyyy") });
  }
  if (record.qr_scanned) {
    items.push({ icon: ScanLine, label: "Origem", value: "Preenchido via QR Code" });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card rounded-t-3xl z-10">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-base">Detalhes do Registro</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Main info */}
          <div className="space-y-2.5">
            {items.map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="flex items-center gap-3 p-3 bg-muted/40 rounded-xl">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground font-medium">{item.label}</p>
                    <p className="text-sm font-semibold capitalize">{item.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Observations */}
          {record.observations && (
            <div className="p-3 bg-muted/40 rounded-xl">
              <div className="flex items-center gap-2 mb-1.5">
                <FileText className="w-4 h-4 text-primary" />
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Observações</p>
              </div>
              <p className="text-sm whitespace-pre-wrap">{record.observations}</p>
            </div>
          )}

          {/* Custom fields */}
          {customFields.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Tag className="w-4 h-4 text-primary" />
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Campos Extras</p>
              </div>
              <div className="space-y-2">
                {customFields.map((field, i) => (
                  <div key={i} className="p-3 bg-muted/40 rounded-xl">
                    <p className="text-xs text-muted-foreground font-medium mb-1">{field.label}</p>
                    {field.isMedia && typeof field.value === "string" && field.value.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                      <img src={field.value} alt={field.label} className="w-full rounded-lg" />
                    ) : field.isMedia && typeof field.value === "string" && field.value.match(/\.(mp4|webm)$/i) ? (
                      <video src={field.value} controls className="w-full rounded-lg" />
                    ) : field.isMedia && typeof field.value === "string" && field.value.match(/\.(mp3|wav|ogg|m4a)$/i) ? (
                      <audio src={field.value} controls className="w-full" />
                    ) : (
                      <p className="text-sm font-semibold whitespace-pre-wrap">{field.value}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}