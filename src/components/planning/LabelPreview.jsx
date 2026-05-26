import React from "react";

// QR code via API pública (não requer lib externa)
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

// Compact: preview inside app
export default function LabelPreview({ label, compact, forPrint }) {
  if (forPrint) {
    // HTML que será injetado na janela de impressão
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(label.qrData)}`;
    return (
      <div className="label-page">
        <div style={{ borderBottom: "2px solid #1a7a3a", paddingBottom: "2mm", marginBottom: "2mm" }}>
          <div className="label-title">HP Avocado</div>
          <div className="label-subtitle">Boletim Diário de Serviços</div>
        </div>
        <div className="label-row">Operador: <span>{label.operatorName}</span></div>
        <div className="label-row">Atividade: <span>{label.operationCode}. {label.operationName}</span></div>
        <div className="label-row">Pomar: <span>{label.orchardNumber}</span></div>
        <div className="label-divider" />
        <div className="label-qr">
          <img src={qrUrl} alt="QR" style={{ width: "35mm", height: "35mm" }} />
          <div style={{ fontSize: "7pt", color: "#888", marginTop: "1mm" }}>Escaneie para registrar</div>
        </div>
      </div>
    );
  }

  // Compact preview dentro do app
  return (
    <div className="flex items-start gap-4">
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          {label.operatorPhoto ? (
            <img src={label.operatorPhoto} alt={label.operatorName} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
              {label.operatorName[0]}
            </div>
          )}
          <span className="font-semibold text-sm">{label.operatorName}</span>
        </div>
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{label.operationCode}.</span> {label.operationName}
        </div>
        <div className="text-xs text-muted-foreground">
          Pomar: <span className="font-semibold text-foreground">{label.orchardNumber}</span>
        </div>
      </div>
      <div className="flex-shrink-0">
        <QRImg data={label.qrData} size={72} />
      </div>
    </div>
  );
}