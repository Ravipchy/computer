import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Marksheet } from "@/models/Marksheet";
import { StudentExam } from "@/models/StudentExam";
import { AtcStudent } from "@/models/Student";
import { StudentMedia } from "@/models/StudentMedia";
import { learningCenterLineForMarksheet } from "@/lib/marksheetLearningCenter";
import { resolveAtcSignature } from "@/lib/documentAtcSignature";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get("examId");

    const cookieStore = await cookies();
    const token = cookieStore.get("student_token")?.value;
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    await connectDB();
    const exam = await StudentExam.findOne({ _id: examId, studentId: decoded.id }).select("resultDeclared marksheetReleased");
    if (!exam || !exam.resultDeclared || !exam.marksheetReleased) {
      return NextResponse.json({ message: "Marksheet not released yet." }, { status: 403 });
    }

    const ms = await Marksheet.findOne({ examId, studentId: decoded.id })
      .populate({
        path: "studentId",
        model: AtcStudent,
        select: "name fatherName motherName photo enrollmentNo registrationNo session dob classRollNo",
      });

    if (!ms) return NextResponse.json({ message: "Marksheet not found" }, { status: 404 });

    const data = ms.toObject() as {
      studentId?: { _id?: unknown; photo?: string } | string | null;
      [k: string]: unknown;
    };
    const studentObj =
      data.studentId && typeof data.studentId === "object" ? data.studentId : null;
    if (studentObj?._id) {
      const media = (await StudentMedia.findOne({
        studentId: studentObj._id,
        fieldName: "photo",
      })
        .select("content")
        .lean()) as { content?: string } | null;
      if (media?.content) studentObj.photo = media.content;
    }

    const learningCenterLine = await learningCenterLineForMarksheet(ms.atcId);
    const atcSignature = await resolveAtcSignature(ms.atcId?.toString());

    return NextResponse.json({ data, learningCenterLine, atcSignature });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
