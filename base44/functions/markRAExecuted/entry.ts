/**
 * markRAExecuted — Called after a FieldRecord is created via QR scan.
 * Reads the FieldRecord's additional_details to find the ra_id,
 * then updates the AgronomicRecommendation status to "executada".
 *
 * Also checks: if there are multiple PlanningLabels (multiple operators) for the same RA,
 * only marks as "executada" when ALL labels have been registered (i.e., all FieldRecords created).
 *
 * Input: { record_id } — the FieldRecord ID just created
 */
export async function main(req: any) {
  try {
    const { record_id } = await req.json();
    if (!record_id) {
      return Response.json({ error: 'record_id is required' }, { status: 400 });
    }

    // 1. Fetch the FieldRecord
    const record = await base44.asServiceRole.entities.FieldRecord.get(record_id);
    if (!record) {
      return Response.json({ error: 'Record not found' }, { status: 404 });
    }

    // 2. Extract ra_id from additional_details
    let raId = null;
    if (record.additional_details) {
      try {
        const details = JSON.parse(record.additional_details);
        // Check direct ra_id
        if (details.ra_id) {
          raId = details.ra_id;
        } else {
          // Check nested (ra_selector field)
          for (const val of Object.values(details)) {
            try {
              const parsed = JSON.parse(val as string);
              if (parsed && parsed.ra_id) {
                raId = parsed.ra_id;
                break;
              }
            } catch {}
          }
        }
      } catch {}
    }

    if (!raId) {
      return Response.json({
        success: true,
        message: 'No RA linked to this record — nothing to update.',
        ra_id: null,
      });
    }

    // 3. Fetch the RA
    const ra = await base44.asServiceRole.entities.AgronomicRecommendation.get(raId);
    if (!ra) {
      return Response.json({ error: 'RA not found: ' + raId }, { status: 404 });
    }

    // 4. Check if there are multiple labels for this RA
    const allLabels = await base44.asServiceRole.entities.PlanningLabel.list("-created_date", 500);
    const raLabels = allLabels.filter(l => {
      try {
        const d = JSON.parse(l.additional_details || '{}');
        return d.ra_id === raId;
      } catch { return false; }
    });

    if (raLabels.length === 0) {
      // No labels — just mark as executada directly
      if (ra.status !== 'executada') {
        await base44.asServiceRole.entities.AgronomicRecommendation.update(raId, { status: 'executada' });
      }
      return Response.json({
        success: true,
        ra_id: raId,
        ra_code: ra.code,
        new_status: 'executada',
        message: 'RA marked as executada (no labels found).',
      });
    }

    // 5. Count how many FieldRecords exist for this RA's labels
    const allRecords = await base44.asServiceRole.entities.FieldRecord.list("-created_date", 500);
    let registeredCount = 0;

    for (const lbl of raLabels) {
      const hasRecord = allRecords.some(r =>
        r.operator_name === lbl.operator_name &&
        r.orchard_number === lbl.orchard_number &&
        r.planned_date === lbl.date &&
        r.qr_scanned === true
      );
      if (hasRecord) registeredCount++;
    }

    // 6. If all labels have been registered, mark RA as "executada"
    if (registeredCount >= raLabels.length) {
      if (ra.status !== 'executada') {
        await base44.asServiceRole.entities.AgronomicRecommendation.update(raId, { status: 'executada' });
      }
      return Response.json({
        success: true,
        ra_id: raId,
        ra_code: ra.code,
        new_status: 'executada',
        labels_total: raLabels.length,
        labels_registered: registeredCount,
        message: `RA marked as executada (${registeredCount}/${raLabels.length} labels registered).`,
      });
    } else {
      return Response.json({
        success: true,
        ra_id: raId,
        ra_code: ra.code,
        new_status: ra.status,
        labels_total: raLabels.length,
        labels_registered: registeredCount,
        message: `RA stays as ${ra.status} (${registeredCount}/${raLabels.length} labels registered).`,
      });
    }
  } catch (err) {
    return Response.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
