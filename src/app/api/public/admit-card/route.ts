import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { AtcStudent } from "@/models/Student";
import { StudentExam } from "@/models/StudentExam";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const identifier = searchParams.get("identifier");
    const examId = searchParams.get("examId");

    if (!identifier && !examId) {
      return NextResponse.json({ message: "identifier or examId is required." }, { status: 400 });
    }

    await connectDB();

    let examQuery: Record<string, unknown> = {
      approvalStatus: "approved",
      admitCardReleased: true,
    };

    if (examId) {
      if (!mongoose.Types.ObjectId.isValid(examId)) {
        return NextResponse.json({ message: "Invalid examId." }, { status: 400 });
      }
      examQuery = { ...examQuery, _id: new mongoose.Types.ObjectId(examId) };
    } else if (identifier) {
      const studentQuery = mongoose.Types.ObjectId.isValid(identifier)
        ? { _id: new mongoose.Types.ObjectId(identifier) }
        : { $or: [{ enrollmentNo: identifier }, { registrationNo: identifier }] };
      const student = await AtcStudent.findOne(studentQuery).select("_id");
      if (!student) {
        return NextResponse.json({ message: "Student not found." }, { status: 404 });
      }
      examQuery = { ...examQuery, studentId: student._id };
    }

    const exam = await StudentExam.findOne(examQuery).sort({ createdAt: -1 }).lean();
    if (!exam) {
      return NextResponse.json({ message: "Admit card not available yet." }, { status: 404 });
    }

    const student = await AtcStudent.findById(exam.studentId)
      .select("name enrollmentNo registrationNo course tpCode fatherName photo session")
      .lean();

    if (!student) {
      return NextResponse.json({ message: "Student record missing." }, { status: 404 });
    }

    return NextResponse.json({ student, exam });
  } catch (error) {
    console.error("[public/admit-card GET]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

