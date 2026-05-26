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

export default function LabelPreview({ label, compact, forPrint }) {
  if (forPrint) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(label.qrData)}`;
    return (
      <div className="label-page">
        {/* Header */}
        <div style={{ borderBottom: "2px solid #1a7a3a", paddingBottom: "2mm", marginBottom: "3mm", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="label-title">HP Avocado</div>
          <div className="label-subtitle">Boletim Diário de Serviços</div>
        </div>

        {/* Body: info + QR lado a lado */}
        <div style={{ display: "flex", gap: "3mm", alignItems: "center" }}>
          {/* Info */}
          <div style={{ flex: 1 }}>
            {/* Operador destaque */}
            <div style={{ fontSize: "11pt", fontWeight: "800", color: "#111", lineHeight: 1.2, marginBottom: "2mm" }}>
              {label.operatorName}
            </div>
            {/* Atividade destaque */}
            <div style={{ fontSize: "10pt", fontWeight: "700", color: "#1a7a3a", lineHeight: 1.3, marginBottom: "3mm" }}>
              {label.operationCode}. {label.operationName}
            </div>
            {/* Pomar */}
            <div style={{ display: "inline-block", background: "#f0f0f0", borderRadius: "3mm", padding: "1mm 3mm", fontSize: "9pt", fontWeight: "600", color: "#444" }}>
              🌳 Pomar {label.orchardNumber}
            </div>
          </div>

          {/* QR grande */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1mm" }}>
            <img src={qrUrl} alt="QR" style={{ width: "40mm", height: "40mm" }} />
            <div style={{ fontSize: "6.5pt", color: "#999" }}>Escaneie para registrar</div>
          </div>
        </div>
      </div>
    );
  }

  // Preview dentro do app
  return (
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
      </div>

      {/* QR grande */}
      <div className="shrink-0">
        <QRImg data={label.qrData} size={88} />
      </div>
    </div>
  );
}