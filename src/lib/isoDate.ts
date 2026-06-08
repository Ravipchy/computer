/** Earliest selectable calendar day for DOB / payment / admission-style fields. */
export const ISO_DATE_MIN = "1900-01-01";

/** Upper bound for schedule-style fields (exams, preferences). Keeps year within sensible range. */
export const ISO_DATE_MAX_SCHEDULE = "2100-12-31";

/** Today in UTC YYYY-MM-DD (call when rendering inputs so the max stays current). */
export function isoDateToday(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Normalize paste/typed fragments toward YYYY-MM-DD (year capped at 4 digits). */
export function normalizeIsoDate(raw: unknown): string {
  const cleaned = String(raw ?? "").trim().replace(/[^\d-]/g, "");
  const parts = cleaned.split("-");
  const year = (parts[0] || "").slice(0, 4);
  const month = (parts[1] || "").slice(0, 2);
  const day = (parts[2] || "").slice(0, 2);
  return [year, month, day].filter(Boolean).join("-");
}

/** Alias for controlled `<input type="date">` — keeps the year segment to 4 digits. */
export const sanitizeIsoDateInput = normalizeIsoDate;

/** Strict ISO calendar date with exactly four-digit year. */
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString().slice(0, 10) === value;
}
