import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { AtcStudent } from "@/models/Student";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const regNo = searchParams.get("regNo");

    if (!regNo) {
      return NextResponse.json({ message: "Enrollment number is required" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const atcToken = cookieStore.get("atc_token")?.value;
    const adminToken = cookieStore.get("admin_token")?.value;

    if (!atcToken && !adminToken) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Verify token
    try {
      const token = atcToken || adminToken;
      jwt.verify(token!, JWT_SECRET);
    } catch {
      return NextResponse.json({ message: "Invalid session" }, { status: 401 });
    }

    await connectDB();
    
    // Use regex for case-insensitive search and handle possible whitespace
    const student = await AtcStudent.findOne({ 
      enrollmentNo: { $regex: new RegExp(`^${regNo.trim()}$`, "i") } 
    }).lean();

    if (!student) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ student });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
