import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { StudentExam } from "@/models/StudentExam";
import { AtcStudent } from "@/models/Student";
import { AtcUser } from "@/models/AtcUser";

export async function GET() {
  try {
    await connectDB();
    
    const results = await StudentExam.find({
      offlineExamStatus: "review_pending",
    })
    .populate({
      path: "studentId",
      model: AtcStudent,
      select: "name enrollmentNo photo course fatherName"
    })
    .populate({
      path: "atcId",
      model: AtcUser,
      select: "trainingPartnerName tpCode centerName centerCode"
    })
    .sort({ createdAt: -1 });

    return NextResponse.json(results);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
