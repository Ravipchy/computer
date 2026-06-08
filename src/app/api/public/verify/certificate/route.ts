import { NextResponse } from "next/server";
import { connectDB as dbConnect } from "@/lib/mongodb";
import { AtcStudent } from "@/models/AtcStudent";
import { StudentExam } from "@/models/StudentExam";

export async function GET(request: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const enrollment = searchParams.get("enrollment");
    const dob = searchParams.get("dob");

    if (!enrollment || !dob) {
      return NextResponse.json({ message: "Enrollment and Date of Birth are required" }, { status: 400 });
    }

    const student = await AtcStudent.findOne({ 
      enrollmentNo: enrollment.trim(), 
      dob: dob.trim() 
    });

    if (!student) {
      return NextResponse.json({ message: "Student record not found" }, { status: 404 });
    }

    // Check if result is published or offline exam is published
    const exam = await StudentExam.findOne({ 
      studentId: student._id,
      $or: [
        { status: "completed", resultDeclared: true },
        { offlineExamStatus: "published" }
      ]
    });

    if (!exam) {
      return NextResponse.json({ message: "Certificate not yet issued or exam not completed" }, { status: 404 });
    }

    const responseData = {
      studentName: student.name,
      certificateId: `CERT-${student.enrollmentNo}-${student._id.toString().slice(-4)}`.toUpperCase(),
      course: student.course,
      courseName: student.course,
      issueDate: exam.updatedAt.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      status: "Valid"
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("Certificate verification error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
