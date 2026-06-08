import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { AtcStudent } from "@/models/Student";
import { verifyAtc } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await verifyAtc(request);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const studentId = formData.get("studentId") as string;
    const status = formData.get("status") as string;
    const marks = formData.get("marks") as string;
    const resultStatus = formData.get("resultStatus") as string;
    const examCopyFile = formData.get("examCopy") as File | null;

    if (!studentId) return NextResponse.json({ message: "Student ID target required" }, { status: 400 });

    await connectDB();
    const student = await AtcStudent.findOne({ _id: studentId, atcId: user.id });
    if (!student) return NextResponse.json({ message: "Student not found" }, { status: 404 });

    student.offlineExamStatus = status as any;
    student.offlineExamMarks = marks;
    student.offlineExamResult = resultStatus as any;

    if (examCopyFile && examCopyFile.size > 0) {
      const arrayBuffer = await examCopyFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      student.offlineExamCopy = `data:application/pdf;base64,${buffer.toString("base64")}`;
    }

    await student.save();

    return NextResponse.json({ message: "Offline exam record updated", student });
  } catch (error: any) {
    console.error("[offline-exam error]", error);
    return NextResponse.json({ message: error.message || "Failed to update record" }, { status: 500 });
  }
}
