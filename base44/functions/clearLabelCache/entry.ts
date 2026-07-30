import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Deletes ALL PlanningLabels so they regenerate fresh with updated product data
// Safe to run: labels are recreated automatically when printing fichas
// v1.1
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const allLabels = await base44.asServiceRole.entities.PlanningLabel.list("-created_date", 1000);

    let deleted = 0;
    for (const label of allLabels) {
      await base44.asServiceRole.entities.PlanningLabel.delete(label.id);
      deleted++;
    }

    return Response.json({
      success: true,
      deleted,
      message: `${deleted} PlanningLabels deletados — serão recriados com dados atualizados na próxima impressão`,
    });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});