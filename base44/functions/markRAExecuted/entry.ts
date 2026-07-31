import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * v2 — checks if the RA has at least one FieldRecord with matching ra_id in additional_details.
 * For RAs with a single label (most common case), this is sufficient.
 * Updates RA status from "pendente" to "executada" when done.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { ra_id } = await req.json();
    if (!ra_id) return Response.json({ error: 'ra_id is required' }, { status: 400 });

    // Fetch all FieldRecords — search for any with matching ra_id in additional_details
    const allRecords = await base44.asServiceRole.entities.FieldRecord.list("-created_date", 2000);
    const matchingRecord = allRecords.find(r => {
      try {
        const d = JSON.parse(r.additional_details || '{}');
        return d.ra_id === ra_id;
      } catch { return false; }
    });

    if (!matchingRecord) {
      return Response.json({ success: true, executed: false, message: 'No FieldRecord with this ra_id found' });
    }

    // At least one registration found — mark RA as executada
    await base44.asServiceRole.entities.AgronomicRecommendation.update(ra_id, { status: 'executada' });
    return Response.json({ success: true, executed: true, record_id: matchingRecord.id });
  } catch (err) {
    return Response.json({ error: err.message, stack: err.stack }, { status: 500 });
  }
});
