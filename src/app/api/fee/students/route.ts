import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { AtcStudent } from "@/models/Student";
import { getAuthUser } from "@/utils/auth";

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user || (user.role !== "admin" && user.role !== "atc")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const { searchParams } = new URL(request.url);
  const regNo = searchParams.get("regNo");
  const course = searchParams.get("course");
  const status = searchParams.get("status");

  try {
    const query: any = {};
    if (user.role === "atc") {
      if (!user.tpCode) {
        return NextResponse.json({ message: "Invalid session: TP Code missing. Please re-login." }, { status: 403 });
      }
      query.tpCode = user.tpCode;
    }
    if (regNo) {
      query.enrollmentNo = { $regex: regNo, $options: "i" };
    }
    if (course) {
      query.course = course;
    }
    if (status) {
      query.status = status;
    }

    const students = await AtcStudent.find(query)
      .select("enrollmentNo name fatherName mobile email course status totalFee paidAmount duesAmount tpCode dob admissionFees")
      .sort({ createdAt: -1 })
      .lean();

    const { FeeTransaction } = await import("@/models/FeeTransaction");
    const studentsWithRealBalances = await Promise.all(students.map(async (s: any) => {
      const txs = await FeeTransaction.find({ studentId: s._id }).lean();
      const totalPaid = txs.reduce((acc: number, t: any) => acc + (t.type === 'collect' ? t.amount : -t.amount), 0);
      const totalAdmission = s.totalFee || Number(s.admissionFees) || 0;
      return {
        ...s,
        totalFee: totalAdmission,
        paidAmount: totalPaid,
        duesAmount: totalAdmission - totalPaid
      };
    }));

    return NextResponse.json({ students: studentsWithRealBalances });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
