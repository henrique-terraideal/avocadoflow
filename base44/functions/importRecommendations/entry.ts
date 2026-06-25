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
                quant_total: { type: "string" }
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

    // Fetch existing products to map name → active_ingredient/target
    const existingProducts = await base44.asServiceRole.entities.Product.list("-created_date", 500);
    const productMap = {}; // name.toUpperCase() → product record
    for (const p of existingProducts) {
      productMap[p.name.toUpperCase()] = p;
    }

    // Create missing products (name only — no doses)
    const newProductNames = new Set();
    for (const row of rows) {
      const name = (row.produto || '').trim();
      if (name && !productMap[name.toUpperCase()]) {
        newProductNames.add(name);
      }
    }
    if (newProductNames.size > 0) {
      const created = await base44.asServiceRole.entities.Product.bulkCreate(
        [...newProductNames].map(name => ({ name }))
      );
      for (const p of created) {
        productMap[p.name.toUpperCase()] = p;
      }
    }

    // Group rows by RA code
    const groupedByCode = {};
    for (const row of rows) {
      const code = (row.ra || '').trim();
      if (!code) continue;
      if (!groupedByCode[code]) {
        groupedByCode[code] = {
          code,
          date: parseDate(row.data),
          type: (row.tipo || '').trim(),
          orchard_code: (row.pomar || '').trim(),
          status: (row.status || '').trim(),
          machine_config: '',
          implement_config: '',
          climate_conditions: '',
          active: true,
          products: []
        };
      }
      const productName = (row.produto || '').trim();
      if (productName) {
        const productRecord = productMap[productName.toUpperCase()];
        groupedByCode[code].products.push({
          product_name: productName,
          active_ingredient: productRecord?.active_ingredient || '',
          target: productRecord?.target || '',
          application_mode: (row.aplicacao || '').toUpperCase().includes('ÁREA') || (row.aplicacao || '').toUpperCase().includes('AREA') ? 'ÁREA' : 'PLANTA',
          dose: parseNumber(row.dose),
          total_quantity: parseNumber(row.quant_total),
          obs: (row.obs || '').trim(),
          sort_order: groupedByCode[code].products.length
        });
      }
    }

    const raEntries = Object.values(groupedByCode).filter(r => r.code && r.products.length > 0);

    if (raEntries.length === 0) {
      return Response.json({ error: 'Nenhuma linha válida encontrada. Verifique se as colunas RA e PRODUTO estão preenchidas.' }, { status: 400 });
    }

    // Fetch existing RAs to check for duplicates by code
    const existingRAs = await base44.asServiceRole.entities.AgronomicRecommendation.list("-created_date", 500);
    const existingRAByCode = {};
    for (const ra of existingRAs) {
      if (ra.code) existingRAByCode[ra.code] = ra;
    }

    let createdCount = 0;
    let updatedCount = 0;
    const allProductRecords = [];

    for (const entry of raEntries) {
      const { products, ...raFields } = entry;
      const existing = existingRAByCode[entry.code];
      let raId;

      if (existing) {
        await base44.asServiceRole.entities.AgronomicRecommendation.update(existing.id, raFields);
        await base44.asServiceRole.entities.RecommendationProduct.deleteMany({ recommendation_id: existing.id });
        raId = existing.id;
        updatedCount++;
      } else {
        const newRA = await base44.asServiceRole.entities.AgronomicRecommendation.create(raFields);
        raId = newRA.id;
        createdCount++;
      }

      for (const p of products) {
        allProductRecords.push({ ...p, recommendation_id: raId });
      }
    }

    if (allProductRecords.length > 0) {
      await base44.asServiceRole.entities.RecommendationProduct.bulkCreate(allProductRecords);
    }

    return Response.json({
      success: true,
      imported: createdCount + updatedCount,
      created: createdCount,
      updated: updatedCount,
      products_created: newProductNames.size,
      product_records: allProductRecords.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});