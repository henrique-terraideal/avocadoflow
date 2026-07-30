import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
// v1.1 - includes unit in auto-sync

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { ra_ids } = await req.json();
    if (!ra_ids || !Array.isArray(ra_ids) || ra_ids.length === 0) {
      return Response.json({ error: 'ra_ids array is required' }, { status: 400 });
    }

    // Fetch RAs
    const allRAs = await base44.asServiceRole.entities.AgronomicRecommendation.list("-created_date", 500);
    const selectedRAs = allRAs.filter(ra => ra_ids.includes(ra.id));

    if (selectedRAs.length === 0) {
      return Response.json({ error: 'No RAs found for the given IDs' }, { status: 404 });
    }

    // === AUTO-SYNC: pull fresh data from Product catalog before generating ===
    const catalog = await base44.asServiceRole.entities.Product.list("-created_date", 500);
    const productMap: Record<string, { active_ingredient: string; target: string; unit: string }> = {};
    for (const p of catalog) {
      if (p.name) {
        productMap[p.name.trim().toUpperCase()] = {
          active_ingredient: p.active_ingredient || '',
          target: p.target || '',
          unit: p.unit || '',
        };
      }
    }

    // Fetch products for these RAs
    const allProducts = await base44.asServiceRole.entities.RecommendationProduct.list("-created_date", 2000);

    // Sync each RP with catalog (in-place update + use synced values)
    for (const rp of allProducts) {
      const key = (rp.product_name || '').trim().toUpperCase();
      const catalogEntry = productMap[key];
      if (!catalogEntry) continue;

      const currentPA = rp.active_ingredient || '';
      const currentTarget = rp.target || '';
      const currentUnit = rp.unit || '';
      const newPA = catalogEntry.active_ingredient || currentPA;
      const newTarget = catalogEntry.target || currentTarget;
      const newUnit = catalogEntry.unit || currentUnit;

      if (newPA !== currentPA || newTarget !== currentTarget || newUnit !== currentUnit) {
        await base44.asServiceRole.entities.RecommendationProduct.update(rp.id, {
          active_ingredient: newPA,
          target: newTarget,
          unit: newUnit,
        });
        // Update in-memory copy too so the label uses fresh data
        rp.active_ingredient = newPA;
        rp.target = newTarget;
        rp.unit = newUnit;
      }
    }

    // Fetch Operations for mapping
    const operations = await base44.asServiceRole.entities.Operation.filter({ active: true });

    // Fetch existing PlanningLabels (to find and UPDATE them, not skip)
    const allLabels = await base44.asServiceRole.entities.PlanningLabel.list("-created_date", 500);
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

    // Fetch Machines (tractors)
    let machines_list: any[] = [];
    try {
      machines_list = await base44.asServiceRole.entities.Machine.filter({ active: true });
    } catch (_) {}

    // Fetch Implements
    let implements_list: any[] = [];
    try {
      implements_list = await base44.asServiceRole.entities.Implement.filter({ active: true });
    } catch (_) {}

    // Fetch Orchards for area/plant info
    const orchards = await base44.asServiceRole.entities.Orchard.filter({ active: true });

    const results = [];

    for (const ra of selectedRAs) {
      const raProducts = allProducts
        .filter(p => p.recommendation_id === ra.id)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

      // Map RA type to Operation
      const operation = matchOperation(ra.type, operations);

      // Find orchard info
      const orchard = orchards.find(o => o.code === ra.orchard_code);

      // Find machine (tractor) via machine_id
      const machine = ra.machine_id ? machines_list.find(m => m.id === ra.machine_id) : null;

      // Find implement via implement_id
      const implement = ra.implement_id ? implements_list.find(i => i.id === ra.implement_id) : null;

      const tankCapacity = implement?.tank_capacity_liters || 0;
      const litersPerHa = ra.liters_per_ha || 1000;

      // Build fresh additional_details with CURRENT data (always up-to-date)
      const additionalDetails = {
        ra_id: ra.id,
        ra_code: ra.code,
        type: ra.type,
        climate_conditions: ra.climate_conditions || '',
        machine_config: ra.machine_config || '',
        machine_id: ra.machine_id || '',
        machine_name: machine?.name || '',
        implement_id: ra.implement_id || '',
        implement_name: implement?.name || '',
        implement_config: ra.implement_config || '',
        implement_marcha: implement?.marcha_trabalho || '',
        implement_rpm: implement?.rpm || null,
        liters_per_ha: litersPerHa,
        tank_capacity_liters: tankCapacity,
        application_observations: ra.application_observations || '',
        products: raProducts.map(p => ({
          product_name: p.product_name,
          active_ingredient: p.active_ingredient || '',
          target: p.target || '',
          application_mode: p.application_mode || 'AREA',
          dose: p.dose,
          total_quantity: p.total_quantity,
          unit: p.unit || '',
          carencia: p.carencia || '',
          obs: p.obs || '',
          qty_per_tank: tankCapacity && p.dose != null
            ? parseFloat((p.dose * (tankCapacity / litersPerHa)).toFixed(3))
            : null
        }))
      };

      const opCode = operation?.code || '';
      const opName = operation?.name || '';
      const opId = operation?.id || '';

      // Find existing label for this RA
      let label = allLabels.find(l => {
        try {
          const details = JSON.parse(l.additional_details || '{}');
          return details.ra_id === ra.id;
        } catch { return false; }
      });

      if (label) {
        // UPDATE existing label with fresh data (no stale cache!)
        await base44.asServiceRole.entities.PlanningLabel.update(label.id, {
          additional_details: JSON.stringify(additionalDetails),
        });
      } else {
        // Create new label
        label = await base44.asServiceRole.entities.PlanningLabel.create({
          date: today,
          operator_name: '',
          operator_photo: '',
          operation_code: opCode,
          operation_name: opCode ? `${opCode} - ${opName}` : opName,
          orchard_number: ra.orchard_code || '',
          qr_data: 'PENDING',
          auto_rescheduled: false,
          original_date: today,
          additional_details: JSON.stringify(additionalDetails)
        });

        const appBaseUrl = 'https://avocadoflow.app';
        const qrParams = new URLSearchParams({
          act_id: opId,
          act_code: opCode,
          act_name: opName,
          orchard: ra.orchard_code || '',
          ra_label_id: label.id,
        });
        const qrData = `${appBaseUrl}/?${qrParams.toString()}`;

        await base44.asServiceRole.entities.PlanningLabel.update(label.id, { qr_data: qrData });
        label.qr_data = qrData;
      }

      // Update RA status to "pendente"
      if (ra.status !== 'pendente' && ra.status !== 'executada') {
        await base44.asServiceRole.entities.AgronomicRecommendation.update(ra.id, { status: 'pendente' });
      }

      results.push({
        ra: {
          id: ra.id,
          code: ra.code,
          date: ra.date,
          type: ra.type,
          orchard_code: ra.orchard_code,
          orchard_name: orchard?.name || '',
          orchard_area: orchard?.area_ha || 0,
          orchard_plant_count: orchard?.plant_count || 0,
          status: ra.status,
          climate_conditions: ra.climate_conditions,
          machine_config: ra.machine_config,
          implement_config: ra.implement_config,
          liters_per_ha: ra.liters_per_ha || 1000,
          application_observations: ra.application_observations || '',
        },
        products: raProducts,
        label: {
          id: label.id,
          qr_data: label.qr_data,
          operation_code: label.operation_code,
          operation_name: label.operation_name,
        },
        machine: machine ? {
          id: machine.id,
          name: machine.name,
          specs: machine.specs,
        } : null,
        implement: implement ? {
          id: implement.id,
          name: implement.name,
          tank_capacity_liters: implement.tank_capacity_liters,
          specs: implement.specs,
          marcha_trabalho: implement.marcha_trabalho || '',
          rpm: implement.rpm || null,
        } : null,
        operation: operation ? {
          id: operation.id,
          code: operation.code,
          name: operation.name,
        } : null,
      });
    }

    return Response.json({ success: true, count: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});

