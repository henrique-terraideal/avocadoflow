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

    // Schema flexível — todos os campos como string para máxima compatibilidade
    const extractResult = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url: fileUrl,
      json_schema: {
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
    });

    if (extractResult.status !== 'success' || !extractResult.output) {
      return Response.json({ error: 'Falha ao extrair dados do arquivo', details: extractResult.details }, { status: 400 });
    }

    // O output pode vir como array, objeto com "items", ou objeto único
    let rows = [];
    const output = extractResult.output;
    if (Array.isArray(output)) {
      rows = output;
    } else if (output.items && Array.isArray(output.items)) {
      rows = output.items;
    } else if (typeof output === 'object') {
      // Tenta encontrar qualquer array dentro do objeto
      for (const key of Object.keys(output)) {
        if (Array.isArray(output[key])) {
          rows = output[key];
          break;
        }
      }
    }

    if (rows.length === 0) {
      return Response.json({ error: 'Nenhuma recomendação encontrada no arquivo. Verifique se há uma coluna "RA" e "PRODUTO" preenchidas.' }, { status: 400 });
    }

    // --- Normalização de cabeçalhos ---
    // Mapeia variações comuns de nomes de colunas para os campos padrão
    const fieldAliases = {
      ra: ['ra', 'codigo', 'cod', 'cod_ra', 'recomendacao', 'cod_recomendacao'],
      data: ['data', 'date', 'data_aplicacao', 'data_prevista'],
      tipo: ['tipo', 'type', 'categoria', 'tipo_recomendacao'],
      pomar: ['pomar', 'orchard', 'cod_pomar', 'pomar_code', 'orchard_code'],
      status: ['status', 'situacao', 'state'],
      produto: ['produto', 'product', 'nome_produto', 'product_name'],
      aplicacao: ['aplicacao', 'aplicação', 'modo_aplicacao', 'application_mode', 'modo'],
      dose: ['dose', 'dosagem', 'dosage'],
      obs: ['obs', 'observacoes', 'observação', 'observaçãoões', 'notes', 'note'],
      quant_total: ['quant_total', 'quant. total', 'quant total', 'quantidade_total', 'total', 'qtd_total', 'qt_total', 'quantidade']
    };

    // Constrói mapa reverso: alias normalizada → campo padrão (com e sem acentos)
    const removeDiacritics = (str) => {
      return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    };
    const aliasToField = {};
    for (const [field, aliases] of Object.entries(fieldAliases)) {
      for (const alias of aliases) {
        aliasToField[removeDiacritics(alias).toUpperCase().replace(/[\s._-]/g, '')] = field;
      }
    }

    const normalizeKey = (key) => {
      if (!key) return null;
      const normalized = removeDiacritics(key).toUpperCase().replace(/[\s._-]/g, '');
      return aliasToField[normalized] || null;
    };

    // Normaliza todas as linhas: mapeia chaves variadas para campos padrão
    const normalizedRows = rows.map((row) => {
      const normalized = {};
      for (const [key, value] of Object.entries(row)) {
        const field = normalizeKey(key);
        if (field && normalized[field] === undefined) {
          normalized[field] = value;
        }
      }
      return normalized;
    });

    // Filtra linhas inválidas (sem RA ou sem PRODUTO) — remove títulos e linhas vazias
    const validRows = normalizedRows.filter((row) => {
      const ra = String(row.ra || '').trim();
      const produto = String(row.produto || '').trim();
      // Ignora linhas que parecem ser títulos ou cabeçalhos
      if (ra.toUpperCase().includes('RECOMENDAÇÃO') || ra.toUpperCase().includes('RECOMENDACAO')) return false;
      return ra && produto;
    });

    if (validRows.length === 0) {
      return Response.json({ error: 'Nenhuma linha válida encontrada. Verifique se as colunas RA e PRODUTO estão preenchidas.' }, { status: 400 });
    }

    // --- Funções de parsing ---

    const parseNumber = (val) => {
      if (val == null) return null;
      if (typeof val === 'number') return val;
      const cleaned = String(val).replace(/[R$\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
      const n = parseFloat(cleaned);
      return isNaN(n) ? null : n;
    };

    const parseDate = (val) => {
      if (!val) return null;
      const str = String(val).trim();

      // Formato ISO: 2025-09-01 ou 2025-09-01 00:00:00
      const isoMatch = str.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) {
        return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
      }

      // Formato DD/MM/YYYY ou DD-MM-YYYY
      const brMatch = str.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
      if (brMatch) {
        let day = brMatch[1].padStart(2, '0');
        let month = brMatch[2].padStart(2, '0');
        let year = parseInt(brMatch[3]);
        if (year < 100) year = 2000 + year;
        return `${year}-${month}-${day}`;
      }

      // Formato Mês/Ano: set/25, SET/25, Setembro/2025, etc.
      const months = { jan: '01', fev: '02', mar: '03', abr: '04', mai: '05', jun: '06', jul: '07', ago: '08', set: '09', out: '10', nov: '11', dez: '12' };
      const monthYearMatch = str.toLowerCase().match(/(\w{3,})[\/\s]+(\d{2,4})/);
      if (monthYearMatch) {
        const monthKey = monthYearMatch[1].substring(0, 3);
        const month = months[monthKey];
        if (month) {
          let year = parseInt(monthYearMatch[2]);
          if (year < 100) year = 2000 + year;
          return `${year}-${month}-01`;
        }
      }

      return null;
    };

    const parseApplicationMode = (val) => {
      if (!val) return 'ÁREA';
      const upper = String(val).toUpperCase().trim();
      if (upper.includes('ÁREA') || upper.includes('AREA')) return 'ÁREA';
      if (upper.includes('PLANTA')) return 'PLANTA';
      return 'ÁREA';
    };

    // --- Busca pomares cadastrados para mapear nome → código ---
    const existingOrchards = await base44.asServiceRole.entities.Orchard.list("sort_order", 200);
    const orchardLookup = {}; // chave normalizada (nome ou código) → código
    for (const o of existingOrchards) {
      if (o.code) orchardLookup[String(o.code).toUpperCase().trim()] = o.code;
      if (o.name) orchardLookup[String(o.name).toUpperCase().trim()] = o.code;
    }

    // --- Busca produtos cadastrados para copiar active_ingredient e target ---
    const existingProducts = await base44.asServiceRole.entities.Product.list("-created_date", 500);
    const productMap = {};
    for (const p of existingProducts) {
      productMap[p.name.toUpperCase()] = p;
    }

    // Cria produtos que ainda não existem (apenas nome)
    const newProductNames = new Set();
    for (const row of validRows) {
      const name = String(row.produto || '').trim();
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

    // --- Agrupa linhas por código de RA + pomar (cada RA é única por pomar) ---
    const groupedByCode = {};
    for (const row of validRows) {
      const code = String(row.ra || '').trim();
      if (!code) continue;
      const orchardCode = (() => {
        const raw = String(row.pomar || '').trim();
        return orchardLookup[raw.toUpperCase()] || raw;
      })();
      const groupKey = code + '|' + orchardCode;
      if (!groupedByCode[groupKey]) {
        groupedByCode[groupKey] = {
          code,
          date: parseDate(row.data),
          type: String(row.tipo || '').trim(),
          orchard_code: orchardCode,
          status: String(row.status || '').trim(),
          machine_config: '',
          implement_config: '',
          climate_conditions: '',
          active: true,
          products: []
        };
      }
      const productName = String(row.produto || '').trim();
      if (productName) {
        const productRecord = productMap[productName.toUpperCase()];
        groupedByCode[groupKey].products.push({
          product_name: productName,
          active_ingredient: productRecord?.active_ingredient || '',
          target: productRecord?.target || '',
          application_mode: parseApplicationMode(row.aplicacao),
          dose: parseNumber(row.dose),
          total_quantity: parseNumber(row.quant_total),
          obs: String(row.obs || '').trim(),
          sort_order: groupedByCode[groupKey].products.length
        });
      }
    }

    const raEntries = Object.values(groupedByCode).filter(r => r.code && r.products.length > 0);

    if (raEntries.length === 0) {
      return Response.json({ error: 'Nenhuma recomendação válida encontrada após processamento.' }, { status: 400 });
    }

    // --- Busca RAs existentes para atualizar em vez de duplicar ---
    const existingRAs = await base44.asServiceRole.entities.AgronomicRecommendation.list("-created_date", 500);
    const existingRAByCode = {};
    for (const ra of existingRAs) {
      if (ra.code) existingRAByCode[ra.code + '|' + (ra.orchard_code || '')] = ra;
    }

    let createdCount = 0;
    let updatedCount = 0;
    const allProductRecords = [];

    for (const entry of raEntries) {
      const { products, ...raFields } = entry;
      const existing = existingRAByCode[entry.code + '|' + (entry.orchard_code || '')];
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