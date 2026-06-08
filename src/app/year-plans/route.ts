import { NextResponse } from "next/server";
import { getAffiliationYearPlans, getAffiliationZoneFees } from "@/lib/affiliationFee";

export const dynamic = "force-dynamic";

/** GET /year-plans — year/discount plans + configured zones & fees */
export async function GET() {
  try {
    const [plans, zones] = await Promise.all([getAffiliationYearPlans(), getAffiliationZoneFees()]);
    return NextResponse.json({ plans, zones });
  } catch (e) {
    console.error("[year-plans GET]", e);
    return NextResponse.json({ message: "Failed to load affiliation settings." }, { status: 500 });
  }
}
