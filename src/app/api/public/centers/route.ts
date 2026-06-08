import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { connectDB } from "@/lib/mongodb";
import { AtcUser } from "@/models/AtcUser";
import { AtcApplication } from "@/models/AtcApplication";

export async function GET() {
  try {
    await connectDB();
    // Source 1: ATC users (active/disabled both, for visibility in public form)
    const users = await AtcUser.find({
      tpCode: { $exists: true, $ne: "" },
      trainingPartnerName: { $exists: true, $ne: "" },
    })
      .populate("applicationId", "signature mobile trainingPartnerAddress")
      .select("tpCode trainingPartnerName applicationId")
      .lean();

    const applications = await AtcApplication.find({
      status: "approved",
      tpCode: { $exists: true, $ne: "" },
      trainingPartnerName: { $exists: true, $ne: "" },
    })
      .select("tpCode trainingPartnerName signature mobile trainingPartnerAddress")
      .lean();

    const uniqueByCode = new Map<string, { tpCode: string; trainingPartnerName: string; signature?: string; mobile?: string; trainingPartnerAddress?: string }>();
    for (const c of users) {
      const app = c.applicationId as any;
      uniqueByCode.set(String(c.tpCode), {
        tpCode: String(c.tpCode),
        trainingPartnerName: String(c.trainingPartnerName),
        signature: app?.signature,
        mobile: app?.mobile,
        trainingPartnerAddress: app?.trainingPartnerAddress,
      });
    }
    for (const c of applications) {
      const code = String(c.tpCode);
      const existing = uniqueByCode.get(code) || { tpCode: code, trainingPartnerName: String(c.trainingPartnerName) };
      existing.signature = c.signature;
      existing.mobile = c.mobile;
      existing.trainingPartnerAddress = c.trainingPartnerAddress;
      uniqueByCode.set(code, existing);
    }

    const normalizedCenters = Array.from(uniqueByCode.values()).sort((a, b) =>
      a.trainingPartnerName.localeCompare(b.trainingPartnerName),
    );

    return NextResponse.json(normalizedCenters);
  } catch (error: any) {
    console.error("[api/public/centers GET]", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
