import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * markRAExecuted — Called after a FieldRecord is created via QR scan or pending modal.
 * Checks if ALL PlanningLabels linked to an RA have been registered (supports multiple operators).
 * When all are done, updates RA status from "pendente" to "executada".
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { ra_id } = await req.json();
    if (!ra_id) return Response.json({ error: 'ra_id is required' }, { status: 400 });

    // Fetch RA
    const ra = await base44.asServiceRole.entities.AgronomicRecommendation.get(ra_id);
    if (!ra) return Response.json({ error: 'RA not found' }, { status: 404 });

    // Already executada — skip
    if ((ra.status || '').toLowerCase() === 'executada') {
      return Response.json({ success: true, message: 'RA already executada', status: 'executada' });
    }

    // Fetch all PlanningLabels linked to this RA
    const allLabels = await base44.asServiceRole.entities.PlanningLabel.list("-created_date", 1000);
    const raLabels = allLabels.filter(l => {
      try {
        const details = JSON.parse(l.additional_details || '{}');
        return details.ra_id === ra_id;
      } catch { return false; }
    });

    if (raLabels.length === 0) {
      return Response.json({ success: true, message: 'No labels linked to this RA', status: ra.status || 'planejada' });
    }

    // Fetch all FieldRecords linked to this RA (via additional_details.ra_id)
    const allRecords = await base44.asServiceRole.entities.FieldRecord.list("-created_date", 1000);
    const raRecords = allRecords.filter(r => {
      try {
        const details = JSON.parse(r.additional_details || '{}');
        // Check all values in additional_details for an object with ra_id
        for (const val of Object.values(details)) {
          try {
            const v = typeof val === 'string' ? JSON.parse(val) : val;
            if (v && typeof v === 'object' && v.ra_id === ra_id) return true;
          } catch {}
        }
        return false;
      } catch { return false; }
    });

    // Check if each label has a matching registered record
    const allDone = raLabels.every(label => {
      let actCode: string | null = null;
      let labelOpId: string | null = null;
      try {
        const url = new URL(label.qr_data);
        actCode = url.searchParams.get('act_code');
        labelOpId = url.searchParams.get('op_id');
      } catch {}

      return raRecords.some(r =>
        r.orchard_number === label.orchard_number &&
        r.start_time && r.end_time &&
        (!labelOpId || r.operator_id === labelOpId) &&
        (!actCode || (r.operation && r.operation.includes(actCode)))
      );
    });

    if (allDone) {
      await base44.asServiceRole.entities.AgronomicRecommendation.update(ra_id, { status: 'executada' });
      return Response.json({
        success: true,
        message: 'RA marked as executada',
        status: 'executada',
        labels_total: raLabels.length,
      });
    }

    return Response.json({
      success: true,
      message: 'Not all labels registered yet',
      status: ra.status || 'planejada',
      labels_total: raLabels.length,
    });
  } catch (error) {
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});