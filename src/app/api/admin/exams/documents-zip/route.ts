import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import archiver from "archiver";
import { PassThrough } from "stream";
import { jsPDF } from "jspdf";
import { connectDB } from "@/lib/mongodb";
import { StudentExam } from "@/models/StudentExam";
import { Marksheet } from "@/models/Marksheet";
import { Certificate } from "@/models/Certificate";
import { AtcStudent } from "@/models/Student";

export const runtime = "nodejs";

const JWT_SECRET = process.env.JWT_SECRET as string;

type DocType =
  | "admitCard"
  | "examCopy"
  | "certificate"
  | "marksheet"
  | "certificatePrint"
  | "marksheetPrint";

const DOC_SUFFIX: Record<DocType, string> = {
  admitCard: "Admit Card.pdf",
  examCopy: "ExamCopy.pdf",
  certificate: "Certificate.pdf",
  marksheet: "Marksheet.pdf",
  certificatePrint: "Certificate Print.pdf",
  marksheetPrint: "Marksheet Print.pdf",
};

const ALLOWED_DOCS = new Set<DocType>(Object.keys(DOC_SUFFIX) as DocType[]);

async function verifyAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { role?: string };
    return decoded.role === "admin" ? decoded : null;
  } catch {
    return null;
  }
}

