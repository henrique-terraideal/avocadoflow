import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const body = await req.json();
    const fileUrl = body.file_url;
    if (!fileUrl) return Response.json({ error: 'file_url is required' }, { status: 400 });

    const extractResult = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url: fileUrl,
      json_schema: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                ra: { type: "string" },
                data: { type: "string" },
                tipo: { type: "string" },
                pomar: { type: "string" },
                status: { type: "string" },
                produto: { type: "string" },
                aplicacao: { type: "string" },
                dose: { type: "string" },
                obs: { type: "string" },
                quant_total: { type: "string" },
                valor: { type: "string" },
                compra: { type: "string" },
                custo_ha: { type: "string" }
              }
            }
          }
        }
      }
    });

    if (extractResult.status !== 'success' || !extractResult.output) {
      return Response.json({ error: 'Falha ao extrair dados do arquivo', details: extractResult.details }, { status: 400 });
    }

    const rows = extractResult.output.items || [];
    if (rows.length === 0) {
      return Response.json({ error: 'Nenhuma recomendação encontrada no arquivo' }, { status: 400 });
    }

    const parseNumber = (val) => {
      if (typeof val === 'number') return val;
      if (!val) return null;
      const cleaned = String(val).replace(/[R$\s]/g, '').replace(/\./g, '').replace(',', '.');
      const n = parseFloat(cleaned);
      return isNaN(n) ? null : n;
    };

    const parseDate = (val) => {
      if (!val) return null;
      const months = { jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06', jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12' };
      const match = String(val).toLowerCase().match(/(\w{3,})[\/\s]+(\d{2,4})/);
      if (match) {
        const monthKey = match[1].substring(0, 3);
        const month = months[monthKey];
        if (month) {
          let year = parseInt(match[2]);
          if (year < 100) year = 2000 + year;
          return `${year}-${month}-01`;
        }
      }
      return null;
    };

    const raRecords = rows.map(row => ({
      code: (row.ra || '').trim(),
      date: parseDate(row.data),
      type: (row.tipo || '').trim(),
      orchard_code: (row.pomar || '').trim(),
      status: (row.status || '').trim(),
      product_name: (row.produto || '').trim(),
      application_mode: (row.aplicacao || '').toUpperCase().includes('ÁREA') ? 'ÁREA' : 'PLANTA',
      dose: parseNumber(row.dose),
      total_quantity: parseNumber(row.quant_total),
      obs: (row.obs || '').trim(),
      value: parseNumber(row.valor),
      cost_per_ha: parseNumber(row.custo_ha),
      purchase_date: parseDate(row.compra),
      active: true,
    })).filter(r => r.code && r.product_name);

    if (raRecords.length === 0) {
      return Response.json({ error: 'Nenhuma linha válida encontrada. Verifique se as colunas RA e PRODUTO estão preenchidas.' }, { status: 400 });
    }

    // Get existing products and create missing ones
    const existingProducts = await base44.asServiceRole.entities.Product.list("-created_date", 500);
    const productNames = new Set(existingProducts.map(p => p.name.toUpperCase()));
    const newProducts = [];
    for (const row of rows) {
      const name = (row.produto || '').trim();
      if (name && !productNames.has(name.toUpperCase())) {
        productNames.add(name.toUpperCase());
        newProducts.push({ name });
      }
    }
    if (newProducts.length > 0) {
      await base44.asServiceRole.entities.Product.bulkCreate(newProducts);
    }

    await base44.asServiceRole.entities.AgronomicRecommendation.bulkCreate(raRecords);

    return Response.json({
      success: true,
      imported: raRecords.length,
      products_created: newProducts.length,
      total_products: existingProducts.length + newProducts.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});