import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { StudyMaterial } from "@/models/StudyMaterial";
import { AtcStudent } from "@/models/Student";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

async function verifyStudent() {
  const cookieStore = await cookies();
  const token = cookieStore.get("student_token")?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    return decoded;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const session = await verifyStudent();
    if (!session) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const student = await AtcStudent.findById(session.id);
    if (!student) return NextResponse.json({ message: "Student not found" }, { status: 404 });

    const materials = await StudyMaterial.find({
      status: "active",
      $or: [
        { uploadedBy: "admin" },
        { uploadedBy: "atc", atcId: student.atcId }
      ]
    }).sort({ createdAt: -1 });

    return NextResponse.json(materials);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
