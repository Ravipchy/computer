import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    await connectDB();
    
    if (key) {
      const setting = await Settings.findOne({ key });
      return NextResponse.json({ value: setting?.value || "" });
    }

    // Default to backgrounds
    const BG_KEYS = ["bg_id_front", "bg_id_back", "bg_certificate", "bg_marksheet", "bg_admit_card", "auth_signature"];
    const settings = await Settings.find({ key: { $in: BG_KEYS } });
    
    const data: Record<string, string> = {};
    settings.forEach((s) => {
      const normalizedKey = s.key.replace("bg_", "");
      const normalizedValue = typeof s.value === "string" && s.value.trim() !== "-" ? s.value : "";
      data[normalizedKey] = normalizedValue;
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
