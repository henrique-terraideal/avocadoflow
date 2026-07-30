import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Load full product catalog
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

    // Load all RecommendationProducts missing active_ingredient or target
    const allRPs = await base44.asServiceRole.entities.RecommendationProduct.list("-created_date", 5000);
    const toUpdate = allRPs.filter((rp: any) =>
      (!rp.active_ingredient || rp.active_ingredient === '') ||
      (!rp.target || rp.target === '')
    );

    let updated = 0;
    let skipped = 0;
    const affectedRAIds = new Set<string>();

    for (const rp of toUpdate) {
      const key = (rp.product_name || '').trim().toUpperCase();
      const catalogEntry = productMap[key];
      if (!catalogEntry) { skipped++; continue; }

      const hasNewData =
        (catalogEntry.active_ingredient && (!rp.active_ingredient || rp.active_ingredient === '')) ||
        (catalogEntry.target && (!rp.target || rp.target === ''));

      if (!hasNewData) { skipped++; continue; }

      await base44.asServiceRole.entities.RecommendationProduct.update(rp.id, {
        active_ingredient: catalogEntry.active_ingredient || rp.active_ingredient || '',
        target: catalogEntry.target || rp.target || '',
      });
      updated++;
      if (rp.recommendation_id) affectedRAIds.add(rp.recommendation_id);
    }

    // Delete cached PlanningLabels for affected RAs so they regenerate fresh
    let labelsDeleted = 0;
    if (affectedRAIds.size > 0) {
      const allLabels = await base44.asServiceRole.entities.PlanningLabel.list("-created_date", 1000);
      for (const label of allLabels) {
        try {
          const details = JSON.parse(label.additional_details || '{}');
          if (details.ra_id && affectedRAIds.has(details.ra_id)) {
            await base44.asServiceRole.entities.PlanningLabel.delete(label.id);
            labelsDeleted++;
          }
        } catch { /* skip */ }
      }
    }

    return Response.json({
      success: true,
      total_rps: allRPs.length,
      checked: toUpdate.length,
      updated,
      skipped,
      labels_cleared: labelsDeleted,
      message: `${updated} RecommendationProducts atualizados, ${labelsDeleted} labels em cache deletados`,
    });
  } catch (err: any) {
    return Response.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
});
