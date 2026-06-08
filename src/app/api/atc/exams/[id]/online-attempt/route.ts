import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { StudentExam, type IStudentExamAnswer } from "@/models/StudentExam";
import { ExamQuestion } from "@/models/ExamQuestion";
import { verifyAtc, verifyAdmin } from "@/lib/auth";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const atc = await verifyAtc(request);
    const admin = atc ? null : await verifyAdmin(request);
    if (!atc && !admin) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id: examId } = await params;
    await connectDB();

    const exam = await StudentExam.findById(examId).lean();
    if (!exam) {
      return NextResponse.json({ message: "Exam not found" }, { status: 404 });
    }

    if (atc && String(exam.atcId) !== String(atc.id)) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    if (exam.examMode !== "online") {
      return NextResponse.json({ message: "This exam is not an online attempt." }, { status: 400 });
    }

    const answers = Array.isArray(exam.answers) ? (exam.answers as IStudentExamAnswer[]) : [];
    if (answers.length === 0) {
      return NextResponse.json({
        examId,
        studentId: exam.studentId,
        totalScore: exam.totalScore ?? 0,
        maxScore: exam.maxScore ?? 0,
        submittedAt: exam.submittedAt ?? null,
        items: [] as unknown[],
      });
    }

    const qIds = answers.map((a) => a.questionId);
    const questions = await ExamQuestion.find({ _id: { $in: qIds } }).lean();
    const byId = new Map(questions.map((q) => [String(q._id), q]));

    const items = answers.map((a: IStudentExamAnswer, i: number) => {
      const q = byId.get(String(a.questionId));
      return {
        order: i + 1,
        questionText: q?.questionText ?? "(Question not found or removed)",
        options: q?.options ?? [],
        correctOption: q?.correctOption ?? "",
        selectedOption: a.selectedOption,
        correct: a.correct,
        marksEarned: a.marksEarned,
        marks: q?.marks ?? 0,
      };
    });

    return NextResponse.json({
      examId,
      studentId: exam.studentId,
      totalScore: exam.totalScore ?? 0,
      maxScore: exam.maxScore ?? 0,
      submittedAt: exam.submittedAt ?? null,
      items,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
