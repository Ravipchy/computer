/** Shared client/server helpers for affiliation zone & year pricing. */

export const SETTINGS_AFFILIATION_YEAR_PLANS_KEY = "affiliation_year_plans";
export const SETTINGS_AFFILIATION_ZONE_FEES_KEY = "affiliation_zone_fees";

export type ZoneFeeRow = { name: string; amount: number };

export type YearPlan = { year: number; discountPercent: number };

export const DEFAULT_AFFILIATION_YEAR_PLANS: YearPlan[] = [
  { year: 1, discountPercent: 0 },
  { year: 2, discountPercent: 10 },
  { year: 3, discountPercent: 20 },
];

export type FeeCalculationSnapshot = {
  zoneLineItems: { zone: string; amount: number }[];
  totalAmount: number;
  affiliationYear: number;
  discountPercent: number;
  finalAmount: number;
  discountAmount: number;
  payableAmount: number;
};

export function zoneFeesToMap(rows: ZoneFeeRow[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const k = r.name.trim();
    if (k) m.set(k, Math.max(0, Math.round(r.amount)));
  }
  return m;
}

export function sumZoneAmountFromRows(selectedZones: string[], rows: ZoneFeeRow[]): number {
  const m = zoneFeesToMap(rows);
  let t = 0;
  for (const z of selectedZones) {
    const a = m.get(z);
    if (a !== undefined) t += a;
  }
  return t;
}

/** Parse stored JSON setting value (client or server). */
export function parseAffiliationYearPlansJson(value: string | null | undefined): YearPlan[] {
  if (!value) return [...DEFAULT_AFFILIATION_YEAR_PLANS];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_AFFILIATION_YEAR_PLANS];
    const rows = parsed
      .filter(
        (p): p is { year: number; discountPercent: number } =>
          p != null &&
          typeof p === "object" &&
          typeof (p as { year?: unknown }).year === "number" &&
          typeof (p as { discountPercent?: unknown }).discountPercent === "number",
      )
      .map((p) => ({
        year: Math.max(1, Math.floor(p.year)),
        discountPercent: Math.max(0, Math.min(100, Math.round(p.discountPercent))),
      }))
      .sort((a, b) => a.year - b.year);
    return rows.length > 0 ? rows : [...DEFAULT_AFFILIATION_YEAR_PLANS];
  } catch {
    return [...DEFAULT_AFFILIATION_YEAR_PLANS];
  }
}

/** Parses stored JSON; order matches admin settings. Returns [] if unset or invalid — no built-in defaults. */
export function parseAffiliationZoneFeesJson(value: string | null | undefined): ZoneFeeRow[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    /** Preserve saved array order (admin panel sequence); later duplicates update amount only. */
    const order: string[] = [];
    const byName = new Map<string, ZoneFeeRow>();
    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const name = String((item as { name?: unknown }).name ?? "").trim();
      const amount = Number((item as { amount?: unknown }).amount);
      if (!name || !Number.isFinite(amount) || amount < 0) continue;
      const row = { name, amount: Math.round(amount) };
      if (!byName.has(name)) order.push(name);
      byName.set(name, row);
    }
    return order.map((n) => byName.get(n)!);
  } catch {
    return [];
  }
}
