import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const record = body.data;
    if (!record) {
      return Response.json({ error: 'No record data provided' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    // Get spreadsheet ID from AppConfig entity
    const configs = await base44.asServiceRole.entities.AppConfig.filter({ key: "google_sheet_id" });
    if (!configs || configs.length === 0) {
      return Response.json({ error: 'Planilha não configurada' }, { status: 400 });
    }
    const spreadsheetId = configs[0].value;

    const row = [
      record.date || new Date().toISOString().split("T")[0],
      record.operator_name || "",
      record.operation || "",
      record.orchard_number || "",
      record.start_time || "",
      record.end_time || "",
      record.observations || "",
      new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }),
    ];

    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

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