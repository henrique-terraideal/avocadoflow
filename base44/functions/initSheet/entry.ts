import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    // Get spreadsheet ID from AppConfig entity
    const configs = await base44.asServiceRole.entities.AppConfig.filter({ key: "google_sheet_id" });
    if (!configs || configs.length === 0) {
      return Response.json({ error: 'Planilha não configurada. Salve o ID no painel Admin.' }, { status: 400 });
    }
    const spreadsheetId = configs[0].value;

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:H1?valueInputOption=USER_ENTERED`;
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

    return Response.json({ success: true, message: "Cabeçalhos criados na Sheet1" });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});