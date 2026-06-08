import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { StudentExam } from "@/models/StudentExam";
import { verifyAtc } from "@/lib/auth";
import { lifecycleStatusForExam } from "@/lib/exam-schedule";
import { buildExamDateTimeUtc } from "@/lib/examScheduleUtc";

export async function POST(request: Request) {
  try {
    const atc = await verifyAtc(request);
    if (!atc) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { examId, examDate, examTime, setId, durationMinutes } = body;

    if (!examId) {
      return NextResponse.json({ message: "examId is required." }, { status: 400 });
    }

    await connectDB();

    const updateData: Record<string, unknown> = {};
    if (examDate) updateData.examDate = new Date(examDate);
    if (examTime) updateData.examTime = examTime;
    if (durationMinutes) updateData.durationMinutes = Number(durationMinutes);
    if (setId) updateData.setId = setId;
    if (examDate && examTime) {
      const dt = buildExamDateTimeUtc(examDate, String(examTime));
      if (dt) {
        updateData.examDateTime = dt;
      }
    }

    const updatedExam = await StudentExam.findOneAndUpdate(
      { _id: examId, atcId: atc.id, status: { $ne: "completed" } },
      { $set: updateData, $setOnInsert: {} },
      { new: true }
    );

    if (!updatedExam) {
      return NextResponse.json({ message: "Exam record not found." }, { status: 404 });
    }
    updatedExam.lifecycleStatus = lifecycleStatusForExam(updatedExam);
    await updatedExam.save();

    return NextResponse.json({ message: "Exam schedule proposed successfully.", exam: updatedExam });
  } catch (error) {
    console.error("[atc/exams/update POST]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
