import { NextResponse } from "next/server";
import { connectDB, db } from "@/lib/db";

const BG_KEYS = ["id_front", "id_back", "certificate", "marksheet", "admit_card"];

export async function GET() {
  try {
    await connectDB();
    const settings = await db.setting.findMany({
      where: { key: { in: BG_KEYS.map(k => `bg_${k}`) } },
    });
    const data: Record<string, string> = { id_front: "", id_back: "", certificate: "", marksheet: "", admit_card: "" };
    settings.forEach(s => {
      data[s.key.replace("bg_", "")] = s.value || "";
    });
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: "Error fetching backgrounds" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { key, value } = await request.json();
    if (!BG_KEYS.includes(key)) {
      return NextResponse.json({ message: "Invalid key" }, { status: 400 });
    }

    await connectDB();
    await db.setting.upsert({
      where: { key: `bg_${key}` },
      update: { value },
      create: { key: `bg_${key}`, value },
    });

    return NextResponse.json({ message: "Background saved successfully" });
  } catch (error) {
    return NextResponse.json({ message: "Error saving background" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    if (!key || !BG_KEYS.includes(key)) {
      return NextResponse.json({ message: "Invalid key" }, { status: 400 });
    }

    await connectDB();
    await db.setting.delete({ where: { key: `bg_${key}` } });

    return NextResponse.json({ message: "Background removed" });
  } catch (error) {
    return NextResponse.json({ message: "Error removing background" }, { status: 500 });
  }
}
