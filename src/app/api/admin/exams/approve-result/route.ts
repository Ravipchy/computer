import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { StudentExam, type IExamSubjectMark } from "@/models/StudentExam";
import type { ISubjectMark } from "@/models/Marksheet";
import { AtcStudent } from "@/models/Student";
import { Marksheet } from "@/models/Marksheet";
import { Certificate } from "@/models/Certificate";
import { AtcUser } from "@/models/AtcUser";
import { Course } from "@/models/Course";
import {
  formatCertificateFromLabel,
  gradeFromPercentage,
  type CourseSubjectInput,
} from "@/lib/examDocumentSplit";
import { getMarksheetGradeBands } from "@/lib/marksheetGradeScale";

export async function POST(request: Request) {
  try {
    const {
      examId,
      status,
      marksheet = false,
      certificate = false,
      issueDate: issueDateRaw,
    } = await request.json();

    // Single source of truth: the date picked by admin in the approval modal is
    // used as Marksheet.issueDate AND Certificate.issueDate. Falls back to now.
    let issueDate = new Date();
    if (issueDateRaw) {
      const parsed = new Date(issueDateRaw);
      if (!Number.isNaN(parsed.getTime())) issueDate = parsed;
    }

    await connectDB();

    const exam = await StudentExam.findById(examId);
    if (!exam) return NextResponse.json({ message: "Exam not found" }, { status: 404 });

    const student = await AtcStudent.findById(exam.studentId);

    type CourseLite = {
      name?: string;
      shortName?: string;
      hasMarksheet?: boolean;
      hasCertificate?: boolean;
      durationMonths?: number;
      subjects?: CourseSubjectInput[];
    };
    const courseSettings = { hasMarksheet: true, hasCertificate: true };
    let courseDoc: CourseLite | null = null;
    if (student) {
      const ors: Record<string, unknown>[] = [];
      if (student.courseId) ors.push({ _id: student.courseId });
      if (student.course) {
        const safe = String(student.course).trim();
        const escaped = safe.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        ors.push({ name: { $regex: `^${escaped}$`, $options: "i" } });
        ors.push({ shortName: { $regex: `^${escaped}$`, $options: "i" } });
      }
      if (ors.length) {
        const c = (await Course.findOne({ $or: ors }).lean()) as CourseLite | null;
        if (c) {
          courseDoc = c;
          courseSettings.hasMarksheet = Boolean(c.hasMarksheet);
          courseSettings.hasCertificate = Boolean(c.hasCertificate);
        }
      }
    }

    if (status === "published") {
      // Only block offline exams that clearly have no result workflow yet.
      // Allow review_pending, appeared, legacy rows with missing status, etc.
      if (exam.examMode === "offline" && exam.offlineExamStatus === "not_appeared") {
        return NextResponse.json({ message: "Offline result is not in admin review queue." }, { status: 400 });
      }
      const hasSubmittedMarks =
        (typeof exam.totalScore === "number" && exam.totalScore > 0) ||
        (Array.isArray(exam.subjectMarks) && exam.subjectMarks.length > 0);
      if (exam.examMode === "online") {
        const ready =
          exam.status === "completed" ||
          exam.offlineExamStatus === "review_pending" ||
          hasSubmittedMarks;
        if (!ready) {
          return NextResponse.json({ message: "Online result is not ready for admin approval." }, { status: 400 });
        }
      }

      const releaseMarksheet = Boolean(marksheet) && courseSettings.hasMarksheet;
      const releaseCertificate = Boolean(certificate) && courseSettings.hasCertificate;

      // Marksheet rows = exactly what ATC saved (exam.subjectMarks), never
      // buildMarksheetFromCourse. If the exam doc is missing the array (rare),
      // fall back to a draft Marksheet row created on ATC submit (offline-result upsert).
      type MarkRow = {
        subjectName: string;
        marksObtained: number;
        totalMarks: number;
        internalObtained: number;
        internalMax: number;
        externalObtained: number;
        externalMax: number;
      };

      let markRows: MarkRow[] = Array.isArray(exam.subjectMarks)
        ? exam.subjectMarks.map((row: IExamSubjectMark, idx: number) => {
            const internalObtained = Number(row.internalObtained ?? 0) || 0;
            const internalMax = Number(row.internalMax ?? 0) || 0;
            const externalObtained = Number(row.externalObtained ?? 0) || 0;
            const externalMax = Number(row.externalMax ?? 0) || 0;
            const mo = Number(row.marksObtained ?? NaN);
            const tm = Number(row.totalMarks ?? NaN);
            const sumO = internalObtained + externalObtained;
            const sumM = internalMax + externalMax;
            const subjectName =
              String(row.subjectName ?? "").trim() || `Subject ${idx + 1}`;
            return {
              subjectName,
              marksObtained: Number.isFinite(mo) ? mo : sumO,
              totalMarks: Number.isFinite(tm) ? tm : sumM,
              internalObtained,
              internalMax,
              externalObtained,
              externalMax,
            };
          })
        : [];

      if (releaseMarksheet && markRows.length === 0) {
        const draft = await Marksheet.findOne({ examId: exam._id }).lean();
        const subj = draft?.subjects;
        if (Array.isArray(subj) && subj.length > 0) {
          markRows = subj.map((s: ISubjectMark, idx: number) => {
            const internalObtained = Number(s.internalObtained ?? 0) || 0;
            const internalMax = Number(s.internalMax ?? 0) || 0;
            const externalObtained = Number(s.externalObtained ?? 0) || 0;
            const externalMax = Number(s.externalMax ?? 0) || 0;
            const mo = Number(s.marksObtained ?? NaN);
            const tm = Number(s.totalMarks ?? NaN);
            const marksObtained = Number.isFinite(mo)
              ? mo
              : internalObtained + externalObtained;
            const totalMarks = Number.isFinite(tm)
              ? tm
              : internalMax + externalMax;
            return {
              subjectName:
                String(s.subjectName ?? "").trim() || `Subject ${idx + 1}`,
              marksObtained,
              totalMarks,
              internalObtained,
              internalMax,
              externalObtained,
              externalMax,
            };
          });
        }
      }

      const examMax = exam.maxScore && exam.maxScore > 0 ? exam.maxScore : 100;
      const examObt = Math.max(0, exam.totalScore || 0);

      // No subject-wise rows: use one aggregate row so marksheet + approval still work.
      // Never inject this if exam already had subjectMarks (those must print as ATC typed).
      const hadExamSubjectMarks =
        Array.isArray(exam.subjectMarks) && exam.subjectMarks.length > 0;
      if (releaseMarksheet && markRows.length === 0 && !hadExamSubjectMarks) {
        markRows = [
          {
            subjectName: "Course",
            marksObtained: examObt,
            totalMarks: examMax > 0 ? examMax : Math.max(1, examObt || 1),
            internalObtained: 0,
            internalMax: 0,
            externalObtained: 0,
            externalMax: 0,
          },
        ];
      }

      let finalTotalObtained: number;
      let finalTotalMax: number;
      let finalPercentage: number;

      if (markRows.length > 0) {
        finalTotalObtained = markRows.reduce((s, r) => s + r.marksObtained, 0);
        finalTotalMax = markRows.reduce((s, r) => s + r.totalMarks, 0);
        finalPercentage =
          finalTotalMax > 0
            ? Math.round((finalTotalObtained / finalTotalMax) * 10000) / 100
            : 0;
      } else {
        finalTotalObtained = examObt;
        finalTotalMax = examMax;
        finalPercentage =
          finalTotalMax > 0
            ? Math.round((finalTotalObtained / finalTotalMax) * 10000) / 100
            : 0;
      }

      const gradeBands = await getMarksheetGradeBands();
      const gradeLetter = exam.grade || gradeFromPercentage(finalPercentage, gradeBands);

      exam.offlineExamStatus = "published";
      exam.status = "completed";
      exam.resultDeclared = true;
      exam.marksheetReleased = releaseMarksheet;
      exam.certificateReleased = releaseCertificate;
      await exam.save();

      if (student) {
        student.offlineExamStatus = "published";
        await student.save();
      }

      const atc = await AtcUser.findById(exam.atcId);
      const courseTitle =
        (courseDoc?.name && String(courseDoc.name).trim()) || student?.course?.trim() || "N/A";

      if (releaseMarksheet) {
        await Marksheet.findOneAndUpdate(
          { examId: exam._id },
          {
            studentId: exam.studentId,
            atcId: exam.atcId,
            examId: exam._id,
            enrollmentNo: student?.enrollmentNo || "N/A",
            rollNo: student?.classRollNo || "N/A",
            courseName: courseTitle,
            subjects: markRows,
            totalObtained: finalTotalObtained,
            totalMax: finalTotalMax,
            percentage: finalPercentage,
            grade: gradeLetter,
            result: (exam.offlineExamResult === "Fail" || finalPercentage < 33) ? "Fail" : "Pass",
            issueDate,
            isApproved: true,
          },
          { upsert: true },
        );
      }

      if (releaseCertificate) {
        const session = exam.session || student?.session || "2024-25";
        const count = await Certificate.countDocuments();
        const serialNo = `CERT-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, "0")}`;
        const fromLabel = formatCertificateFromLabel(student?.admissionDate);

        await Certificate.findOneAndUpdate(
          { examId: exam._id },
          {
            studentId: exam.studentId,
            atcId: exam.atcId,
            examId: exam._id,
            enrollmentNo: student?.enrollmentNo || "N/A",
            serialNo,
            issueDate,
            session,
            courseName: courseTitle,
            centerCode: atc?.tpCode || "N/A",
            centerName: atc?.trainingPartnerName || "N/A",
            grade: gradeLetter,
            ...(fromLabel ? { fromLabel } : {}),
            ...(typeof courseDoc?.durationMonths === "number" && courseDoc.durationMonths > 0
              ? { durationMonths: courseDoc.durationMonths }
              : {}),
            isApproved: true,
          },
          { upsert: true },
        );
      }
    } else {
      exam.offlineExamStatus = "appeared";
      await exam.save();

      await AtcStudent.findByIdAndUpdate(exam.studentId, {
        offlineExamStatus: "appeared",
      });
    }

    return NextResponse.json({ message: "Action completed successfully" });
  } catch (error: unknown) {
    console.error("[api/admin/exams/approve-result] Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
