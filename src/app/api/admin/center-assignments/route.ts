import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongodb";
import { CenterSetAssignment } from "@/models/CenterSetAssignment";
import { AtcUser } from "@/models/AtcUser";
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tpCode = searchParams.get("tpCode");
  const centerId = searchParams.get("centerId");
  if (!tpCode && !centerId) {
    return NextResponse.json({ message: "tpCode or centerId is required." }, { status: 400 });
  }

  await connectDB();
  const query = tpCode ? { tpCode } : { atcId: centerId };
  const assignment = await CenterSetAssignment.findOne(query).lean();
  return NextResponse.json({ assignment });
}

export async function POST(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  try {
    const body = await request.json();
    const { tpCode, centerId, setIds, examDate, notes } = body as {
      tpCode?: string;
      centerId?: string;
      setIds?: string[];
      examDate?: string;
      notes?: string;
    };

    if ((!tpCode && !centerId) || !setIds?.length) {
      return NextResponse.json({ message: "Center identifier and setIds are required." }, { status: 400 });
    }

    if (setIds.length > 5) {
      return NextResponse.json({ message: "A center cannot have more than 5 assigned sets." }, { status: 400 });
    }

    await connectDB();
    const center = tpCode ? await AtcUser.findOne({ tpCode }).lean() : await AtcUser.findById(centerId).lean();
    if (!center) {
      return NextResponse.json({ message: "Center not found." }, { status: 404 });
    }

    const assignment = await CenterSetAssignment.findOneAndUpdate(
      { tpCode: center.tpCode },
      {
        atcId: center._id,
        tpCode: center.tpCode,
        setIds,
        examDate: examDate?.trim() ?? undefined,
        notes: notes?.trim() ?? "",
      },
      { upsert: true, new: true },
    ).lean();

    return NextResponse.json({ assignment });
  } catch (error) {
    console.error("[admin/center-assignments POST]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
