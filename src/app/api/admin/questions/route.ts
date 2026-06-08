import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongodb";
import { ExamQuestion } from "@/models/ExamQuestion";
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const setId = searchParams.get("setId");
  if (!setId) {
    return NextResponse.json({ message: "setId is required." }, { status: 400 });
  }

  await connectDB();
  const set = await QuestionSet.findById(setId).lean();
  if (!set) {
    return NextResponse.json({ message: "Question set not found." }, { status: 404 });
  }

  const questions = await ExamQuestion.find({ setId }).sort({ createdAt: 1 }).lean();
  return NextResponse.json({ set, questions });
}

export async function POST(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  try {
    const body = await request.json();
    const { setId, questionText, options, correctOption, marks } = body as {
      setId?: string;
      questionText?: string;
      options?: string[];
      correctOption?: string;
      marks?: number;
    };

    if (!setId || !questionText?.trim() || !options?.length || !correctOption?.trim()) {
      return NextResponse.json({ message: "setId, questionText, options, and correctOption are required." }, { status: 400 });
    }

    await connectDB();
    const set = await QuestionSet.findById(setId).lean();
    if (!set) {
      return NextResponse.json({ message: "Question set not found." }, { status: 404 });
    }

    const question = await ExamQuestion.create({
      setId,
      questionText: questionText.trim(),
      options: options.map((option) => option.trim()),
      correctOption: correctOption.trim(),
      marks: marks ?? 1,
      isActive: true,
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    console.error("[admin/questions POST]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  try {
    const body = await request.json();
    const { id, questionText, options, correctOption, marks, isActive } = body as {
      id?: string;
      questionText?: string;
      options?: string[];
      correctOption?: string;
      marks?: number;
      isActive?: boolean;
    };
    if (!id) {
      return NextResponse.json({ message: "Question id is required." }, { status: 400 });
    }

    await connectDB();
    const updated = await ExamQuestion.findByIdAndUpdate(
      id,
      {
        ...(questionText ? { questionText: questionText.trim() } : {}),
        ...(options ? { options: options.map((option) => option.trim()) } : {}),
        ...(correctOption ? { correctOption: correctOption.trim() } : {}),
        ...(marks !== undefined ? { marks } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      { new: true },
    ).lean();

    if (!updated) {
      return NextResponse.json({ message: "Question not found." }, { status: 404 });
    }

    return NextResponse.json({ question: updated });
  } catch (error) {
    console.error("[admin/questions PATCH]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ message: "Question id is required." }, { status: 400 });
  }

  await connectDB();
  await ExamQuestion.findByIdAndDelete(id);
  return NextResponse.json({ message: "Question deleted." });
}
