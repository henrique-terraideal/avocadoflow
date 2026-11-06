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

// Guarda o horímetro final no cadastro da máquina para a próxima utilização
export async function persistMachineHourMeter(fields, values) {
  const machineName = selectedMachineName(fields, values);
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