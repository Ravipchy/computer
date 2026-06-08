import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { StudentExam } from "@/models/StudentExam";
import { AtcStudent } from "@/models/Student";
import { Marksheet } from "@/models/Marksheet";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { getExamScheduledAtUtc } from "@/lib/examScheduleUtc";
import { gradeFromPercentage } from "@/lib/examDocumentSplit";
import { getMarksheetGradeBands } from "@/lib/marksheetGradeScale";

const JWT_SECRET = process.env.JWT_SECRET as string;
type OfflineExamStatus = "not_appeared" | "appeared" | "review_pending" | "published";
type OfflineExamResult = "Pass" | "Fail" | "Waiting";

type IncomingSubjectRow = {
  subjectName?: string;
  internalObtained?: number | string;
  internalMax?: number | string;
  externalObtained?: number | string;
  externalMax?: number | string;
};

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("atc_token")?.value;
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    
    let studentId, offlineExamStatus, totalScoreStr, offlineExamResult, examCopyFile, grade, session, examId;
    let subjectMarksRaw: string | null = null;

    if (request.headers.get("content-type")?.includes("application/json")) {
      const body = await request.json();
      studentId = body.studentId;
      offlineExamStatus = body.offlineExamStatus;
      totalScoreStr = body.totalScore;
      offlineExamResult = body.offlineExamResult;
      grade = body.grade;
      session = body.session;
      subjectMarksRaw = body.subjectMarks ? JSON.stringify(body.subjectMarks) : null;
    } else {
      const formData = await request.formData();
      examId = formData.get("examId") as string;
      offlineExamStatus = formData.get("offlineExamStatus") as string;
      totalScoreStr = formData.get("totalScore") as string;
      offlineExamResult = formData.get("offlineExamResult") as string;
      examCopyFile = formData.get("examCopy") as File | null;
      grade = formData.get("grade") as string;
      session = formData.get("session") as string;
      subjectMarksRaw = formData.get("subjectMarks") as string | null;
    }

    if (!examId && !studentId) {
      return NextResponse.json({ message: "Exam ID or Student ID is required" }, { status: 400 });
    }

    await connectDB();

    // Ensure the exam belongs to this ATC
    let exam;
    if (examId) {
      exam = await StudentExam.findOne({ _id: examId, atcId: decoded.id });
    } else if (studentId) {
      // Find the most recent offline exam for this student
      exam = await StudentExam.findOne({ studentId, atcId: decoded.id, examMode: "offline" }).sort({ createdAt: -1 });
    }

    if (!exam) {
      return NextResponse.json({ message: "Exam request not found for this student." }, { status: 404 });
    }

    if (String(exam.approvalStatus || "") !== "approved") {
      return NextResponse.json({ message: "Exam is not approved yet." }, { status: 400 });
    }

    let scheduledAt: Date | null = getExamScheduledAtUtc({
      examDate: exam.examDate,
      examTime: exam.examTime,
      examDateTime: exam.examDateTime,
    });
    const shouldBlockBySchedule =
      exam.examMode === "offline" || (exam.examMode === "online" && String(exam.status) !== "completed");
    if (shouldBlockBySchedule && scheduledAt && !Number.isNaN(scheduledAt.getTime()) && Date.now() < scheduledAt.getTime()) {
      return NextResponse.json(
        { message: "Result can only be submitted after scheduled exam date and time." },
        { status: 400 }
      );
    }

    let base64Copy = undefined;
    if (examCopyFile) {
      const isImage = examCopyFile.type.startsWith("image/");
      const isPdf = examCopyFile.type === "application/pdf";
      const sizeKb = examCopyFile.size / 1024;

      if (isImage && sizeKb > 100) {
        return NextResponse.json({ message: "Image copy is too large (max 100KB)" }, { status: 400 });
      }
      if (isPdf && sizeKb > 500) {
        return NextResponse.json({ message: "PDF copy is too large (max 500KB)" }, { status: 400 });
      }
      if (!isImage && !isPdf && sizeKb > 500) {
        return NextResponse.json({ message: "File copy is too large (max 500KB)" }, { status: 400 });
      }

      const buffer = await examCopyFile.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      base64Copy = `data:${examCopyFile.type || "application/pdf"};base64,${base64}`;
    }

    // Parse subject-wise marks if ATC entered them
    let parsedSubjectMarks: Array<{
      subjectName: string;
      internalObtained: number;
      internalMax: number;
      externalObtained: number;
      externalMax: number;
      marksObtained: number;
      totalMarks: number;
    }> = [];
    if (subjectMarksRaw) {
      try {
        const rows = JSON.parse(subjectMarksRaw) as IncomingSubjectRow[];
        if (Array.isArray(rows)) {
          parsedSubjectMarks = rows.map((row, idx) => {
            const internalObtained = Number(row.internalObtained ?? 0) || 0;
            const internalMax = Number(row.internalMax ?? 0) || 0;
            const externalObtained = Number(row.externalObtained ?? 0) || 0;
            const externalMax = Number(row.externalMax ?? 0) || 0;
            const subjectName = String(row.subjectName ?? "").trim() || `Subject ${idx + 1}`;
            return {
              subjectName,
              internalObtained,
              internalMax,
              externalObtained,
              externalMax,
              marksObtained: internalObtained + externalObtained,
              totalMarks: internalMax + externalMax,
            };
          });
        }
      } catch (err) {
        console.warn("[offline-result] Could not parse subjectMarks", err);
      }
    }

    const subjectTotalObtained = parsedSubjectMarks.reduce((s, r) => s + r.marksObtained, 0);
    const subjectTotalMax = parsedSubjectMarks.reduce((s, r) => s + r.totalMarks, 0);

    // Update StudentExam record
    const totalScore =
      parsedSubjectMarks.length > 0 ? subjectTotalObtained : parseInt(totalScoreStr) || 0;
    
    // ATC can only submit for review or as 'appeared'
    // If they were trying to 'publish', we set it to 'review_pending'
    const finalStatus = offlineExamStatus === "published" ? "review_pending" : offlineExamStatus;
    
    exam.offlineExamStatus = finalStatus as OfflineExamStatus;
    exam.offlineExamResult = offlineExamResult as OfflineExamResult;
    exam.totalScore = totalScore;
    if (parsedSubjectMarks.length > 0) {
      exam.subjectMarks = parsedSubjectMarks;
      if (subjectTotalMax > 0) exam.maxScore = subjectTotalMax;
    }
    if (base64Copy) exam.offlineExamCopy = base64Copy;
    
    // We don't set status to completed here anymore if it's pending review
    if (finalStatus === "review_pending") {
      // Keep online attempts completed; only offline stays pending for admin review.
      exam.status = exam.examMode === "online" ? "completed" : "pending";
      exam.resultDeclared = false;
      // Store additional info in exam metadata for admin approval
      if (grade) exam.grade = grade;
      if (session) exam.session = session;
    }

    await exam.save();

    // If ATC supplied subject-wise marks, immediately mirror them to the
    // existing Marksheet document (if any). This guarantees that what ATC
    // typed is exactly what the student/admin will see — no recalculation,
    // no proportional split, no fallback values.
    if (parsedSubjectMarks.length > 0) {
      const totalMaxForCalc = subjectTotalMax > 0 ? subjectTotalMax : Number(exam.maxScore) || 0;
      const totalObtForCalc = subjectTotalObtained;
      const percentage = totalMaxForCalc > 0
        ? Math.round((totalObtForCalc / totalMaxForCalc) * 10000) / 100
        : 0;
      const bands = await getMarksheetGradeBands();
      const computedGrade = grade || gradeFromPercentage(percentage, bands);
      const computedResult: "Pass" | "Fail" =
        offlineExamResult === "Fail" ? "Fail" : percentage >= 33 ? "Pass" : "Fail";

      const stu = await AtcStudent.findById(exam.studentId)
        .select("enrollmentNo classRollNo course")
        .lean();
      const enrollmentNo =
        (stu?.enrollmentNo != null && String(stu.enrollmentNo).trim()) || "N/A";
      const rollNo =
        (stu?.classRollNo != null && String(stu.classRollNo).trim()) || "N/A";
      const courseName =
        (stu?.course != null && String(stu.course).trim()) || "N/A";

      try {
        await Marksheet.findOneAndUpdate(
          { examId: exam._id },
          {
            studentId: exam.studentId,
            atcId: exam.atcId,
            examId: exam._id,
            enrollmentNo,
            rollNo,
            courseName,
            subjects: parsedSubjectMarks.map((r) => ({
              subjectName: r.subjectName,
              marksObtained: r.marksObtained,
              totalMarks: r.totalMarks,
              internalObtained: r.internalObtained,
              internalMax: r.internalMax,
              externalObtained: r.externalObtained,
              externalMax: r.externalMax,
            })),
            totalObtained: totalObtForCalc,
            totalMax: totalMaxForCalc,
            percentage,
            grade: computedGrade,
            result: computedResult,
            isApproved: false,
          },
          { upsert: true },
        );
      } catch (err) {
        console.warn("[offline-result] Marksheet sync failed", err);
      }
    }

    // Sync to AtcStudent profile
    await AtcStudent.findByIdAndUpdate(exam.studentId, {
      offlineExamStatus: finalStatus,
      offlineExamMarks: totalScoreStr,
      offlineExamResult,
      offlineExamCopy: base64Copy || exam.offlineExamCopy
    });

    return NextResponse.json({ message: "Exam result updated successfully" });
  } catch (error: unknown) {
    console.error("[api/atc/exams/offline-result] Error:", error);
    const message = error instanceof Error ? error.message : "Something went wrong";
    return NextResponse.json({ message }, { status: 500 });
  }
}
