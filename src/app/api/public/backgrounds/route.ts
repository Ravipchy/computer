import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";

const BG_KEYS = ["id_front", "id_back", "certificate", "marksheet", "admit_card"];

export async function GET() {
  try {
    await connectDB();
    const settings = await Settings.find({ key: { $in: BG_KEYS.map(k => `bg_${k}`) } });
    const data: Record<string, string> = { id_front: "", id_back: "", certificate: "", marksheet: "", admit_card: "" };
    settings.forEach((s) => {
      const normalizedKey = s.key.replace("bg_", "");
      const normalizedValue = typeof s.value === "string" && s.value.trim() !== "-" ? s.value : "";
      data[normalizedKey] = normalizedValue;
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: "Error fetching assets" }, { status: 500 });
  }
}
