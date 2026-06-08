import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";

const ALLOWED_PUBLIC_KEYS = new Set([
  "qr_code",
  "auth_signature",
  "authorized_signature",
  "process_fee_options",
  "brand_name",
  "brand_mobile",
  "brand_email",
  "brand_address",
  "brand_url",
  "brand_logo",
  /** JSON array of { minPercent, grade } for marksheet letter grades (public read for print preview). */
  "marksheet_grade_bands",
]);

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key") || "";
    if (!key || !ALLOWED_PUBLIC_KEYS.has(key)) {
      return NextResponse.json({ message: "Invalid key." }, { status: 400 });
    }

    await connectDB();
    const row = await Settings.findOne({ key }).lean();
    return NextResponse.json({ key, value: row?.value ?? null });
  } catch {
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

