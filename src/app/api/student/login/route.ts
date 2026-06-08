import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { AtcStudent } from "@/models/Student";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function POST(request: Request) {
  try {
    const { enrollmentNo, password } = await request.json();

    if (!enrollmentNo || !password) {
      return NextResponse.json({ message: "Enrollment number and password are required." }, { status: 400 });
    }

    await connectDB();
    const student = await AtcStudent.findOne({ enrollmentNo });

    if (!student) {
      return NextResponse.json({ message: "Invalid enrollment number or password." }, { status: 401 });
    }

    const isPlainMatch = password === student.password;
    const isHashMatch = student.password?.startsWith("$2b$") 
      ? await bcrypt.compare(password, student.password) 
      : false;
    
    if (!isPlainMatch && !isHashMatch) {
      return NextResponse.json({ message: "Invalid enrollment number or password." }, { status: 401 });
    }

    if (student.userStatus === "disabled") {
      return NextResponse.json({ message: "Your account has been disabled. Please contact administration." }, { status: 403 });
    }

    if (student.status !== "active" && student.status !== "approved") {
      return NextResponse.json({ message: "Your application is pending approval or has been rejected. Please contact your center." }, { status: 403 });
    }

    const token = jwt.sign(
      { id: student._id, enrollmentNo: student.enrollmentNo, name: student.name, role: "student" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const response = NextResponse.json({ message: "Login successful", name: student.name }, { status: 200 });
    response.cookies.set("student_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("[student login error]", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
