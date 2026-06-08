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

    const exam = await StudentExam.findOne({ 
      studentId: student._id,
      $or: [
        { status: "completed", resultDeclared: true },
        { offlineExamStatus: "published" }
      ]
    });

    if (!exam) {
      return NextResponse.json({ message: "Marksheet not yet available or result not declared" }, { status: 404 });
    }

    // Mock subjects if it was an online exam (we can expand this later)
    let subjects = [];
    if (exam.examMode === 'online') {
      subjects = [
        { name: "Theory", marks: Math.round(exam.totalScore * 0.7), maxMarks: 70 },
        { name: "Practical", marks: Math.round(exam.totalScore * 0.3), maxMarks: 30 }
      ];
    } else {
      // For offline, we might just have total marks stored in Student record or exam record
      subjects = [
        { name: "Aggregate Marks", marks: student.offlineExamMarks || exam.totalScore, maxMarks: exam.maxScore || 100 }
      ];
    }

    const totalMarks = exam.totalScore || parseInt(student.offlineExamMarks as string || "0");
    const maxTotalMarks = exam.maxScore || 100;
    const percentage = (totalMarks / maxTotalMarks) * 100;

    let grade = "F";
    if (percentage >= 80) grade = "A+";
    else if (percentage >= 70) grade = "A";
    else if (percentage >= 60) grade = "B";
    else if (percentage >= 50) grade = "C";
    else if (percentage >= 40) grade = "D";

    const responseData = {
      studentName: student.name,
      enrollmentNumber: student.enrollmentNo,
      subjects: subjects,
      totalMarks: totalMarks,
      maxTotalMarks: maxTotalMarks,
      result: percentage >= 40 ? "Pass" : "Fail",
      grade: grade,
      examYear: new Date(exam.updatedAt).getFullYear().toString()
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("Marksheet verification error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
