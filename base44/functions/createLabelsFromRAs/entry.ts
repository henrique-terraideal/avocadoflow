import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    // Fetch products for these RAs
    const allProducts = await base44.asServiceRole.entities.RecommendationProduct.list("-created_date", 2000);

    // Fetch Operations for mapping
    const operations = await base44.asServiceRole.entities.Operation.filter({ active: true });

    // Fetch existing PlanningLabels to avoid duplicates (check by ra_id in additional_details)
    const allLabels = await base44.asServiceRole.entities.PlanningLabel.list("-created_date", 500);
    const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });

    // Fetch Implements if entity exists
    let implements_list = [];
    try {
      implements_list = await base44.asServiceRole.entities.Implement.filter({ active: true });
    } catch (_) {}

    // Fetch OperationTemplates and CustomFields for registration fields
    const templates = await base44.asServiceRole.entities.OperationTemplate.list();
    const customFields = await base44.asServiceRole.entities.CustomField.list();

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

      // Find implement
      const implement = ra.implement_id ? implements_list.find(i => i.id === ra.implement_id) : null;

      // Check if a PlanningLabel already exists for this RA (avoid duplicates)
      let label = allLabels.find(l => {
        try {
          const details = JSON.parse(l.additional_details || '{}');
          return details.ra_id === ra.id;
        } catch { return false; }
      });

      if (!label) {
        // Build additional details with full RA data
        const tankCapacity = implement?.tank_capacity_liters || 0;
        const litersPerHa = ra.liters_per_ha || 1000;

        const additionalDetails = {
          ra_id: ra.id,
          ra_code: ra.code,
          type: ra.type,
          climate_conditions: ra.climate_conditions || '',
          machine_config: ra.machine_config || '',
          implement_id: ra.implement_id || '',
          implement_name: implement?.name || '',
          implement_config: ra.implement_config || '',
          liters_per_ha: litersPerHa,
          tank_capacity_liters: tankCapacity,
          products: raProducts.map(p => ({
            product_name: p.product_name,
            active_ingredient: p.active_ingredient || '',
            target: p.target || '',
            application_mode: p.application_mode || 'ÁREA',
            dose: p.dose,
            total_quantity: p.total_quantity,
            obs: p.obs || '',
            qty_per_tank: tankCapacity && p.dose != null
              ? parseFloat((p.dose * (tankCapacity / litersPerHa)).toFixed(3))
              : null
          }))
        };

        // Create PlanningLabel
        const opCode = operation?.code || '';
        const opName = operation?.name || '';
        const opId = operation?.id || '';

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

        // Generate QR data with label ID (deep-link into NewRecord with params)
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

      // Find template and registration custom fields for this operation
      const template = operation ? templates.find(t => t.operation_id === operation.id) : null;
      const opCustomFields = template
        ? customFields.filter(f => f.template_id === template.id && f.input_stage !== 'planning')
        : [];

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
        },
        products: raProducts,
        label: {
          id: label.id,
          qr_data: label.qr_data,
          operation_code: label.operation_code,
          operation_name: label.operation_name,
        },
        implement: implement ? {
          name: implement.name,
          tank_capacity_liters: implement.tank_capacity_liters,
          specs: implement.specs,
        } : null,
        operation: operation ? {
          id: operation.id,
          code: operation.code,
          name: operation.name,
        } : null,
        custom_fields: opCustomFields.map(f => ({
          field_label: f.field_label,
          field_type: f.field_type,
          is_required: f.is_required,
        })),
      });
    }

    return Response.json({ success: true, count: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});

// Maps RA type string to the most appropriate Operation
function matchOperation(raType, operations) {
  if (!raType || !operations || operations.length === 0) return null;

  const normalize = (str) => String(str)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  const typeNorm = normalize(raType);

  // Keyword-based matching (most specific first)
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

  // Fallback: word-by-word matching
  const typeWords = typeNorm.split(/\s+/).filter(w => w.length > 3);
  for (const word of typeWords) {
    const match = operations.find(o => normalize(o.name).includes(word));
    if (match) return match;
  }

  return operations[0] || null;
}
