import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    let spreadsheetId;

    // If create=true, create a new spreadsheet with headers in one shot
    if (body.create) {
      const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          properties: { title: "HP Avocado - Boletim de Serviços" },
          sheets: [{
            properties: { title: "Registros" },
            data: [{
              startRow: 0,
              startColumn: 0,
              rowData: [{
                values: [
                  "Data", "Operador", "Operação", "Pomar",
                  "Hora Início", "Hora Fim", "Observações", "Sincronizado em"
                ].map(v => ({ userEnteredValue: { stringValue: v }, userEnteredFormat: { textFormat: { bold: true } } }))
              }]
            }]
          }]
        }),
      });

      if (!createRes.ok) {
        return Response.json({ error: await createRes.text() }, { status: 500 });
      }

      const sheet = await createRes.json();
      spreadsheetId = sheet.spreadsheetId;
      const sheetUrl = sheet.spreadsheetUrl;

      // Save ID to AppConfig
      const configs = await base44.asServiceRole.entities.AppConfig.filter({ key: "google_sheet_id" });
      if (configs.length > 0) {
        await base44.asServiceRole.entities.AppConfig.update(configs[0].id, { value: spreadsheetId });
      } else {
        await base44.asServiceRole.entities.AppConfig.create({ key: "google_sheet_id", value: spreadsheetId });
      }

      return Response.json({ success: true, spreadsheetId, sheetUrl, created: true });
    }

    // Otherwise just write headers to existing sheet
    const configs = await base44.asServiceRole.entities.AppConfig.filter({ key: "google_sheet_id" });
    if (!configs || configs.length === 0) {
      return Response.json({ error: 'Planilha não configurada. Salve o ID no painel Admin.' }, { status: 400 });
    }
    spreadsheetId = configs[0].value;

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Registros!A1:H1?valueInputOption=USER_ENTERED`;
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [["Data", "Operador", "Operação", "Pomar", "Hora Início", "Hora Fim", "Observações", "Sincronizado em"]],
      }),
    });

    if (!response.ok) {
      return Response.json({ error: await response.text() }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});