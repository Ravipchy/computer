import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB, db } from "@/lib/db";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET as string;

async function verifyAdmin(request: Request) {
  const cookieStore = await cookies();
  let token = cookieStore.get("admin_token")?.value ?? "";
  if (!token) {
    const auth = request.headers.get("Authorization") ?? "";
    token = auth.replace("Bearer ", "");
  }
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    return decoded.role === "admin" ? decoded : null;
  } catch {
    return null;
  }
}

// GET — public, fetch a setting by key (e.g. ?key=qr_code)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  if (!key) return NextResponse.json({ message: "key is required" }, { status: 400 });

  await connectDB();
  const setting = await db.setting.findUnique({ where: { key } });
  if (!setting) return NextResponse.json({ value: null });
  return NextResponse.json({ value: setting.value });
}

// POST — admin only, save a setting
export async function POST(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  try {
    const body = (await request.json()) as { key: string; value: string };
    if (!body.key || body.value === undefined || body.value === null) {
      return NextResponse.json({ message: "key and value are required." }, { status: 400 });
    }

    await connectDB();

    await db.setting.upsert({
      where: { key: body.key },
      update: { value: body.value },
      create: { key: body.key, value: body.value },
    });

    return NextResponse.json({ message: "Setting saved successfully." });
  } catch (error) {
    console.error("[admin/settings POST]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
