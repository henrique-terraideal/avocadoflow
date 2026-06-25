import React from "react";
import { User, Wrench, TreePine, Clock, X, Calendar, MapPin, ScanLine, FileText, Tag, History, Hash, Leaf, Package, Beaker, Thermometer, Tractor } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatDateTime(dt) {
  try {
    return format(new Date(dt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  } catch {
    return dt;
  }
}

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
          let isHourMeter = false;
          let hourMeterData = null;
          let isRA = false;
          let raData = null;
          // Try to parse JSON values (hour_meter, multiple_choice, RA, etc.)
          try {
            const parsedVal = JSON.parse(value);
            if (Array.isArray(parsedVal)) {
              displayValue = parsedVal.join(", ");
            } else if (typeof parsedVal === "object" && parsedVal !== null) {
              // Detect hour_meter: has start/end keys
              if ("start" in parsedVal || "end" in parsedVal) {
                isHourMeter = true;
                const s = parseFloat(parsedVal.start);
                const e = parseFloat(parsedVal.end);
                const d = parsedVal.delta || (!isNaN(s) && !isNaN(e) ? (e - s).toFixed(1) : null);
                hourMeterData = { start: parsedVal.start || "—", end: parsedVal.end || "—", delta: d };
              } else if ("ra_id" in parsedVal) {
                // Detect RA: has ra_id key
                isRA = true;
                raData = parsedVal;
              } else {
                displayValue = Object.entries(parsedVal).map(([k, v]) => `${k}: ${v}`).join(" · ");
              }
            }
          } catch {}
          // Check if it's a URL (photo/media)
          const isMedia = !isHourMeter && !isRA && typeof displayValue === "string" && displayValue.match(/^https?:\/\/.+\.(jpg|jpeg|png|webp|gif|mp4|webm|mp3|wav|ogg|m4a)/i);
          return { label, value: displayValue, isMedia, isHourMeter, hourMeterData, isRA, raData };
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
                    <p className="text-xs text-muted-foreground font-medium mb-2">{field.label}</p>
                    {field.isHourMeter ? (
                      <div className="space-y-1.5">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-background rounded-lg px-3 py-2 text-center">
                            <p className="text-[10px] text-muted-foreground mb-0.5">Inicial</p>
                            <p className="text-sm font-bold">{field.hourMeterData.start} h</p>
                          </div>
                          <div className="bg-background rounded-lg px-3 py-2 text-center">
                            <p className="text-[10px] text-muted-foreground mb-0.5">Final</p>
                            <p className="text-sm font-bold">{field.hourMeterData.end} h</p>
                          </div>
                        </div>
                        <div className="bg-primary/10 border border-primary/30 rounded-lg px-3 py-2 flex items-center justify-between">
                          <p className="text-xs text-muted-foreground font-medium">Δ Horas trabalhadas</p>
                          <p className="text-sm font-bold text-primary">{field.hourMeterData.delta != null ? `${field.hourMeterData.delta} h` : "—"}</p>
                        </div>
                      </div>
                    ) : field.isRA ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-lg px-3 py-2">
                          <Leaf className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-sm font-bold text-primary">{field.raData.code}</span>
                          {field.raData.orchard && <span className="text-xs text-muted-foreground">· {field.raData.orchard}</span>}
                        </div>
                        {field.raData.product && (
                          <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-1.5">
                            <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground font-medium">Produto: </span>
                            <span className="text-xs font-semibold">{field.raData.product}</span>
                          </div>
                        )}
                        {field.raData.type && (
                          <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-1.5">
                            <Beaker className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground font-medium">Tipo: </span>
                            <span className="text-xs font-semibold">{field.raData.type}</span>
                          </div>
                        )}
                        {field.raData.application_mode && (
                          <div className="flex items-center gap-2 bg-background rounded-lg px-3 py-1.5">
                            <Beaker className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="text-xs text-muted-foreground font-medium">Aplicação: </span>
                            <span className="text-xs font-semibold">
                              {field.raData.application_mode}
                              {field.raData.dose != null ? ` · Dose: ${field.raData.dose}` : ""}
                              {field.raData.total_quantity != null ? ` · Total: ${field.raData.total_quantity}` : ""}
                            </span>
                          </div>
                        )}
                        {field.raData.climate_conditions && (
                          <div className="flex items-start gap-2 bg-background rounded-lg px-3 py-1.5">
                            <Thermometer className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                            <span className="text-xs text-muted-foreground font-medium">Clima ideal: </span>
                            <span className="text-xs font-semibold">{field.raData.climate_conditions}</span>
                          </div>
                        )}
                        {field.raData.machine_config && (
                          <div className="flex items-start gap-2 bg-background rounded-lg px-3 py-1.5">
                            <Tractor className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                            <span className="text-xs text-muted-foreground font-medium">Maquinário: </span>
                            <span className="text-xs font-semibold">{field.raData.machine_config}</span>
                          </div>
                        )}
                        {field.raData.implement_config && (
                          <div className="flex items-start gap-2 bg-background rounded-lg px-3 py-1.5">
                            <Wrench className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                            <span className="text-xs text-muted-foreground font-medium">Implemento: </span>
                            <span className="text-xs font-semibold">{field.raData.implement_config}</span>
                          </div>
                        )}
                      </div>
                    ) : field.isMedia && typeof field.value === "string" && field.value.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
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

          {/* Log de Registro */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <History className="w-4 h-4 text-primary" />
              <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Log de Registro</p>
            </div>
            <div className="p-3 bg-muted/40 rounded-xl space-y-2">
              {record.id && (
                <div className="flex items-center gap-2">
                  <Hash className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">ID:</span>
                  <span className="text-xs font-mono text-muted-foreground truncate">{record.id}</span>
                </div>
              )}
              {record.operator_id && (
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">ID do Operador:</span>
                  <span className="text-xs font-mono text-muted-foreground truncate">{record.operator_id}</span>
                </div>
              )}
              {record.created_by_user_id && (
                <div className="flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">Criado por (usuário):</span>
                  <span className="text-xs font-mono text-muted-foreground truncate">{record.created_by_user_id}</span>
                </div>
              )}
              {record.created_date && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">Criado em:</span>
                  <span className="text-xs font-semibold">{formatDateTime(record.created_date)}</span>
                </div>
              )}
              {record.updated_date && (
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">Atualizado em:</span>
                  <span className="text-xs font-semibold">{formatDateTime(record.updated_date)}</span>
                </div>
              )}
              {record.qr_scanned !== undefined && (
                <div className="flex items-center gap-2">
                  <ScanLine className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">Preenchido via QR Code:</span>
                  <span className="text-xs font-semibold">{record.qr_scanned ? "Sim" : "Não"}</span>
                </div>
              )}
            </div>
          </div>

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