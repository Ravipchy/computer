import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { AtcStudent } from "@/models/AtcStudent";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("student_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; enrollmentNo?: string };
    
    const { oldPassword, newPassword } = await request.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ message: "Both old and new passwords are required." }, { status: 400 });
    }

    await connectDB();

    const student = await AtcStudent.findById(decoded.id);
    if (!student) {
      return NextResponse.json({ message: "Student not found." }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(oldPassword, student.password || student.mobile);
    if (!isMatch) {
      return NextResponse.json({ message: "Current password is incorrect." }, { status: 401 });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    student.password = hashed;
    await student.save();

    return NextResponse.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("[student/settings/password]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
