import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { AtcStudent } from "@/models/Student";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("student_token")?.value;

    if (!token) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; role: string };
    if (decoded.role !== "student") return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const student = await AtcStudent.findById(decoded.id).select("-password").lean();
    if (!student) return NextResponse.json({ message: "Student not found" }, { status: 404 });

    // Merge media
    const { StudentMedia } = await import("@/models/StudentMedia");
    const media = await StudentMedia.find({ studentId: student._id }).lean();
    const mediaMap: any = {};
    media.forEach((m: any) => { mediaMap[m.fieldName] = m.content; });
    const studentWithMedia = { 
      ...student, 
      ...mediaMap,
      totalFee: student.totalFee || 0,
      paidAmount: student.paidAmount || 0,
      duesAmount: student.duesAmount || 0
    };

    return NextResponse.json({ student: studentWithMedia });
  } catch (error) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
}
