import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongodb";
import { QuestionSet } from "@/models/QuestionSet";
import { cookies } from "next/headers";
import mongoose from "mongoose";

const JWT_SECRET = process.env.JWT_SECRET as string;

async function verifyAtc(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("atc_token")?.value ?? "";
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    return decoded.role === "atc" ? decoded : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const atc = await verifyAtc(request);
  if (!atc) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  await connectDB();
  const query = {
    $or: [
      { atcId: new mongoose.Types.ObjectId(atc.id) },
      { atcId: { $exists: false } },
      { atcId: null }
    ]
  };
  const sets = await QuestionSet.find(query).sort({ createdAt: -1 }).lean();
  return NextResponse.json({ sets });
}

export async function POST(request: Request) {
  const atc = await verifyAtc(request);
  if (!atc) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  try {
    await connectDB();
    
    // LIMIT CHECK: Only 5 sets allowed for ATC
    const count = await QuestionSet.countDocuments({ atcId: new mongoose.Types.ObjectId(atc.id) });
    if (count >= 5) {
      return NextResponse.json({ message: "Limit reached. You can only create up to 5 exam sets." }, { status: 400 });
    }

    const body = await request.json();
    const { title, description, questionCount, durationMinutes, totalMarks, examMode } = body;

    if (!title?.trim()) {
      return NextResponse.json({ message: "Title is required." }, { status: 400 });
    }

    const set = await QuestionSet.create({
      atcId: new mongoose.Types.ObjectId(atc.id),
      title: title.trim(),
      description: description?.trim() ?? "",
      questionCount: questionCount ?? 100,
      durationMinutes: durationMinutes ?? 120,
      totalMarks: totalMarks ?? 100,
      examMode: examMode ?? "both",
      isActive: true,
    });

    return NextResponse.json({ set }, { status: 201 });
  } catch (error) {
    console.error("[atc/question-sets POST]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const atc = await verifyAtc(request);
  if (!atc) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  try {
    const body = await request.json();
    const { id, title, description, questionCount, durationMinutes, totalMarks, examMode, isActive } = body;

    if (!id) return NextResponse.json({ message: "Id is required." }, { status: 400 });

    await connectDB();
    const set = await QuestionSet.findOneAndUpdate(
      { _id: id, atcId: new mongoose.Types.ObjectId(atc.id) },
      {
        ...(title ? { title: title.trim() } : {}),
        ...(description !== undefined ? { description: description.trim() } : {}),
        ...(questionCount !== undefined ? { questionCount } : {}),
        ...(durationMinutes !== undefined ? { durationMinutes } : {}),
        ...(totalMarks !== undefined ? { totalMarks } : {}),
        ...(examMode !== undefined ? { examMode } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      { new: true }
    ).lean();

    if (!set) return NextResponse.json({ message: "Set not found or unauthorized." }, { status: 404 });

    return NextResponse.json({ set });
  } catch (error) {
    return NextResponse.json({ message: "Error updating set." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const atc = await verifyAtc(request);
  if (!atc) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ message: "Id is required." }, { status: 400 });

  await connectDB();
  const result = await QuestionSet.deleteOne({ _id: id, atcId: new mongoose.Types.ObjectId(atc.id) });
  
  if (result.deletedCount === 0) {
    return NextResponse.json({ message: "Set not found or unauthorized." }, { status: 404 });
  }

  return NextResponse.json({ message: "Question set deleted." });
}
