import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { AtcStudent } from "@/models/Student";
import { StudentExam } from "@/models/StudentExam";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const regNo = searchParams.get("regNo");

    if (!regNo) {
      return NextResponse.json({ message: "Enrollment number is required." }, { status: 400 });
    }

    await connectDB();

    const student = await AtcStudent.findOne({
      $or: [{ enrollmentNo: regNo }, { registrationNo: regNo }],
    })
      .select("name enrollmentNo registrationNo course createdAt photo")
      .lean();

    if (!student) {
      return NextResponse.json({ message: "No student found with this registration number." }, { status: 404 });
    }

    // Find latest exam status
    const latestExam = await StudentExam.findOne({ studentId: student._id })
      .sort({ createdAt: -1 })
      .select("approvalStatus status resultDeclared totalScore")
      .lean();

    let examStatus = "Admitted";
    if (latestExam) {
      if (latestExam.status === "completed") {
        examStatus = "Exam Completed";
      } else if (latestExam.approvalStatus === "approved") {
        examStatus = "Exam Scheduled";
      } else if (latestExam.approvalStatus === "pending") {
        examStatus = "Exam Request Pending";
      }
    }

    return NextResponse.json({
      student,
      examStatus,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error("[public/student-status GET]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
