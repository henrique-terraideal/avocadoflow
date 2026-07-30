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
    const details: string[] = [];

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
      if (details.length < 20) {
        details.push(`${rp.product_name}: PA="${catalogEntry.active_ingredient}" | Alvo="${catalogEntry.target}"`);
      }
    }

    return Response.json({
      success: true,
      total_rps: allRPs.length,
      checked: toUpdate.length,
      updated,
      skipped,
      sample_updates: details,
    });
  } catch (err: any) {
    return Response.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
});
