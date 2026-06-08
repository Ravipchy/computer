import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongodb";
import { QuestionSet } from "@/models/QuestionSet";
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

export async function GET() {
  await connectDB();
  const sets = await QuestionSet.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json({ sets });
}

export async function POST(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  try {
    const body = await request.json();
    const { title, description, questionCount, durationMinutes, totalMarks } = body as {
      title?: string;
      description?: string;
      questionCount?: number;
      durationMinutes?: number;
      totalMarks?: number;
    };

    if (!title?.trim()) {
      return NextResponse.json({ message: "Title is required." }, { status: 400 });
    }

    await connectDB();
    const set = await QuestionSet.create({
      title: title.trim(),
      description: description?.trim() ?? "",
      questionCount: questionCount ?? 100,
      durationMinutes: durationMinutes ?? 120,
      totalMarks: totalMarks ?? 100,
      isActive: true,
    });

    return NextResponse.json({ set }, { status: 201 });
  } catch (error) {
    console.error("[admin/question-sets POST]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  try {
    const body = await request.json();
    const { id, title, description, questionCount, durationMinutes, totalMarks, isActive } = body as {
      id?: string;
      title?: string;
      description?: string;
      questionCount?: number;
      durationMinutes?: number;
      totalMarks?: number;
      isActive?: boolean;
    };

    if (!id) {
      return NextResponse.json({ message: "Question set id is required." }, { status: 400 });
    }

    await connectDB();
    const set = await QuestionSet.findByIdAndUpdate(
      id,
      {
        ...(title ? { title: title.trim() } : {}),
        ...(description !== undefined ? { description: description.trim() } : {}),
        ...(questionCount !== undefined ? { questionCount } : {}),
        ...(durationMinutes !== undefined ? { durationMinutes } : {}),
        ...(totalMarks !== undefined ? { totalMarks } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      { new: true },
    ).lean();

    if (!set) {
      return NextResponse.json({ message: "Question set not found." }, { status: 404 });
    }

    return NextResponse.json({ set });
  } catch (error) {
    console.error("[admin/question-sets PATCH]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ message: "Question set id is required." }, { status: 400 });
  }

  await connectDB();
  await QuestionSet.findByIdAndDelete(id);
  return NextResponse.json({ message: "Question set deleted." });
}
