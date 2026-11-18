import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Remove da aba "Registros" todas as linhas cuja DATA DA ATIVIDADE (coluna A)
// seja anterior à data de corte informada. O cabeçalho (linha 1) é preservado
// e nenhum registro do banco de dados é alterado.

const SHEET_NAME = "Registros";
const EPOCH_UTC = Date.UTC(1899, 11, 30);
const DAY_MS = 86400000;

function toSerial(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return (Date.UTC(y, m - 1, d) - EPOCH_UTC) / DAY_MS;
}

// A planilha pode devolver a data como número serial (célula tipada como data)
// ou como texto. Retorna o serial, ou null quando não for reconhecível.
function rowDateSerial(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const text = String(value).trim();

  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return toSerial(`${match[1]}-${match[2]}-${match[3]}`);

  match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (match) {
    const day = match[1].padStart(2, "0");
    const month = match[2].padStart(2, "0");
    return toSerial(`${match[3]}-${month}-${day}`);
  }

  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const cutoffDate = String(body.cutoff_date || "").trim();
    const dryRun = body.dry_run === true;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(cutoffDate)) {
      return Response.json({ error: 'cutoff_date inválida (use AAAA-MM-DD)' }, { status: 400 });
    }
    const cutoffSerial = toSerial(cutoffDate);

    const configs = await base44.asServiceRole.entities.AppConfig.filter({ key: "google_sheet_id" });
    if (!configs || configs.length === 0) {
      return Response.json({ error: 'Planilha não configurada' }, { status: 400 });
    }
    const spreadsheetId = configs[0].value;

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    // Lê as linhas de dados (linha 2 em diante) com os valores brutos,
    // para que datas venham como número serial e possam ser comparadas.
    const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${SHEET_NAME}!A2:I?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=SERIAL_NUMBER`;
    const readRes = await fetch(readUrl, { headers: { "Authorization": `Bearer ${accessToken}` } });
    if (!readRes.ok) {
      return Response.json({ error: await readRes.text() }, { status: 500 });
    }

    const { values = [] } = await readRes.json();

    // Índices 0-based dentro da aba: a linha 2 da planilha é o índice 1
    const rowsToDelete: number[] = [];
    let kept = 0;

    values.forEach((row: any[], index: number) => {
      const isEmpty = !row || row.every((cell) => cell === "" || cell === null || cell === undefined);
      if (isEmpty) return;

      const serial = rowDateSerial(row[0]);
      if (serial !== null && serial < cutoffSerial) {
        rowsToDelete.push(index + 1);
      } else {
        kept += 1;
      }
    });

    if (dryRun) {
      return Response.json({ success: true, dry_run: true, to_remove: rowsToDelete.length, kept });
    }

    if (rowsToDelete.length === 0) {
      return Response.json({ success: true, removed: 0, kept });
    }

    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      { headers: { "Authorization": `Bearer ${accessToken}` } }
    );
    const meta = await metaRes.json();
    const sheet = meta.sheets?.find((s: any) => s.properties.title === SHEET_NAME);
    if (!sheet) {
      return Response.json({ error: `Aba "${SHEET_NAME}" não encontrada` }, { status: 400 });
    }
    const sheetId = sheet.properties.sheetId;

    // Deleta de baixo para cima para não deslocar os índices das demais linhas
    const deleteRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`,
      {
        method: "POST",
        headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: [...rowsToDelete].sort((a, b) => b - a).map((index) => ({
            deleteDimension: {
              range: { sheetId, dimension: "ROWS", startIndex: index, endIndex: index + 1 },
            },
          })),
        }),
      }
    );

    if (!deleteRes.ok) {
      return Response.json({ error: await deleteRes.text() }, { status: 500 });
    }

    return Response.json({ success: true, removed: rowsToDelete.length, kept });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});