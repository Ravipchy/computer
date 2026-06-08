import { NextResponse } from "next/server";
import {
  calculateAffiliationFee,
  getAffiliationYearPlans,
  getAffiliationZoneFees,
  parseZonesFromForm,
  zoneFeesToMap,
} from "@/lib/affiliationFee";

export const dynamic = "force-dynamic";

type Body = { zones?: unknown; year?: unknown };

/** POST /calculate-fee — authoritative fee breakdown */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const rawZones = Array.isArray(body.zones)
      ? body.zones.filter((z): z is string => typeof z === "string")
      : [];
    const uniqueZones = [...new Set(rawZones)];
    const year = typeof body.year === "number" ? body.year : Number(body.year);

    const [zoneRows, yearPlans] = await Promise.all([getAffiliationZoneFees(), getAffiliationYearPlans()]);
    const feeByZone = zoneFeesToMap(zoneRows);
    const validNames = new Set(zoneRows.map((r) => r.name.trim()).filter(Boolean));

    const normalizedZones = parseZonesFromForm(JSON.stringify(uniqueZones), validNames);
    if (normalizedZones.length !== uniqueZones.length) {
      return NextResponse.json({ message: "One or more zones are invalid." }, { status: 400 });
    }

    if (!Number.isFinite(year) || year < 1) {
      return NextResponse.json({ message: "Invalid affiliation year." }, { status: 400 });
    }

    const result = calculateAffiliationFee(normalizedZones, Math.floor(year), yearPlans, feeByZone);
    if (!result.ok) {
      return NextResponse.json({ message: result.error }, { status: result.status ?? 400 });
    }

    return NextResponse.json({ calculation: result.data });
  } catch (e) {
    console.error("[calculate-fee POST]", e);
    return NextResponse.json({ message: "Failed to calculate fee." }, { status: 500 });
  }
}
