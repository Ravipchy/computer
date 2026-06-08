import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongodb";
import { ExamQuestion } from "@/models/ExamQuestion";
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

  const { searchParams } = new URL(request.url);
  const setId = searchParams.get("setId");
  if (!setId) return NextResponse.json({ message: "setId is required." }, { status: 400 });

  await connectDB();
  // Ensure the set belongs to this ATC
  const set = await QuestionSet.findOne({ _id: setId, atcId: new mongoose.Types.ObjectId(atc.id) }).lean();
  if (!set) return NextResponse.json({ message: "Question set not found or unauthorized." }, { status: 404 });

  const questions = await ExamQuestion.find({ setId }).sort({ createdAt: 1 }).lean();
  return NextResponse.json({ set, questions });
}

export async function POST(request: Request) {
  const atc = await verifyAtc(request);
  if (!atc) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  try {
    const body = await request.json();
    const { setId, questionText, options, correctOption, marks } = body;

    if (!setId || !questionText?.trim() || !options?.length || !correctOption?.trim()) {
      return NextResponse.json({ message: "Required fields missing." }, { status: 400 });
    }

    await connectDB();
    const set = await QuestionSet.findOne({ _id: setId, atcId: new mongoose.Types.ObjectId(atc.id) }).lean();
    if (!set) return NextResponse.json({ message: "Question set not found or unauthorized." }, { status: 404 });

    const question = await ExamQuestion.create({
      setId,
      questionText: questionText.trim(),
      options: options.map((option: string) => option.trim()),
      correctOption: correctOption.trim(),
      marks: marks ?? 1,
      isActive: true,
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const atc = await verifyAtc(request);
  if (!atc) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  try {
    const body = await request.json();
    const { id, questionText, options, correctOption, marks, isActive } = body;
    if (!id) return NextResponse.json({ message: "Id is required." }, { status: 400 });

    await connectDB();
    // Find question and check parent set ownership
    const question = await ExamQuestion.findById(id);
    if (!question) return NextResponse.json({ message: "Question not found." }, { status: 404 });

    const set = await QuestionSet.findOne({ _id: question.setId, atcId: new mongoose.Types.ObjectId(atc.id) }).lean();
    if (!set) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

    const updated = await ExamQuestion.findByIdAndUpdate(
      id,
      {
        ...(questionText ? { questionText: questionText.trim() } : {}),
        ...(options ? { options: options.map((opt: string) => opt.trim()) } : {}),
        ...(correctOption ? { correctOption: correctOption.trim() } : {}),
        ...(marks !== undefined ? { marks } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      { new: true }
    ).lean();

    return NextResponse.json({ question: updated });
  } catch (error) {
    return NextResponse.json({ message: "Error updating question." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const atc = await verifyAtc(request);
  if (!atc) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ message: "Id is required." }, { status: 400 });

  await connectDB();
  const question = await ExamQuestion.findById(id);
  if (!question) return NextResponse.json({ message: "Question not found." }, { status: 404 });

  const set = await QuestionSet.findOne({ _id: question.setId, atcId: new mongoose.Types.ObjectId(atc.id) }).lean();
  if (!set) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  await ExamQuestion.findByIdAndDelete(id);
  return NextResponse.json({ message: "Question deleted." });
}
