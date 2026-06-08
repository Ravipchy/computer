import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { StudentExam } from "@/models/StudentExam";
import { assignEnrollmentNoIfPending } from "@/lib/assignStudentEnrollmentNo";
import { assignRegistrationNoIfPending } from "@/lib/assignStudentRegistrationNo";
import { buildExamDateTimeUtc } from "@/lib/examScheduleUtc";

const normalizeIsoDate = (raw: unknown): string => {
  const cleaned = String(raw ?? "").trim().replace(/[^\d-]/g, "");
  const [year = "", month = "", day = ""] = cleaned.split("-");
  return [year.slice(0, 4), month.slice(0, 2), day.slice(0, 2)]
    .filter(Boolean)
    .join("-");
};

const isValidIsoDate = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString().slice(0, 10) === value;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { examId, approvalStatus, examDate, examTime, setId, examMode, durationMinutes, admitCardReleased } = body;
    const normalizedExamDate = examDate ? normalizeIsoDate(examDate) : "";

    if (!examId || !approvalStatus) {
      return NextResponse.json({ message: "examId and approvalStatus are required." }, { status: 400 });
    }

    await connectDB();

    const updateData: Record<string, unknown> = { approvalStatus };
    if (examDate) {
      if (!isValidIsoDate(normalizedExamDate)) {
        return NextResponse.json({ message: "Exam date must be a valid date in YYYY-MM-DD format." }, { status: 400 });
      }
      updateData.examDate = normalizedExamDate;
    }
    if (examTime) updateData.examTime = examTime;
    if (examMode) updateData.examMode = examMode;
    if (setId) updateData.setId = setId;
    if (durationMinutes !== undefined) updateData.durationMinutes = Number(durationMinutes);
    if (admitCardReleased !== undefined) updateData.admitCardReleased = admitCardReleased;
    if (examDate && examTime) {
      const dt = buildExamDateTimeUtc(normalizedExamDate, String(examTime));
      if (dt) {
        updateData.examDateTime = dt;
      }
    }

    const updatedExam = await StudentExam.findByIdAndUpdate(
      examId,
      { $set: updateData },
      { new: true }
    );

    if (!updatedExam) {
      return NextResponse.json({ message: "Exam record not found." }, { status: 404 });
    }

    // NEW: If offline exam is approved, update student status to 'appeared' so ATC can enter result
    if (approvalStatus === "approved" && updatedExam.examMode === "offline") {
      const { AtcStudent } = await import("@/models/Student");
      await AtcStudent.findByIdAndUpdate(updatedExam.studentId, {
        $set: { offlineExamStatus: "appeared" }
      });
    }

    if (updatedExam.approvalStatus === "approved" && updatedExam.admitCardReleased) {
      try {
        await assignEnrollmentNoIfPending(updatedExam.studentId);
        await assignRegistrationNoIfPending(updatedExam.studentId);
      } catch (e) {
        console.error("[admin/exams/approve] assign enrollment/registration", e);
      }
    }

    return NextResponse.json({ message: "Exam request updated successfully.", exam: updatedExam });
  } catch (error) {
    console.error("[admin/exams/approve POST]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
