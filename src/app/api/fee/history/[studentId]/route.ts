import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { FeeTransaction } from "@/models/FeeTransaction";
import { AtcStudent } from "@/models/Student";
import { getAuthUser } from "@/utils/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { studentId } = await params;

  // Students can only view their own history
  if (user.role === "student" && user.id !== studentId) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  // ATCs can only view their own students' history
  if (user.role === "atc") {
    await connectDB();
    const student = await AtcStudent.findOne({ 
      _id: studentId, 
      $or: [{ atcId: user.id }, { tpCode: user.tpCode }] 
    });
    if (!student) {
      return NextResponse.json({ message: "Forbidden: You don't have access to this student's records." }, { status: 403 });
    }
  }

  await connectDB();

  try {
    const transactions = await FeeTransaction.find({ studentId })
      .sort({ date: -1 })
      .lean();

    const student = await AtcStudent.findById(studentId)
      .select("name enrollmentNo course totalFee paidAmount duesAmount")
      .lean();

    return NextResponse.json({ transactions, student });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
