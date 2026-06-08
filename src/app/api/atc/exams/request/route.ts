import { NextResponse } from "next/server";
import { connectDB as dbConnect } from "@/lib/mongodb";
import { StudentExam } from "@/models/StudentExam";
import { AtcStudent } from "@/models/Student";
import { lifecycleStatusForExam } from "@/lib/exam-schedule";
import { verifyAtc } from "@/lib/auth";
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
    const atc = await verifyAtc(request);
    if (!atc) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    
    const { studentId, examDate, examTime, durationMinutes, setId, examMode } = await request.json();
    const normalizedExamDate = normalizeIsoDate(examDate);

    if (!studentId || !normalizedExamDate || !examTime || !durationMinutes) {
      return NextResponse.json(
        { message: "studentId, examDate, examTime, and durationMinutes are required." },
        { status: 400 },
      );
    }
    if (!isValidIsoDate(normalizedExamDate)) {
      return NextResponse.json({ message: "Exam date must be a valid date in YYYY-MM-DD format." }, { status: 400 });
    }

    await dbConnect();

    // Enforce one request per student in last 24 hours
    const now = new Date();
    const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentRequest = await StudentExam.findOne({
      studentId,
      createdAt: { $gte: windowStart },
    });

    if (recentRequest) {
      return NextResponse.json(
        { message: "Only one exam request per student is allowed in a day." },
        { status: 400 },
      );
    }

    const student = await AtcStudent.findById(studentId).lean();
    if (!student) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 });
    }
    if (String(student.atcId) !== String(atc.id)) {
      return NextResponse.json({ message: "Unauthorized student mapping." }, { status: 403 });
    }

    const mode = String(examMode || student.examMode || "online").toLowerCase();
    if (mode !== "online" && mode !== "offline") {
      return NextResponse.json({ message: "Student exam mode is invalid." }, { status: 400 });
    }

    const dateTime = buildExamDateTimeUtc(normalizedExamDate, examTime);
    if (!dateTime) {
      return NextResponse.json({ message: "Invalid exam date/time." }, { status: 400 });
    }

    const duration = Number(durationMinutes);
    if (!Number.isFinite(duration) || duration < 1 || duration > 600) {
      return NextResponse.json({ message: "Duration must be between 1 and 600 minutes." }, { status: 400 });
    }

    if (mode === "online" && !setId) {
      return NextResponse.json({ message: "Question set is required for online exam." }, { status: 400 });
    }

    const newExam = new StudentExam({
      studentId,
      atcId: atc.id,
      examMode: mode,
      examDate: normalizedExamDate,
      examTime,
      examDateTime: dateTime,
      durationMinutes: duration,
      setId: mode === "online" ? setId : undefined,
      approvalStatus: "pending",
      status: "pending",
      lifecycleStatus: lifecycleStatusForExam({
        examDateTime: dateTime,
        durationMinutes: duration,
        status: "pending",
      }),
    });

    await newExam.save();

    return NextResponse.json({ message: "Exam request submitted successfully", exam: newExam });
  } catch (error: unknown) {
    console.error("Exam request error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
