import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { AtcStudent } from "@/models/Student";
import { Course } from "@/models/Course";
import { verifyAtc } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await verifyAtc(request);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { studentId, action, totalFee } = await request.json();
    await connectDB();

    const student = await AtcStudent.findOne({ _id: studentId, tpCode: user.tpCode, isDirectAdmission: true });
    if (!student) return NextResponse.json({ message: "Student not found" }, { status: 404 });

    if (action === "approved") {
      const parsedFee = Number(totalFee);
      if (!Number.isFinite(parsedFee) || parsedFee < 0) {
        return NextResponse.json({ message: "Please provide a valid total fee" }, { status: 400 });
      }

      student.status = "pending_admin";
      student.enrollmentNo = `PENDING-${Date.now()}-${student.aadharNo || Math.floor(Math.random() * 1000)}`;
      student.totalFee = parsedFee;
      student.admissionFees = String(parsedFee);
      student.duesAmount = parsedFee - (student.paidAmount || 0);

      // Keep courseId in sync for robust admin-side registration fee lookup.
      const normalizedCourse = String(student.course || "").trim();
      const course = await Course.findOne({
        $or: [
          { name: normalizedCourse },
          { shortName: normalizedCourse },
          { name: { $regex: `^${normalizedCourse.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
          { shortName: { $regex: `^${normalizedCourse.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } },
        ],
      }).select("_id").lean() as any;
      if (course?._id) student.courseId = course._id;
    } else if (action === "rejected") {
      student.status = "rejected";
    }

    await student.save();

    return NextResponse.json({ 
      message: `Student ${action} successfully.`,
      student 
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
