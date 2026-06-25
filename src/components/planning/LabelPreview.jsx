import React from "react";
import { Leaf } from "lucide-react";

function QRImg({ data, size = 120 }) {
  const encoded = encodeURIComponent(data);
  return (
    <img
      src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encoded}`}
      alt="QR Code"
      width={size}
      height={size}
      style={{ imageRendering: "pixelated" }}
    />
  );
}

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function LabelPreview({ label, compact, forPrint }) {
  if (forPrint) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(label.qrData)}`;
    // Parse extra fields to show on label
    let extraFields = [];
    let description = null;
    let photoUrl = null;
    let raData = null;
    if (label.additionalDetails) {
      let details = {};
      try { details = JSON.parse(label.additionalDetails); } catch {}
      // Detect RA data in any custom field value
      for (const val of Object.values(details)) {
        try {
          const parsed = typeof val === "string" ? JSON.parse(val) : val;
          if (parsed && parsed.ra_id) { raData = parsed; break; }
        } catch {}
      }
      // Custom fields from templates (exclude RA fields — they're rendered separately)
      if (label.labelFields && label.labelFields.length > 0) {
        extraFields = label.labelFields
          .filter(f => f.show_on_label && f.field_type !== "ra_selector" && details[f.field_label] !== undefined && details[f.field_label] !== "")
          .map(f => ({ label: f.field_label, value: details[f.field_label] }));
      }
      // Quick action fields
      description = details["O que precisa ser feito?"] || details.descricao || details.observacoes || details.description;
      photoUrl = details["Foto"] || details.foto_manutencao || details.foto || details.photo_url;
    }

    return (
      <div className="label-page" style={{ width: "80mm", maxWidth: "80mm" }}>
        {/* Header */}
        <div style={{ borderBottom: "2px solid #1a7a3a", paddingBottom: "2mm", marginBottom: "3mm", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="label-title">HP Avocado</div>
          <div className="label-subtitle">Boletim Diário de Serviços</div>
        </div>

        {/* Operador destaque */}
        <div style={{ fontSize: "13pt", fontWeight: "800", color: "#111", lineHeight: 1.2, marginBottom: "2mm" }}>
          {label.operatorName}
        </div>

        {/* Atividade destaque */}
        <div style={{ fontSize: "11pt", fontWeight: "700", color: "#1a7a3a", lineHeight: 1.3, marginBottom: "3mm" }}>
          {label.operationCode}. {label.operationName}
        </div>

        {/* Pomar */}
        <div style={{ display: "inline-block", background: "#f0f0f0", borderRadius: "3mm", padding: "1mm 3mm", fontSize: "9pt", fontWeight: "600", color: "#444", marginBottom: "4mm" }}>
          🌳 Pomar {label.orchardNumber}
        </div>

        <div className="label-divider" />

        {/* Data planejada */}
        {label.date && (
          <div style={{ fontSize: "8pt", color: "#555", marginBottom: "3mm" }}>
            📅 {format(new Date(label.date + "T12:00:00"), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>
        )}

        {/* Descrição (WhatsApp Quick Action) */}
        {description && (
          <div style={{ borderTop: "1px dashed #ccc", marginTop: "2mm", paddingTop: "2mm", marginBottom: "2mm" }}>
            <div style={{ fontSize: "8pt", marginBottom: "1.5mm" }}>
              <span style={{ fontWeight: "700", color: "#333" }}>Descrição: </span>
              <span style={{ color: "#555" }}>{description}</span>
            </div>
          </div>
        )}

        {/* Foto da manutenção */}
        {photoUrl && (
          <div style={{ borderTop: "1px dashed #ccc", marginTop: "2mm", paddingTop: "2mm", marginBottom: "2mm" }}>
            <div style={{ fontSize: "8pt", marginBottom: "1mm", fontWeight: "700", color: "#333" }}>Foto:</div>
            <img src={photoUrl} alt="Foto" style={{ width: "100%", maxWidth: "70mm", borderRadius: "2mm", display: "block" }} />
          </div>
        )}

        {/* Campos extras de templates */}
        {extraFields.length > 0 && (
          <div style={{ borderTop: "1px dashed #ccc", marginTop: "2mm", paddingTop: "2mm", marginBottom: "2mm" }}>
            {extraFields.map((ef, i) => (
              <div key={i} style={{ fontSize: "8pt", marginBottom: "1.5mm" }}>
                <span style={{ fontWeight: "700", color: "#333" }}>{ef.label}: </span>
                <span style={{ color: "#555" }}>{ef.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* RA formatada */}
        {raData && (
          <div style={{ borderTop: "1px dashed #1a7a3a", marginTop: "2mm", paddingTop: "2mm", marginBottom: "2mm", background: "#f0f7f1", borderRadius: "2mm", padding: "2mm" }}>
            <div style={{ fontSize: "9pt", fontWeight: "800", color: "#1a7a3a", marginBottom: "1.5mm" }}>🌿 RA: {raData.code}</div>
            {raData.product && (
              <div style={{ fontSize: "8pt", marginBottom: "1mm" }}>
                <span style={{ fontWeight: "700", color: "#333" }}>Produto: </span>
                <span style={{ color: "#555" }}>{raData.product}</span>
              </div>
            )}
            {raData.type && (
              <div style={{ fontSize: "8pt", marginBottom: "1mm" }}>
                <span style={{ fontWeight: "700", color: "#333" }}>Tipo: </span>
                <span style={{ color: "#555" }}>{raData.type}</span>
              </div>
            )}
            {raData.application_mode && (
              <div style={{ fontSize: "8pt", marginBottom: "1mm" }}>
                <span style={{ fontWeight: "700", color: "#333" }}>Aplicação: </span>
                <span style={{ color: "#555" }}>
                  {raData.application_mode}
                  {raData.dose != null ? ` · Dose: ${raData.dose}` : ""}
                  {raData.total_quantity != null ? ` · Total: ${raData.total_quantity}` : ""}
                </span>
              </div>
            )}
            {raData.climate_conditions && (
              <div style={{ fontSize: "8pt", marginBottom: "1mm" }}>
                <span style={{ fontWeight: "700", color: "#333" }}>Clima: </span>
                <span style={{ color: "#555" }}>{raData.climate_conditions}</span>
              </div>
            )}
            {raData.machine_config && (
              <div style={{ fontSize: "8pt", marginBottom: "1mm" }}>
                <span style={{ fontWeight: "700", color: "#333" }}>Maquinário: </span>
                <span style={{ color: "#555" }}>{raData.machine_config}</span>
              </div>
            )}
            {raData.implement_config && (
              <div style={{ fontSize: "8pt", marginBottom: "1mm" }}>
                <span style={{ fontWeight: "700", color: "#333" }}>Implemento: </span>
                <span style={{ color: "#555" }}>{raData.implement_config}</span>
              </div>
            )}
          </div>
        )}

        {/* QR centralizado em baixo */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1mm", marginTop: "2mm" }}>
          <img src={qrUrl} alt="QR" style={{ width: "60mm", height: "60mm" }} />
          <div style={{ fontSize: "7pt", color: "#999" }}>Escaneie para registrar</div>
        </div>
      </div>
    );
  }

  // Preview dentro do app
  // Parse additional details (description, photo, origin)
  let description = null;
  let photoUrl = null;
  let origin = null;
  let raData = null;
  if (label.additionalDetails) {
    try {
      const details = JSON.parse(label.additionalDetails);
      // Formato WhatsApp Quick Action
      description = details["O que precisa ser feito?"] || details.descricao || details.observacoes || details.description;
      photoUrl = details["Foto"] || details.foto_manutencao || details.foto || details.photo_url;
      origin = details.origem || details.criado_via;
      // Detect RA data in any custom field value
      for (const val of Object.values(details)) {
        try {
          const parsed = JSON.parse(val);
          if (parsed && parsed.ra_id) { raData = parsed; break; }
        } catch {}
      }
    } catch {}
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-3 items-center">
        {/* Info */}
        <div className="flex-1 space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            {label.operatorPhoto ? (
              <img src={label.operatorPhoto} alt={label.operatorName} className="w-9 h-9 rounded-full object-cover shrink-0" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                {label.operatorName[0]}
              </div>
            )}
            <span className="font-bold text-base leading-tight truncate">{label.operatorName}</span>
          </div>
          <div className="text-sm font-semibold text-primary leading-tight truncate">
            {label.operationCode}. {label.operationName}
          </div>
          <div className="inline-block bg-muted rounded-lg px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            🌳 Pomar {label.orchardNumber}
          </div>
          {label.date && (
            <div className="text-xs text-muted-foreground/70 mt-1">
              📅 {format(new Date(label.date + "T12:00:00"), "dd/MM/yyyy")}
            </div>
          )}
          {origin === 'whatsapp_quick_action' && (
            <div className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg inline-block mt-1 font-medium">
              📱 Via WhatsApp
            </div>
          )}
        </div>

        {/* QR grande */}
        <div className="shrink-0">
          <QRImg data={label.qrData} size={88} />
        </div>
      </div>

      {/* Descrição e foto */}
      {description && (
        <div className="bg-muted/50 rounded-xl p-3 border border-border">
          <p className="text-xs font-medium text-muted-foreground mb-1">Descrição:</p>
          <p className="text-sm text-foreground">{description}</p>
        </div>
      )}
      {photoUrl && (
        <div className="rounded-xl overflow-hidden border border-border">
          <img src={photoUrl} alt="Foto da manutenção" className="w-full h-48 object-cover" />
        </div>
      )}

      {/* RA details */}
      {raData && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-1">
          <div className="flex items-center gap-1.5 mb-1">
            <Leaf className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-primary">RA: {raData.code}</span>
            {raData.orchard && <span className="text-[10px] text-muted-foreground">· {raData.orchard}</span>}
          </div>
          {raData.product && <p className="text-xs"><span className="font-medium">Produto:</span> {raData.product}</p>}
          {raData.application_mode && (
            <p className="text-xs"><span className="font-medium">Aplicação:</span> {raData.application_mode}
              {raData.dose != null ? ` · Dose: ${raData.dose}` : ""}
              {raData.total_quantity != null ? ` · Total: ${raData.total_quantity}` : ""}
            </p>
          )}
          {raData.climate_conditions && <p className="text-xs"><span className="font-medium">Clima:</span> {raData.climate_conditions}</p>}
          {raData.machine_config && <p className="text-xs"><span className="font-medium">Maquinário:</span> {raData.machine_config}</p>}
          {raData.implement_config && <p className="text-xs"><span className="font-medium">Implemento:</span> {raData.implement_config}</p>}
        </div>
      )}
    </div>
  );
}