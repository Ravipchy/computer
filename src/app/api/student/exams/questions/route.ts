import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { ExamQuestion } from "@/models/ExamQuestion";
import { StudentExam } from "@/models/StudentExam";
import "@/models/QuestionSet"; // Register model dependency
import { buildExamWindow, lifecycleStatusForExam } from "@/lib/exam-schedule";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const setId = searchParams.get("setId");
  const examId = searchParams.get("examId");
  const studentId = searchParams.get("studentId");

  if (!setId || !examId || !studentId) {
    return NextResponse.json({ message: "setId, examId and studentId are required" }, { status: 400 });
  }

  try {
    await connectDB();
    const examDoc = await StudentExam.findById(examId);
    if (!examDoc || String(examDoc.studentId) !== String(studentId)) {
      return NextResponse.json({ message: "Exam record not found." }, { status: 404 });
    }
    const exam = examDoc.toObject();
    if (exam.examMode !== "online") {
      return NextResponse.json({ message: "Only online exams can be started." }, { status: 400 });
    }
    if (exam.approvalStatus !== "approved") {
      return NextResponse.json({ message: "Exam is not approved yet." }, { status: 403 });
    }
    if (exam.status === "completed") {
      return NextResponse.json({ message: "Exam attempt already completed." }, { status: 409 });
    }

    const hasExplicitSchedule = Boolean(
      exam.examDateTime || (exam.examDate && exam.examTime),
    );

    let timeLeftSeconds = 0;

    // For "instant online exams" (no explicit schedule set by admin), run timer from first start.
    if (exam.examMode === "online" && !hasExplicitSchedule) {
      const durationMinutes = Math.max(1, Number(exam.durationMinutes ?? 60) || 60);
      const startAnchor = examDoc.startedAt ? new Date(examDoc.startedAt) : new Date();

      if (!examDoc.startedAt) {
        examDoc.startedAt = startAnchor;
        await examDoc.save();
      }

      const endsAt = new Date(startAnchor.getTime() + durationMinutes * 60_000);
      timeLeftSeconds = Math.max(0, Math.floor((endsAt.getTime() - Date.now()) / 1000));
      if (timeLeftSeconds <= 0) {
        return NextResponse.json({ message: "Exam time window is over." }, { status: 403 });
      }
    } else {
      const lifecycleStatus = lifecycleStatusForExam(exam);
      if (lifecycleStatus === "upcoming") {
        // Fallback for production timezone/schedule drifts:
        // approved online exams can start immediately unless already completed.
        const durationMinutes = Math.max(1, Number(exam.durationMinutes ?? 60) || 60);
        const startAnchor = examDoc.startedAt ? new Date(examDoc.startedAt) : new Date();
        if (!examDoc.startedAt) {
          examDoc.startedAt = startAnchor;
          await examDoc.save();
        }
        const endsAt = new Date(startAnchor.getTime() + durationMinutes * 60_000);
        timeLeftSeconds = Math.max(0, Math.floor((endsAt.getTime() - Date.now()) / 1000));
        if (timeLeftSeconds <= 0) {
          return NextResponse.json({ message: "Exam time window is over." }, { status: 403 });
        }
      } else {
        if (lifecycleStatus === "completed") {
          return NextResponse.json({ message: "Exam time window is over." }, { status: 403 });
        }

        const { endsAt, now } = buildExamWindow(exam);
        timeLeftSeconds = endsAt ? Math.max(0, Math.floor((endsAt.getTime() - now.getTime()) / 1000)) : 0;
        if (timeLeftSeconds <= 0) {
          return NextResponse.json({ message: "Exam time window is over." }, { status: 403 });
        }

        if (!examDoc.startedAt) {
          examDoc.startedAt = new Date();
          await examDoc.save();
        }
      }
    }

    const questions = await ExamQuestion.find({ setId, isActive: true }).lean();
    return NextResponse.json({ questions, timeLeftSeconds });
  } catch (error) {
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