function toSafeRegNo(regNo?: string) {
  const raw = (regNo || "UNKNOWN").trim();
  return raw.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function pdfBufferFromDoc(
  title: string,
  lines: string[],
  withBackground: boolean,
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  if (withBackground) {
    doc.setFillColor(245, 248, 255);
    doc.rect(0, 0, 595, 842, "F");
    doc.setDrawColor(49, 46, 129);
    doc.setLineWidth(2);
    doc.rect(22, 22, 551, 798);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 40, 56);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  let y = 90;
  for (const line of lines) {
    doc.text(line, 40, y);
    y += 18;
  }

  const buf = doc.output("arraybuffer");
  return Buffer.from(buf);
}

function parseDataUrl(data?: string | null) {
  if (!data || typeof data !== "string") return null;
  const match = data.match(/^data:(.+?);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
}

function buildDocumentBuffer(
  docType: DocType,
  exam: Record<string, unknown>,
  student: { name?: string; enrollmentNo?: string; course?: string },
  marksheet?: Record<string, unknown>,
  certificate?: Record<string, unknown>,
) {
  if (docType === "examCopy") {
    const parsed = parseDataUrl(exam.offlineExamCopy as string | undefined);
    if (parsed?.mime?.includes("pdf")) return parsed.buffer;
  }

  if (docType === "admitCard") {
    return pdfBufferFromDoc(
      "Admit Card",
      [
        `Student: ${student?.name || "N/A"}`,
        `Enrollment number: ${student?.enrollmentNo || "N/A"}`,
        `Course: ${student?.course || "N/A"}`,
        `Exam Date: ${exam.examDate ? new Date(exam.examDate as string).toLocaleDateString("en-GB") : "N/A"}`,
        `Exam Time: ${(exam.examTime as string) || "N/A"}`,
        `Duration (min): ${(exam.durationMinutes as number) || 60}`,
      ],
      true,
    );
  }

  if (docType === "certificate" || docType === "certificatePrint") {
    const isPrint = docType === "certificatePrint";
    return pdfBufferFromDoc(
      isPrint ? "Certificate (Print Version)" : "Certificate",
      [
        `Student: ${student?.name || "N/A"}`,
        `Enrollment number: ${student?.enrollmentNo || "N/A"}`,
        `Course: ${(certificate?.courseName as string) || student?.course || "N/A"}`,
        `Session: ${(certificate?.session as string) || "N/A"}`,
        `Grade: ${(certificate?.grade as string) || "N/A"}`,
        `Issue Date: ${certificate?.issueDate ? new Date(certificate.issueDate as string).toLocaleDateString("en-GB") : "N/A"}`,
      ],
      !isPrint,
    );
  }

  if (docType === "marksheet" || docType === "marksheetPrint") {
    const isPrint = docType === "marksheetPrint";
    return pdfBufferFromDoc(
      isPrint ? "Marksheet (Print Version)" : "Marksheet",
      [
        `Student: ${student?.name || "N/A"}`,
        `Enrollment number: ${student?.enrollmentNo || "N/A"}`,
        `Enrollment No: ${(marksheet?.enrollmentNo as string) || "N/A"}`,
        `Course: ${(marksheet?.courseName as string) || student?.course || "N/A"}`,
        `Total: ${(marksheet?.totalObtained as number) ?? 0}/${(marksheet?.totalMax as number) ?? 0}`,
        `Grade: ${(marksheet?.grade as string) || "N/A"} | Result: ${(marksheet?.result as string) || "N/A"}`,
      ],
      !isPrint,
    );
  }

  return pdfBufferFromDoc("Document Not Available", [`Document type: ${docType}`], false);
}

export async function POST(request: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await request.json() as { examIds?: string[]; docTypes?: DocType[]; forceZip?: boolean };
    const examIds = Array.isArray(body.examIds) ? body.examIds.filter(Boolean) : [];
    const docTypes = Array.isArray(body.docTypes)
      ? body.docTypes.filter((d): d is DocType => ALLOWED_DOCS.has(d as DocType))
      : [];

    if (examIds.length === 0) {
      return NextResponse.json({ message: "examIds are required" }, { status: 400 });
    }
    if (docTypes.length === 0) {
      return NextResponse.json({ message: "docTypes are required" }, { status: 400 });
    }

    await connectDB();

    const exams = await StudentExam.find({ _id: { $in: examIds } })
      .populate({ path: "studentId", model: AtcStudent, select: "name enrollmentNo fatherName mobile course" })
      .lean();
    if (!exams.length) {
      return NextResponse.json({ message: "No exams found." }, { status: 404 });
    }

    const examIdList = exams.map((e) => String(e._id));
    const marksheets = await Marksheet.find({ examId: { $in: examIdList } }).lean();
    const certificates = await Certificate.find({ examId: { $in: examIdList } }).lean();
    const marksheetByExamId = new Map(marksheets.map((m) => [String(m.examId), m]));
    const certificateByExamId = new Map(certificates.map((c) => [String(c.examId), c]));

    if (examIds.length === 1 && docTypes.length === 1 && !body.forceZip) {
      const exam = exams[0] as unknown as Record<string, unknown>;
      const student = exam.studentId as { name?: string; enrollmentNo?: string; course?: string };
      const regNo = toSafeRegNo(student?.enrollmentNo);
      const examId = String(exam._id);
      const singleDocType = docTypes[0];
      const marksheet = marksheetByExamId.get(examId) as unknown as Record<string, unknown> | undefined;
      const certificate = certificateByExamId.get(examId) as unknown as Record<string, unknown> | undefined;
      const fileName = `${regNo}_${DOC_SUFFIX[singleDocType]}`;
      const fileBuffer = buildDocumentBuffer(singleDocType, exam, student, marksheet, certificate);

      return new Response(fileBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      });
    }

    const stream = new PassThrough();
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(stream);

    for (const examRaw of exams) {
      const exam = examRaw as unknown as Record<string, unknown>;
      const student = exam.studentId as { name?: string; enrollmentNo?: string; course?: string };
      const regNo = toSafeRegNo(student?.enrollmentNo);
      const examId = String(exam._id);
      const marksheet = marksheetByExamId.get(examId) as unknown as Record<string, unknown> | undefined;
      const certificate = certificateByExamId.get(examId) as unknown as Record<string, unknown> | undefined;

      for (const docType of docTypes) {
        const filename = `${regNo}_${DOC_SUFFIX[docType]}`;
        const fileBuffer = buildDocumentBuffer(docType, exam, student, marksheet, certificate);
        archive.append(fileBuffer, { name: filename });
      }
    }

    await archive.finalize();

    return new Response(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="exam-documents-${Date.now()}.zip"`,
      },
    });
  } catch (error) {
    console.error("[admin/exams/documents-zip POST]", error);
    return NextResponse.json({ message: "Failed to generate ZIP." }, { status: 500 });
  }
}

