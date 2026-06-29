import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Data de hoje no fuso de São Paulo
    const nowBR = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const todayStr = nowBR.toISOString().split('T')[0];

    // Busca todos os labels com data anterior a hoje
    const allLabels = await base44.asServiceRole.entities.PlanningLabel.filter({
      date: { $lt: todayStr }
    }, 'date', 500);

    if (allLabels.length === 0) {
      return Response.json({ moved: 0, message: 'Nenhum label pendente encontrado.' });
    }

    // Busca labels já existentes para hoje (para evitar duplicatas por qr_data)
    const todaysLabels = await base44.asServiceRole.entities.PlanningLabel.filter({
      date: todayStr
    }, 'date', 500);
    const todayQrDataSet = new Set(todaysLabels.map(l => l.qr_data));

    // Para cada label antigo, verifica se existe um FieldRecord que "encerrou" essa atividade
    // Um registro encerra a atividade se: mesmo operator_id, mesmo orchard, mesmo act_code, na data do label
    const moved = [];
    const duplicatesSkipped = [];

    for (const label of allLabels) {
      let labelOpId = '', actCode = '', orchard = '';
      try {
        const url = new URL(label.qr_data);
        labelOpId = url.searchParams.get('op_id') || '';
        actCode = url.searchParams.get('act_code') || '';
        orchard = url.searchParams.get('orchard') || '';
      } catch {
        continue; // label sem qr_data válido — ignora
      }

      // Trava anti-duplicidade: se já existe um label para hoje com o mesmo qr_data, ignora
      if (todayQrDataSet.has(label.qr_data)) {
        duplicatesSkipped.push(label.id);
        continue;
      }

      // Busca registros fechados para este label na data planejada (campo date do label)
      // Considera também FieldRecords com planned_date igual à data do label
      const records = await base44.asServiceRole.entities.FieldRecord.filter({
        planned_date: label.date,
        operator_id: labelOpId,
        orchard_number: orchard,
      }, '-created_date', 50);

      const finalized = records.some(
        (r) => r.start_time && r.end_time && actCode && r.operation?.includes(actCode)
      );

      if (!finalized) {
        // Atividade ainda pendente — move para hoje, preservando a data original
        const originalDate = label.original_date || label.date;
        await base44.asServiceRole.entities.PlanningLabel.update(label.id, { date: todayStr, auto_rescheduled: true, original_date: originalDate });
        todayQrDataSet.add(label.qr_data);
        moved.push(label.id);
      }
    }

    return Response.json({
      moved: moved.length,
      duplicates_skipped: duplicatesSkipped.length,
      total_checked: allLabels.length,
      message: `${moved.length} atividade(s) movida(s) para hoje (${todayStr}). ${duplicatesSkipped.length} duplicata(s) ignorada(s).`,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});