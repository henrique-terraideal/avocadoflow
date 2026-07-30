import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const VALID = new Set(["planejada", "pendente", "executada"]);

    // List all RAs
    const ras = await base44.asServiceRole.entities.AgronomicRecommendation.list("-created_date", 500);

    const toUpdate = ras.filter((ra: any) => !VALID.has((ra.status || "").toLowerCase()));

    let updated = 0;
    for (const ra of toUpdate) {
      await base44.asServiceRole.entities.AgronomicRecommendation.update(ra.id, { status: "planejada" });
      updated++;
    }

    return Response.json({
      success: true,
      total: ras.length,
      updated,
      skipped: ras.length - updated,
      message: `${updated} RAs migradas para "planejada"`,
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});
