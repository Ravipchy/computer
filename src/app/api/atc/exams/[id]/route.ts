import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
// Force rebuild - fix build cache
import { StudentExam } from "@/models/StudentExam";
import { AtcStudent } from "@/models/Student";
import { StudentMedia } from "@/models/StudentMedia";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("atc_token")?.value;
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { id: examId } = await params;
    await connectDB();

    let exam = await StudentExam.findById(examId).lean();
    if (!exam && mongoose.Types.ObjectId.isValid(examId)) {
      // Backward compatibility: some old links pass studentId instead of examId.
      exam = await StudentExam.findOne({ studentId: examId })
        .sort({ createdAt: -1 })
        .lean();
    }
    if (!exam) return NextResponse.json({ message: "Exam not found" }, { status: 404 });

    const student = await AtcStudent.findById(exam.studentId).lean();
    if (!student) return NextResponse.json({ message: "Student not found" }, { status: 404 });

    // Fetch student media (photo)
    const photoMedia = await StudentMedia.findOne({ studentId: student._id, fieldName: "photo" }).lean();
    const studentWithPhoto = { ...student, photo: photoMedia?.content || "" };

    return NextResponse.json({ exam, student: studentWithPhoto });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
