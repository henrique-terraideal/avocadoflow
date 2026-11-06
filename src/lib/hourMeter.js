import { base44 } from "@/api/base44Client";

export function parseHourMeter(value) {
  try {
    const hm = value ? JSON.parse(value) : {};
    return { start: hm.start ?? "", end: hm.end ?? "" };
  } catch {
    return { start: "", end: "" };
  }
}

export function hourMeterDelta(value) {
  const { start, end } = parseHourMeter(value);
  const s = parseFloat(start);
  const e = parseFloat(end);
  if (isNaN(s) || isNaN(e) || e < s) return null;
  return (e - s).toFixed(1);
}

export function hourMeterIsInvalid(value) {
  const { start, end } = parseHourMeter(value);
  const s = parseFloat(start);
  const e = parseFloat(end);
  return !isNaN(s) && !isNaN(e) && e < s;
}

export function hourMeterFields(fields) {
  return (fields || []).filter((f) => f.field_type === "hour_meter");
}

// Retorna a mensagem de erro do horímetro (ou null quando está tudo certo)
export function validateHourMeters(fields, values) {
  for (const field of hourMeterFields(fields)) {
    const raw = values?.[field.field_label];
    if (!raw) continue;
    const { start, end } = parseHourMeter(raw);
    const s = parseFloat(start);
    const e = parseFloat(end);
    if (isNaN(s) && isNaN(e)) continue;
    if (isNaN(s) || isNaN(e)) {
      return `${field.field_label}: informe o horímetro inicial e o final.`;
    }
    if (e < s) {
      return `${field.field_label}: o horímetro final não pode ser menor que o inicial.`;
    }
  }
  return null;
}

export function lastHourMeterReading(fields, values) {
  let last = null;
  for (const field of hourMeterFields(fields)) {
    const { end } = parseHourMeter(values?.[field.field_label]);
    const e = parseFloat(end);
    if (!isNaN(e) && (last === null || e > last)) last = e;
  }
  return last;
}

export function selectedMachineName(fields, values) {
  const field = (fields || []).find(
    (f) => f.field_type === "machine_selector" && values?.[f.field_label]
  );
  return field ? values[field.field_label] : null;
}

// ID da RA vinculada (campo "ra_id" direto ou JSON de um campo ra_selector)
export function findRAId(values) {
  const v = values || {};
  if (v.ra_id) return v.ra_id;
  for (const val of Object.values(v)) {
    if (typeof val !== "string" || !val.includes("ra_id")) continue;
    try {
      const parsed = JSON.parse(val);
      if (parsed?.ra_id) return parsed.ra_id;
    } catch {}
  }
  return null;
}

async function machineFromRA(values) {
  const raId = findRAId(values);
  if (!raId) return null;
  const ra = await base44.entities.AgronomicRecommendation.get(raId).catch(() => null);
  if (!ra?.machine_id) return null;
  return await base44.entities.Machine.get(ra.machine_id).catch(() => null);
}

// Máquina da atividade: campo "Seleção de Trator" ou a máquina vinculada à RA
export async function resolveMachine(fields, values) {
  const byField = selectedMachineName(fields, values);
  if (byField) {
    const list = await base44.entities.Machine.filter({ name: byField }, "sort_order", 5);
    if (list?.[0]) return list[0];
  }
  return await machineFromRA(values);
}

// Último horímetro final registrado para a máquina da atividade
export async function fetchMachineLastReading(fields, values) {
  const machine = await resolveMachine(fields, values);
  const reading = Number(machine?.last_hour_meter);
  return Number.isFinite(reading) ? reading : null;
}

// Guarda o horímetro final no cadastro da máquina para a próxima utilização
export async function persistMachineHourMeter(fields, values) {
  const machineName = (await resolveMachine(fields, values))?.name;
  const reading = lastHourMeterReading(fields, values);
  if (!machineName || reading === null) return;
  try {
    await base44.functions.invoke("updateMachineHourMeter", {
      machine_name: machineName,
      hour_meter: reading,
    });
  } catch (err) {
    console.error("Falha ao salvar horímetro da máquina:", err);
  }
}