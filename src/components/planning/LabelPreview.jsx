import React from "react";

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
    if (label.additionalDetails) {
      let details = {};
      try { details = JSON.parse(label.additionalDetails); } catch {}
      // Custom fields from templates
      if (label.labelFields && label.labelFields.length > 0) {
        extraFields = label.labelFields
          .filter(f => f.show_on_label && details[f.field_label] !== undefined && details[f.field_label] !== "")
          .map(f => ({ label: f.field_label, value: details[f.field_label] }));
      }
      // Quick action fields
      description = details.descricao || details.observacoes || details.description;
      photoUrl = details.foto_manutencao || details.foto || details.photo_url;
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
  if (label.additionalDetails) {
    try {
      const details = JSON.parse(label.additionalDetails);
      // Formato WhatsApp Quick Action
      description = details["O que precisa ser feito?"] || details.descricao || details.observacoes || details.description;
      photoUrl = details["Foto"] || details.foto_manutencao || details.foto || details.photo_url;
      origin = details.origem || details.criado_via;
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
    </div>
  );
}