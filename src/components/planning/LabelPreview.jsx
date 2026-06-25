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

// Calculate qty_per_tank for a product if not already stored
function resolveQtyPerTank(p, raData) {
  if (p.qty_per_tank != null) return p.qty_per_tank;
  const tank = raData?.tank_capacity_liters;
  const lpha = raData?.liters_per_ha || 1000;
  if (!tank || !lpha || p.dose == null) return null;
  return parseFloat((p.dose * (tank / lpha)).toFixed(3));
}

export default function LabelPreview({ label, compact, forPrint }) {
  // Parse RA data helper — works for both old format (single product fields) and new format (products array)
  const detectRA = (details) => {
    for (const val of Object.values(details)) {
      try {
        const parsed = typeof val === "string" ? JSON.parse(val) : val;
        if (parsed && typeof parsed === "object" && parsed.ra_id) return parsed;
      } catch {}
    }
    return null;
  };

  if (forPrint) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(label.qrData)}`;
    let extraFields = [];
    let description = null;
    let photoUrl = null;
    let raData = null;
    if (label.additionalDetails) {
      let details = {};
      try { details = JSON.parse(label.additionalDetails); } catch {}
      raData = detectRA(details);
      if (label.labelFields && label.labelFields.length > 0) {
        extraFields = label.labelFields
          .filter(f => f.show_on_label && f.field_type !== "ra_selector" && details[f.field_label] !== undefined && details[f.field_label] !== "")
          .map(f => ({ label: f.field_label, value: details[f.field_label] }));
      }
      description = details["O que precisa ser feito?"] || details.descricao || details.observacoes || details.description;
      photoUrl = details["Foto"] || details.foto_manutencao || details.foto || details.photo_url;
    }

    return (
      <div className="label-page" style={{ width: "80mm", maxWidth: "80mm" }}>
        <div style={{ borderBottom: "2px solid #1a7a3a", paddingBottom: "2mm", marginBottom: "3mm", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div className="label-title">HP Avocado</div>
          <div className="label-subtitle">Boletim Diário de Serviços</div>
        </div>

        <div style={{ fontSize: "13pt", fontWeight: "800", color: "#111", lineHeight: 1.2, marginBottom: "2mm" }}>
          {label.operatorName}
        </div>

        <div style={{ fontSize: "11pt", fontWeight: "700", color: "#1a7a3a", lineHeight: 1.3, marginBottom: "3mm" }}>
          {label.operationCode}. {label.operationName}
        </div>

        <div style={{ display: "inline-block", background: "#f0f0f0", borderRadius: "3mm", padding: "1mm 3mm", fontSize: "9pt", fontWeight: "600", color: "#444", marginBottom: "4mm" }}>
          🌳 Pomar {label.orchardNumber}
        </div>

        <div className="label-divider" />

        {label.date && (
          <div style={{ fontSize: "8pt", color: "#555", marginBottom: "3mm" }}>
            📅 {format(new Date(label.date + "T12:00:00"), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </div>
        )}

        {description && (
          <div style={{ borderTop: "1px dashed #ccc", marginTop: "2mm", paddingTop: "2mm", marginBottom: "2mm" }}>
            <div style={{ fontSize: "8pt", marginBottom: "1.5mm" }}>
              <span style={{ fontWeight: "700", color: "#333" }}>Descrição: </span>
              <span style={{ color: "#555" }}>{description}</span>
            </div>
          </div>
        )}

        {photoUrl && (
          <div style={{ borderTop: "1px dashed #ccc", marginTop: "2mm", paddingTop: "2mm", marginBottom: "2mm" }}>
            <div style={{ fontSize: "8pt", marginBottom: "1mm", fontWeight: "700", color: "#333" }}>Foto:</div>
            <img src={photoUrl} alt="Foto" style={{ width: "100%", maxWidth: "70mm", borderRadius: "2mm", display: "block" }} />
          </div>
        )}

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

        {/* RA formatada — agora com múltiplos produtos */}
        {raData && (
          <div style={{ borderTop: "1px dashed #1a7a3a", marginTop: "2mm", paddingTop: "2mm", marginBottom: "2mm", background: "#f0f7f1", borderRadius: "2mm", padding: "2mm" }}>
            <div style={{ fontSize: "9pt", fontWeight: "800", color: "#1a7a3a", marginBottom: "1.5mm" }}>🌿 RA: {raData.code}</div>
            {raData.type && (
              <div style={{ fontSize: "8pt", marginBottom: "1mm" }}>
                <span style={{ fontWeight: "700", color: "#333" }}>Tipo: </span>
                <span style={{ color: "#555" }}>{raData.type}</span>
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
            {raData.implement_name && (
              <div style={{ fontSize: "8pt", marginBottom: "1mm" }}>
                <span style={{ fontWeight: "700", color: "#333" }}>Implemento: </span>
                <span style={{ color: "#555" }}>{raData.implement_name}</span>
              </div>
            )}
            {raData.implement_config && (
              <div style={{ fontSize: "8pt", marginBottom: "1mm" }}>
                <span style={{ fontWeight: "700", color: "#333" }}>Regulagem implemento: </span>
                <span style={{ color: "#555" }}>{raData.implement_config}</span>
              </div>
            )}
            {/* Lista de produtos */}
            {(raData.products || []).map((p, i) => {
              const qpt = resolveQtyPerTank(p, raData);
              return (
                <div key={i} style={{ background: "white", borderRadius: "1.5mm", padding: "1.5mm", marginTop: "1mm" }}>
                  <div style={{ fontSize: "8pt", fontWeight: "700", color: "#1a7a3a" }}>{p.product_name}</div>
                  {(p.active_ingredient || p.target) && (
                    <div style={{ fontSize: "7pt", color: "#2a6a4a", fontStyle: "italic" }}>
                      {p.active_ingredient ? `P.A.: ${p.active_ingredient}` : ""}
                      {p.active_ingredient && p.target ? " · " : ""}
                      {p.target ? `Alvo: ${p.target}` : ""}
                    </div>
                  )}
                  <div style={{ fontSize: "7pt", color: "#555" }}>
                    {p.application_mode || ""}
                    {p.dose != null ? ` · Dose: ${p.dose}${p.application_mode === "PLANTA" ? "/planta" : "/ha"}` : ""}
                    {p.total_quantity != null ? ` · Total: ${p.total_quantity}` : ""}
                  </div>
                  {qpt != null && (
                    <div style={{ fontSize: "8pt", fontWeight: "700", color: "#1a5599", marginTop: "0.5mm" }}>
                      🧴 {qpt} por tanque
                    </div>
                  )}
                  {p.obs && <div style={{ fontSize: "7pt", color: "#777" }}>{p.obs}</div>}
                </div>
              );
            })}
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
  let description = null;
  let photoUrl = null;
  let origin = null;
  let raData = null;
  if (label.additionalDetails) {
    try {
      const details = JSON.parse(label.additionalDetails);
      description = details["O que precisa ser feito?"] || details.descricao || details.observacoes || details.description;
      photoUrl = details["Foto"] || details.foto_manutencao || details.foto || details.photo_url;
      origin = details.origem || details.criado_via;
      raData = detectRA(details);
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

      {/* RA details — agora com múltiplos produtos */}
      {raData && (
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 space-y-1">
          <div className="flex items-center gap-1.5 mb-1">
            <Leaf className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-primary">RA: {raData.code}</span>
            {raData.orchard && <span className="text-[10px] text-muted-foreground">· {raData.orchard}</span>}
          </div>
          {raData.type && <p className="text-xs"><span className="font-medium">Tipo:</span> {raData.type}</p>}
          {raData.climate_conditions && <p className="text-xs"><span className="font-medium">Clima:</span> {raData.climate_conditions}</p>}
          {raData.machine_config && <p className="text-xs"><span className="font-medium">Maquinário:</span> {raData.machine_config}</p>}
          {raData.implement_name && <p className="text-xs"><span className="font-medium">Implemento:</span> {raData.implement_name}</p>}
          {raData.implement_config && <p className="text-xs"><span className="font-medium">Regulagem implemento:</span> {raData.implement_config}</p>}
          {(raData.products || []).map((p, i) => {
            const qpt = resolveQtyPerTank(p, raData);
            return (
              <div key={i} className="bg-background/50 rounded-lg p-1.5 mt-1">
                <p className="text-xs font-bold">{p.product_name}</p>
                {(p.active_ingredient || p.target) && (
                  <p className="text-[9px] text-primary/70 font-medium">
                    {p.active_ingredient ? `P.A.: ${p.active_ingredient}` : ""}
                    {p.active_ingredient && p.target ? " · " : ""}
                    {p.target ? `Alvo: ${p.target}` : ""}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {p.application_mode}
                  {p.dose != null ? ` · Dose: ${p.dose}${p.application_mode === "PLANTA" ? "/planta" : "/ha"}` : ""}
                  {p.total_quantity != null ? ` · Total: ${p.total_quantity}` : ""}
                </p>
                {qpt != null && (
                  <p className="text-xs text-blue-600 font-semibold">🧴 {qpt} por tanque</p>
                )}
                {p.obs && <p className="text-[10px] text-muted-foreground">{p.obs}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}