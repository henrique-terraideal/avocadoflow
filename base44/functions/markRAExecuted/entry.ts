import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Checks if all PlanningLabels linked to an RA have been registered (have matching FieldRecords).
 * If so, updates the RA status from "pendente" to "executada".
 * Supports multiple operators — each label is checked independently.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { ra_id } = await req.json();
    if (!ra_id) return Response.json({ error: 'ra_id is required' }, { status: 400 });

    // 1. Fetch all PlanningLabels linked to this RA
    const allLabels = await base44.asServiceRole.entities.PlanningLabel.list("-created_date", 1000);
    const raLabels = allLabels.filter(l => {
      try {
        const details = JSON.parse(l.additional_details || '{}');
        return details.ra_id === ra_id;
      } catch { return false; }
    });

    if (raLabels.length === 0) {
      return Response.json({ success: true, executed: false, message: 'No labels found for this RA' });
    }

    // 2. Fetch all FieldRecords
    const allRecords = await base44.asServiceRole.entities.FieldRecord.list("-created_date", 1000);

    // 3. Check each label for a matching FieldRecord
    let doneCount = 0;
    const allDone = raLabels.every(label => {
      try {
        const url = new URL(label.qr_data);
        const labelOpId = url.searchParams.get("op_id");
        const actCode = url.searchParams.get("act_code");
        const isDone = allRecords.some(r =>
          r.operator_id === labelOpId &&
          r.orchard_number === label.orchard_number &&
          r.start_time && r.end_time &&
          actCode && r.operation?.includes(actCode)
        );
        if (isDone) doneCount++;
        return isDone;
      } catch { return false; }
    });

    if (allDone) {
      await base44.asServiceRole.entities.AgronomicRecommendation.update(ra_id, { status: 'executada' });
      return Response.json({ success: true, executed: true, labels_total: raLabels.length, labels_done: doneCount });
    }

    return Response.json({ success: true, executed: false, labels_total: raLabels.length, labels_done: doneCount });
  } catch (err) {
    return Response.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
});