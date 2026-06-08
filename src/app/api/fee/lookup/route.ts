import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { AtcStudent } from "@/models/Student";
import { getAuthUser } from "@/utils/auth";

export async function GET(request: Request) {
  const user = await getAuthUser();
  if (!user || (user.role !== "admin" && user.role !== "atc")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const regNo = searchParams.get("regNo");

  if (!regNo) return NextResponse.json({ message: "Enrollment number is required" }, { status: 400 });

  await connectDB();
  
  try {
    const query: any = { enrollmentNo: regNo };
    if (user.role === "atc") {
      if (!user.tpCode) {
        return NextResponse.json({ message: "Invalid session: TP Code missing." }, { status: 403 });
      }
      query.tpCode = user.tpCode;
    }

    const student = await AtcStudent.findOne(query)
      .select("name course totalFee paidAmount duesAmount")
      .lean();

    if (!student) return NextResponse.json({ message: "Student not found" }, { status: 404 });

    return NextResponse.json({ student });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
