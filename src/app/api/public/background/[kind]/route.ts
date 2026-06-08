import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Settings } from "@/models/Settings";

const STORAGE_KEY = {
  certificate: "bg_certificate",
  marksheet: "bg_marksheet",
} as const;

export async function GET(
  _request: Request,
  context: { params: Promise<{ kind: string }> },
) {
  const raw = (await context.params).kind?.toLowerCase() ?? "";
  if (raw !== "certificate" && raw !== "marksheet") {
    return NextResponse.json({ message: "Invalid background kind" }, { status: 400 });
  }
  const kind = raw as keyof typeof STORAGE_KEY;

  try {
    await connectDB();
    const doc = await Settings.findOne({ key: STORAGE_KEY[kind] }).lean();
    const value =
      typeof doc?.value === "string" && doc.value.trim() !== "-" ? doc.value.trim() : "";

    const res = NextResponse.json({ url: value });
    res.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=86400");
    return res;
  } catch {
    return NextResponse.json({ message: "Error fetching asset" }, { status: 500 });
  }
}
