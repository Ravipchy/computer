import { connectDB } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";
import {
  DEFAULT_AFFILIATION_YEAR_PLANS,
  type FeeCalculationSnapshot,
  type YearPlan,
  type ZoneFeeRow,
  SETTINGS_AFFILIATION_YEAR_PLANS_KEY,
  SETTINGS_AFFILIATION_ZONE_FEES_KEY,
  parseAffiliationYearPlansJson,
  parseAffiliationZoneFeesJson,
  zoneFeesToMap,
} from "@/utils/affiliationFeeShared";

export type { FeeCalculationSnapshot, YearPlan, ZoneFeeRow };
export {
  SETTINGS_AFFILIATION_YEAR_PLANS_KEY,
  SETTINGS_AFFILIATION_ZONE_FEES_KEY,
  DEFAULT_AFFILIATION_YEAR_PLANS,
  zoneFeesToMap,
  parseAffiliationZoneFeesJson,
};

export async function getAffiliationYearPlans(): Promise<YearPlan[]> {
  await connectDB();
  const row = await Settings.findOne({ key: SETTINGS_AFFILIATION_YEAR_PLANS_KEY }).lean();
  return parseAffiliationYearPlansJson(row?.value ?? null);
}

export async function getAffiliationZoneFees(): Promise<ZoneFeeRow[]> {
  await connectDB();
  const row = await Settings.findOne({ key: SETTINGS_AFFILIATION_ZONE_FEES_KEY }).lean();
  return parseAffiliationZoneFeesJson(row?.value ?? null);
}

export function sumZoneBaseAmount(
  zones: string[],
  feeByZone: Map<string, number>,
): { ok: true; total: number; lineItems: { zone: string; amount: number }[] } | { ok: false; error: string } {
  if (!zones.length) return { ok: false, error: "Select at least one zone." };
  const lineItems: { zone: string; amount: number }[] = [];
  let total = 0;
  for (const z of zones) {
    const amt = feeByZone.get(z);
    if (amt === undefined) return { ok: false, error: `Invalid zone: ${z}` };
    lineItems.push({ zone: z, amount: amt });
    total += amt;
  }
  return { ok: true, total, lineItems };
}

/**
 * totalAmount = sum of selected zones
 * finalAmount = totalAmount × selectedYear
 * discountAmount = round((finalAmount × discount) / 100)
 * payableAmount = finalAmount - discountAmount
 */
export function calculateAffiliationFee(
  zones: string[],
  affiliationYear: number,
  yearPlans: YearPlan[],
  feeByZone: Map<string, number>,
):
  | { ok: true; data: FeeCalculationSnapshot }
  | { ok: false; error: string; status?: number } {
  const base = sumZoneBaseAmount(zones, feeByZone);
  if (!base.ok) return { ok: false, error: base.error, status: 400 };

  const plan = yearPlans.find((p) => p.year === affiliationYear);
  if (!plan) {
    return { ok: false, error: "Invalid or unavailable affiliation year.", status: 400 };
  }

  const totalAmount = base.total;
  const finalAmount = totalAmount * affiliationYear;
  const discountAmount = Math.round((finalAmount * plan.discountPercent) / 100);
  const payableAmount = finalAmount - discountAmount;

  return {
    ok: true,
    data: {
      zoneLineItems: base.lineItems,
      totalAmount,
      affiliationYear,
      discountPercent: plan.discountPercent,
      finalAmount,
      discountAmount,
      payableAmount,
    },
  };
}

export function parseZonesFromForm(raw: string | unknown, validNames: Set<string>): string[] {
  let arr: unknown[] = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === "string") {
    try {
      const j = JSON.parse(raw) as unknown;
      arr = Array.isArray(j) ? j : [];
    } catch {
      return [];
    }
  }
  const unique = [...new Set(arr.filter((z): z is string => typeof z === "string"))];
  return unique.filter((z) => validNames.has(z));
}

/** Loads DB plans and returns snapshot + payable string for legacy `processFee` column. */
export async function resolveAffiliationFeeForPersist(
  zonesRaw: unknown,
  affiliationYearRaw: unknown,
): Promise<
  | { ok: true; feeCalculation: FeeCalculationSnapshot; processFee: string; affiliationPlanYear: number; zones: string[] }
  | { ok: false; error: string; status: number }
> {
  const zoneRows = await getAffiliationZoneFees();
  const feeByZone = zoneFeesToMap(zoneRows);
  const validNames = new Set(zoneRows.map((r) => r.name.trim()).filter(Boolean));

  const zones = parseZonesFromForm(
    typeof zonesRaw === "string" ? zonesRaw : JSON.stringify(zonesRaw ?? []),
    validNames,
  );
  const yearNum =
    typeof affiliationYearRaw === "number"
      ? affiliationYearRaw
      : parseInt(String(affiliationYearRaw ?? "").trim(), 10);
  if (!Number.isFinite(yearNum) || yearNum < 1) {
    return { ok: false, error: "Invalid affiliation year.", status: 400 };
  }

  const yearPlans = await getAffiliationYearPlans();
  const result = calculateAffiliationFee(zones, Math.floor(yearNum), yearPlans, feeByZone);
  if (!result.ok) {
    return { ok: false, error: result.error, status: result.status ?? 400 };
  }

  return {
    ok: true,
    feeCalculation: result.data,
    affiliationPlanYear: result.data.affiliationYear,
    processFee: String(result.data.payableAmount),
    zones,
  };
}
