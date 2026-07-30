import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Sincroniza RAs (status planejada/pendente) com dados atualizados dos cadastros:
 * - Product catalog -> RecommendationProduct (active_ingredient, target)
 * - Limpa PlanningLabels em cache para forçar regeneração com dados frescos
 * 
 * Pode ser chamado:
 * 1. Via botao "Sincronizar RAs" no frontend (sem ra_ids = todas planejada/pendente)
 * 2. Automaticamente antes de gerar fichas (com ra_ids especificas)
 * v1.0
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Parse optional ra_ids from body
    let ra_ids: string[] | null = null;
    try {
      const body = await req.json();
      if (body.ra_ids && Array.isArray(body.ra_ids)) {
        ra_ids = body.ra_ids;
      }
    } catch { /* empty body = sync all */ }

    // 1. Load Product catalog
    const catalog = await base44.asServiceRole.entities.Product.list("-created_date", 500);
    const productMap: Record<string, { active_ingredient: string; target: string }> = {};
    for (const p of catalog) {
      if (p.name) {
        productMap[p.name.trim().toUpperCase()] = {
          active_ingredient: p.active_ingredient || '',
          target: p.target || '',
        };
      }
    }

    // 2. Load all RecommendationProducts
    const allRPs = await base44.asServiceRole.entities.RecommendationProduct.list("-created_date", 5000);

    // 3. Load all RAs - filter by status or by ra_ids
    const allRAs = await base44.asServiceRole.entities.AgronomicRecommendation.list("-created_date", 500);
    const SYNC_STATUSES = new Set(['planejada', 'pendente', '']);
    const targetRAs = ra_ids
      ? allRAs.filter(ra => ra_ids.includes(ra.id))
      : allRAs.filter(ra => SYNC_STATUSES.has((ra.status || '').toLowerCase()));

    const targetRAIds = new Set(targetRAs.map(ra => ra.id));

    // 4. Sync RecommendationProducts
    let productsUpdated = 0;
    let productsSkipped = 0;
    const productChanges: string[] = [];

    for (const rp of allRPs) {
      if (!targetRAIds.has(rp.recommendation_id)) continue;

      const key = (rp.product_name || '').trim().toUpperCase();
      const catalogEntry = productMap[key];
      if (!catalogEntry) { productsSkipped++; continue; }

      const currentPA = rp.active_ingredient || '';
      const currentTarget = rp.target || '';
      const newPA = catalogEntry.active_ingredient || currentPA;
      const newTarget = catalogEntry.target || currentTarget;

      if (newPA !== currentPA || newTarget !== currentTarget) {
        await base44.asServiceRole.entities.RecommendationProduct.update(rp.id, {
          active_ingredient: newPA,
          target: newTarget,
        });
        productsUpdated++;
        if (productChanges.length < 30) {
          productChanges.push(
            `RA ${rp.recommendation_id.slice(-6)} | ${rp.product_name}: ` +
            `PA "${currentPA}"->"${newPA}" | Alvo "${currentTarget}"->"${newTarget}"`
          );
        }
      } else {
        productsSkipped++;
      }
    }

    // 5. Delete cached PlanningLabels for synced RAs
    let labelsCleared = 0;
    const allLabels = await base44.asServiceRole.entities.PlanningLabel.list("-created_date", 1000);
    for (const label of allLabels) {
      try {
        const details = JSON.parse(label.additional_details || '{}');
        if (details.ra_id && targetRAIds.has(details.ra_id)) {
          await base44.asServiceRole.entities.PlanningLabel.delete(label.id);
          labelsCleared++;
        }
      } catch { /* skip */ }
    }

    return Response.json({
      success: true,
      ras_scanned: targetRAs.length,
      products_updated: productsUpdated,
      products_skipped: productsSkipped,
      labels_cleared: labelsCleared,
      changes: productChanges,
      message: productsUpdated > 0
        ? `${productsUpdated} produtos sincronizados em ${targetRAs.length} RAs. ${labelsCleared} labels em cache limpos.`
        : `Tudo sincronizado - ${targetRAs.length} RAs verificadas, nenhum dado desatualizado.`,
    });
  } catch (err: any) {
    return Response.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
});