import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { StudentExam } from "@/models/StudentExam";
import { AtcStudent } from "@/models/Student";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { examId, resultDeclared } = body;

    if (!examId) {
      return NextResponse.json({ message: "examId is required." }, { status: 400 });
    }

    await connectDB();

    const exam = await StudentExam.findById(examId);
    if (!exam) {
      return NextResponse.json({ message: "Exam record not found." }, { status: 404 });
    }

    // Update Exam record
    exam.resultDeclared = resultDeclared ?? true;
    if (exam.resultDeclared) {
      exam.status = "completed";
      exam.submittedAt = exam.submittedAt || new Date();
      if (exam.examMode === "offline") {
        exam.offlineExamStatus = "published";
      }
    }

    await exam.save();

    // Sync to AtcStudent profile
    await AtcStudent.findByIdAndUpdate(exam.studentId, {
      offlineExamStatus: exam.offlineExamStatus,
      offlineExamMarks: exam.totalScore.toString(),
      offlineExamResult: exam.offlineExamResult,
      offlineExamCopy: exam.offlineExamCopy
    });

    return NextResponse.json({ message: "Result declared and synced successfully.", exam });
  } catch (error: any) {
    console.error("[admin/exams/declare-result POST]", error);
    return NextResponse.json({ message: error.message || "Internal server error." }, { status: 500 });
  }
}
