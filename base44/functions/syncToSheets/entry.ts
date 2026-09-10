import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();

    const record = body.data;
    if (!record || !record.id) {
      return Response.json({ error: 'No record data provided' }, { status: 400 });
    }

    // Fetch the real record from the DB to prevent arbitrary data injection into the sheet.
    let realRecord;
    try {
      realRecord = await base44.asServiceRole.entities.FieldRecord.get(record.id);
    } catch (_) {}
    if (!realRecord) {
      return Response.json({ error: 'Record not found' }, { status: 404 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    // Get spreadsheet ID from AppConfig entity
    const configs = await base44.asServiceRole.entities.AppConfig.filter({ key: "google_sheet_id" });
    if (!configs || configs.length === 0) {
      return Response.json({ error: 'Planilha não configurada' }, { status: 400 });
    }
    const spreadsheetId = configs[0].value;

    const row = [
      realRecord.date || new Date().toISOString().split("T")[0],
      realRecord.operator_name || "",
      realRecord.operation || "",
      realRecord.orchard_number || "",
      realRecord.start_time || "",
      realRecord.end_time || "",
      realRecord.observations || "",
      new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
      realRecord.id || "", // coluna I: ID interno para rastrear e deletar depois
    ];

    // OVERWRITE: preenche a próxima linha vazia (funciona mesmo se linhas foram removidas manualmente)
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Registros:append?valueInputOption=USER_ENTERED&insertDataOption=OVERWRITE`;

    const response = await fetch(appendUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [row] }),
    });

    if (!response.ok) {
      return Response.json({ error: await response.text() }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});