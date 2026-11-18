// Horários padrão de cada período do dia.
export const PERIOD_TIMES: Record<string, { start: string; end: string }> = {
  "Manhã": { start: "07:00", end: "11:00" },
  "Tarde": { start: "12:00", end: "17:00" },
  "Noite": { start: "18:00", end: "23:59" },
};

// Monta as linhas da aba "Registros" a partir de um registro de campo.
// Um registro com vários períodos gera uma linha por período, cada uma com
// seu horário de início e fim (mesmo record_id na coluna I).
export function buildSheetRows(record: any, syncedAt: string): string[][] {
  const periods = Array.isArray(record?.periods) ? record.periods.filter(Boolean) : [];

  const slots = periods.length > 0
    ? periods.map((p: string) => ({ start: PERIOD_TIMES[p]?.start || "", end: PERIOD_TIMES[p]?.end || "" }))
    : [{ start: record?.start_time || "", end: record?.end_time || "" }];

  return slots.map((slot: { start: string; end: string }) => [
    record.date || "",
    record.operator_name || "",
    record.operation || "",
    record.orchard_number || (record.orchard_numbers || []).join(", "),
    slot.start,
    slot.end,
    record.observations || "",
    syncedAt || "",
    record.id || "",
  ]);
}