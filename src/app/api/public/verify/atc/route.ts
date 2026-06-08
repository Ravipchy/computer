import { NextResponse } from "next/server";
import { connectDB as dbConnect } from "@/lib/mongodb";
import { AtcUser } from "@/models/AtcUser";
import { AtcApplication } from "@/models/AtcApplication";

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const registrationId = searchParams.get("registrationId");

    if (!registrationId) {
      return NextResponse.json({ message: "Registration ID or ATC Code is required" }, { status: 400 });
    }

    const atcMatch = await AtcUser.findOne({ tpCode: registrationId.trim() }).populate("applicationId");

    if (!atcMatch) {
      return NextResponse.json({ message: "ATC not found with provided ID" }, { status: 404 });
    }

    const app = atcMatch.applicationId as any;

    const responseData = {
      atcName: atcMatch.trainingPartnerName,
      atcCode: atcMatch.tpCode,
      centerDetails: app ? `${app.trainingPartnerAddress}, ${app.district}, ${app.state} - ${app.pin}` : "N/A",
      contactInfo: atcMatch.mobile || atcMatch.email,
      status: atcMatch.status === 'active' ? 'Active' : 'Disabled'
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("ATC verification error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
