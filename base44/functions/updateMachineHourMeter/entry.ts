import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const machineName = typeof body.machine_name === 'string' ? body.machine_name.trim() : '';
    const reading = Number(body.hour_meter);
    if (!machineName || !Number.isFinite(reading) || reading < 0) {
      return Response.json({ error: 'machine_name e hour_meter válidos são obrigatórios' }, { status: 400 });
    }

    const machines = await base44.asServiceRole.entities.Machine.filter({ name: machineName });
    const machine = machines[0];
    if (!machine) return Response.json({ error: 'Máquina não encontrada' }, { status: 404 });

    const current = Number(machine.last_hour_meter);
    if (Number.isFinite(current) && reading < current) {
      return Response.json({ updated: false, last_hour_meter: current });
    }

    const updated = await base44.asServiceRole.entities.Machine.update(machine.id, {
      last_hour_meter: reading,
    });
    return Response.json({ updated: true, last_hour_meter: updated.last_hour_meter });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}