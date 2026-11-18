import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { buildSheetRows } from '../../shared/periodRows.ts';

// Sincroniza TODOS os registros do app para a planilha.
// Limpa a aba (mantendo cabeçalho) e reescreve tudo do zero.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    const configs = await base44.asServiceRole.entities.AppConfig.filter({ key: "google_sheet_id" });
    if (!configs || configs.length === 0) {
      return Response.json({ error: 'Planilha não configurada' }, { status: 400 });
    }
    const spreadsheetId = configs[0].value;

    // Busca todos os registros ordenados por data
    const records = await base44.asServiceRole.entities.FieldRecord.list("date", 1000);

    // Monta as linhas (uma por período de cada registro)
    const rows = records.flatMap((record) =>
      buildSheetRows(
        record,
        new Date(record.created_date).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
      )
    );

    // Limpa tudo abaixo do cabeçalho (linha 2 em diante)
    const clearUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Registros!A2:I?clear`;
    await fetch(clearUrl, {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
    });

    if (rows.length === 0) {
      return Response.json({ success: true, count: 0 });
    }

    // Escreve todos os registros de uma vez a partir de A2
    const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Registros!A2:I?valueInputOption=USER_ENTERED`;
    const writeRes = await fetch(writeUrl, {
      method: "PUT",
      headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: rows }),
    });

    if (!writeRes.ok) {
      return Response.json({ error: await writeRes.text() }, { status: 500 });
    }

    return Response.json({ success: true, count: rows.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});