function matchOperation(raType, operations) {
  if (!raType || !operations || operations.length === 0) return null;

  const normalize = (str) => String(str)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const typeNorm = normalize(raType);

  const keywordMap = [
    { keywords: ['PULVER'], opKeywords: ['PULVER'] },
    { keywords: ['FERTIRRIG', 'FERTIADUB'], opKeywords: ['FERTIRRIG', 'FERTI', 'FERT'] },
    { keywords: ['ADUB'], opKeywords: ['ADUB'] },
    { keywords: ['IRRIGA'], opKeywords: ['IRRIGA'] },
    { keywords: ['PODA'], opKeywords: ['PODA'] },
    { keywords: ['COLHEITA', 'COLH'], opKeywords: ['COLHEITA', 'COLH'] },
    { keywords: ['SOLO', 'CORRECAO', 'CALAGEM'], opKeywords: ['SOLO', 'CORRECAO', 'CALAGEM'] },
    { keywords: ['FITOS', 'PRAG', 'MIP'], opKeywords: ['FITOS', 'PRAG', 'MIP'] },
    { keywords: ['MANUT'], opKeywords: ['MANUT'] },
  ];

  for (const { keywords, opKeywords } of keywordMap) {
    const typeMatches = keywords.some(k => typeNorm.includes(k));
    if (typeMatches) {
      for (const op of operations) {
        const opNorm = normalize(op.name);
        if (opKeywords.some(k => opNorm.includes(k))) return op;
      }
    }
  }

  const typeWords = typeNorm.split(/\s+/).filter(w => w.length > 3);
  for (const word of typeWords) {
    const match = operations.find(o => normalize(o.name).includes(word));
    if (match) return match;
  }

  return operations[0] || null;
}