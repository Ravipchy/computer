import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { Certificate } from "@/models/Certificate";
import { Course } from "@/models/Course";
import { AtcStudent } from "@/models/Student";
import { StudentMedia } from "@/models/StudentMedia";
import { resolveAtcSignature } from "@/lib/documentAtcSignature";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("atc_token")?.value;
    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    const { searchParams } = new URL(request.url);
    const examId = searchParams.get("examId");
    if (!examId) return NextResponse.json({ message: "examId is required" }, { status: 400 });

    await connectDB();
    const cert = await Certificate.findOne({ examId, atcId: decoded.id }).populate({
      path: "studentId",
      model: AtcStudent,
      select: "name fatherName motherName photo enrollmentNo session admissionDate",
    });

    if (!cert) return NextResponse.json({ message: "Certificate not found" }, { status: 404 });

    const certData = cert.toObject() as {
      studentId?: { _id?: unknown; photo?: string } | string | null;
      durationMonths?: number;
      courseName?: string;
      [k: string]: unknown;
    };
    const studentObj =
      certData.studentId && typeof certData.studentId === "object" ? certData.studentId : null;
    if (studentObj?._id) {
      const media = (await StudentMedia.findOne({
        studentId: studentObj._id,
        fieldName: "photo",
      })
        .select("content")
        .lean()) as { content?: string } | null;
      if (media?.content) studentObj.photo = media.content;
    }

    if (!certData.durationMonths && certData.courseName) {
      const course = (await Course.findOne({ name: certData.courseName })
        .select("durationMonths")
        .lean()) as { durationMonths?: number } | null;
      if (course?.durationMonths) certData.durationMonths = course.durationMonths;
    }

    const atcSignature = await resolveAtcSignature(cert.atcId?.toString());
    return NextResponse.json({ data: certData, atcSignature });
  } catch {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
