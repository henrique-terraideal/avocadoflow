export const PERIODS = ["Manhã", "Tarde", "Noite"];

export function formatPeriods(record) {
  const list = Array.isArray(record?.periods) ? record.periods.filter(Boolean) : [];
  if (list.length > 0) return list.join(" · ");
  if (record?.start_time) {
    return record.end_time ? `${record.start_time} → ${record.end_time}` : record.start_time;
  }
  return "—";
}

export function formatOrchards(record) {
  const list = Array.isArray(record?.orchard_numbers)
    ? record.orchard_numbers.filter(Boolean)
    : [];
  if (list.length > 0) return list.join(", ");
  return record?.orchard_number || "—";
}

export function joinOrchards(codes) {
  const list = (codes || []).filter(Boolean);
  return list.length > 0 ? list.join(", ") : "";
}