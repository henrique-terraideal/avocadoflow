import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { PERIOD_TIMES } from '../../shared/periodRows.ts';

// Converte linhas antigas da aba "Registros" (período escrito na coluna Hora Início)
// para a estrutura nova: uma linha por período, com os horários padrão de cada período.
// Os registros vinculados na base de dados também são normalizados.

const PERIOD_ALIASES: Record<string, string> = {
  manha: "Manhã",
  tarde: "Tarde",
  noite: "Noite",
};

function normalize(text: string): string {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parsePeriods(value: string): string[] {
  const parts = String(value || "")
    .split(/[,;/\u00b7+]|\be\b/i)
    .map((p) => normalize(p))
    .filter(Boolean);
  const out: string[] = [];
  for (const part of parts) {
    const key = Object.keys(PERIOD_ALIASES).find((k) => part.includes(k));
    if (key && !out.includes(PERIOD_ALIASES[key])) out.push(PERIOD_ALIASES[key]);
  }
  return out;
}

function isLegacyRow(row: any[]): boolean {
  const value = String(row?.[4] ?? "").trim();
  if (!value) return false;
  if (/^\d{1,2}:\d{2}/.test(value)) return false;
  return parsePeriods(value).length > 0;
}

function pad(row: any[]): string[] {
  const copy = (row || []).map((c) => (c == null ? "" : String(c)));
  while (copy.length < 9) copy.push("");
  return copy.slice(0, 9);
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    const configs = await base44.asServiceRole.entities.AppConfig.filter({ key: "google_sheet_id" });
    if (!configs || configs.length === 0) {
      return Response.json({ error: "Planilha não configurada" }, { status: 400 });
    }
    const spreadsheetId = configs[0].value;

    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Registros!A1:I?valueRenderOption=FORMATTED_VALUE`;
    const readRes = await fetch(readUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!readRes.ok) {
      return Response.json({ error: await readRes.text() }, { status: 500 });
    }
    const { values = [] } = await readRes.json();
    const header = values[0] || [];
    const dataRows = values.slice(1).filter((r: any[]) => r.some((c) => String(c ?? "").trim() !== ""));

    const legacyRows = dataRows.filter(isLegacyRow);
    if (legacyRows.length === 0) {
      return Response.json({ success: true, legacy_rows: 0, new_rows: 0, records_updated: 0 });
    }

    const recordIds: string[] = [];
    const newRows: string[][] = [];
    for (const row of dataRows) {
      const cells = pad(row);
      if (!isLegacyRow(cells)) {
        newRows.push(cells);
        continue;
      }
      const periods = parsePeriods(cells[4]);
      if (cells[8]) recordIds.push(cells[8]);
      for (const period of periods) {
        const times = PERIOD_TIMES[period];
        const expanded = [...cells];
        expanded[4] = times?.start || "";
        expanded[5] = times?.end || "";
        newRows.push(expanded);
      }
    }

    // Normaliza os registros vinculados na base de dados
    let recordsUpdated = 0;
    if (recordIds.length > 0) {
      const { items = [] } = await base44.asServiceRole.entities.FieldRecord.filter({
        id: { $in: recordIds },
      });
      const updates = [];
      for (const record of items) {
        const sheetRow = legacyRows.find((r: any[]) => pad(r)[8] === record.id);
        const periods = parsePeriods(sheetRow ? pad(sheetRow)[4] : "");
        const current = Array.isArray(record.periods) ? record.periods.filter(Boolean) : [];
        const periodsDiffer = JSON.stringify(current) !== JSON.stringify(periods);
        const hasLegacyTimes = Boolean(record.start_time || record.end_time);
        if (periods.length > 0 && (periodsDiffer || hasLegacyTimes)) {
          updates.push({ id: record.id, periods, start_time: null, end_time: null });
        }
      }
      if (updates.length > 0 && !dryRun) {
        await base44.asServiceRole.entities.FieldRecord.bulkUpdate(updates);
      }
      recordsUpdated = updates.length;
    }

    if (dryRun) {
      return Response.json({
        success: true,
        dry_run: true,
        legacy_rows: legacyRows.length,
        new_rows: newRows.length,
        records_updated: recordsUpdated,
      });
    }

    const lastRow = newRows.length + 1;
    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Registros!A2:I${lastRow}?valueInputOption=USER_ENTERED`;
    const writeRes = await fetch(writeUrl, {
      method: "PUT",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: newRows }),
      signal: AbortSignal.timeout(20000),
    });
    if (!writeRes.ok) {
      return Response.json({ error: await writeRes.text() }, { status: 500 });
    }

    return Response.json({
      success: true,
      legacy_rows: legacyRows.length,
      new_rows: newRows.length,
      records_updated: recordsUpdated,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}