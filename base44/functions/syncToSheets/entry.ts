import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Get the FieldRecord data from the automation payload
    const record = body.data;
    if (!record) {
      return Response.json({ error: 'No record data provided' }, { status: 400 });
    }

    // Get Google Sheets access token
    const { accessToken } = await base44.asServiceRole.connectors.getConnection("googlesheets");

    // Get the spreadsheet ID from env or use a default
    const spreadsheetId = Deno.env.get("GOOGLE_SHEET_ID");
    if (!spreadsheetId) {
      return Response.json({ error: 'GOOGLE_SHEET_ID not configured' }, { status: 500 });
    }

    // Format the row data
    const row = [
      record.date || new Date().toISOString().split("T")[0],
      record.operator_name || "",
      record.operation || "",
      record.orchard_number || "",
      record.start_time || "",
      record.end_time || "",
      record.observations || "",
      new Date().toISOString(), // timestamp of sync
    ];

    // Ensure the header row exists (first call creates it if sheet is empty)
    // Try to append to the sheet
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:H1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

    const response = await fetch(appendUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [row],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      // If sheet range not found, try to initialize with header first
      if (response.status === 400) {
        const headerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1:append?valueInputOption=USER_ENTERED`;
        await fetch(headerUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            values: [["Data", "Operador", "Operação", "Pomar", "Hora Início", "Hora Fim", "Observações", "Sincronizado em"]],
          }),
        });
        // Retry append
        const retry = await fetch(appendUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ values: [row] }),
        });
        if (!retry.ok) {
          return Response.json({ error: await retry.text() }, { status: 500 });
        }
      } else {
        return Response.json({ error: err }, { status: 500 });
      }
    }

    return Response.json({ success: true, synced: row });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});