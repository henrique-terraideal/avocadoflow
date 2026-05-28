import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Deleta a linha da planilha que corresponde ao record_id fornecido.
// A coluna I (índice 8) guarda o record_id internamente.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { record_id } = body;
    if (!record_id) {
      return Response.json({ error: 'record_id is required' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    const configs = await base44.asServiceRole.entities.AppConfig.filter({ key: "google_sheet_id" });
    if (!configs || configs.length === 0) {
      return Response.json({ error: 'Planilha não configurada' }, { status: 400 });
    }
    const spreadsheetId = configs[0].value;

    // Busca todos os valores da coluna I (record_id) para encontrar a linha
    const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Registros!I:I`;
    const getRes = await fetch(getUrl, {
      headers: { "Authorization": `Bearer ${accessToken}` },
    });

    if (!getRes.ok) {
      return Response.json({ error: await getRes.text() }, { status: 500 });
    }

    const { values = [] } = await getRes.json();

    // Encontra o índice da linha (0-based) que contém o record_id
    const rowIndex = values.findIndex((row) => row[0] === record_id);
    if (rowIndex === -1) {
      // Registro não encontrado na planilha — ok, não há nada para deletar
      return Response.json({ success: true, not_found: true });
    }

    // Busca o sheetId interno da aba "Registros"
    const metaRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
      { headers: { "Authorization": `Bearer ${accessToken}` } }
    );
    const meta = await metaRes.json();
    const sheet = meta.sheets?.find((s) => s.properties.title === "Registros");
    if (!sheet) {
      return Response.json({ error: 'Aba "Registros" não encontrada' }, { status: 400 });
    }
    const sheetId = sheet.properties.sheetId;

    // Deleta a linha usando batchUpdate
    const deleteUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const deleteRes = await fetch(deleteUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [{
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
          },
        }],
      }),
    });

    if (!deleteRes.ok) {
      return Response.json({ error: await deleteRes.text() }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});