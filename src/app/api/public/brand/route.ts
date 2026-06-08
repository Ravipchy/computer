import { NextResponse } from "next/server";
import { connectDB, db } from "@/lib/db";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectDB();

    const keys = [
      "brand_name",
      "brand_mobile",
      "brand_email",
      "brand_address",
      "brand_url",
      "brand_logo",
      "qr_code",
      "auth_signature",
    ];

    const settings = await db.setting.findMany({
      where: { key: { in: keys } },
    });

    const brandData = keys.reduce((acc: Record<string, string>, key) => {
      acc[key] = "";
      return acc;
    }, {});

    settings.forEach((setting: { key: string; value?: string | null }) => {
      brandData[setting.key] = setting.value || "";
    });

    return NextResponse.json(brandData);
  } catch (error) {
    console.error("[public/brand GET]", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
