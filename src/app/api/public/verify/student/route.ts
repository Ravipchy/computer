import { NextResponse } from "next/server";
import { connectDB as dbConnect } from "@/lib/mongodb";
import { AtcStudent } from "@/models/AtcStudent";
import { AtcUser } from "@/models/AtcUser";

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
    }).populate("atcId");

    if (!student) {
      return NextResponse.json({ message: "Student not found with provided credentials" }, { status: 404 });
    }

    // Populate ATC info if not already rich
    let atcName = "Unknown";
    let atcCode = student.tpCode || "N/A";

    if (student.atcId && typeof student.atcId === 'object') {
      atcName = (student.atcId as any).trainingPartnerName || "Unknown";
    }

    const responseData = {
      studentName: student.name,
      enrollmentNumber: student.enrollmentNo,
      admissionDate: student.admissionDate,
      admissionCenter: atcName,
      atcCode: atcCode,
      atcName: atcName,
      courseName: student.course,
      status: student.status === 'active' ? 'Active' : 
              student.status === 'pending' ? 'Pending for Approval' : 
              student.status === 'rejected' ? 'Rejected' : student.status
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("Student verification error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
