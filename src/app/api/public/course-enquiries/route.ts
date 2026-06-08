import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { CourseEnquiry } from "@/models/CourseEnquiry";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, mobile, courseId, courseName } = body;

    if (!name || !mobile || !courseId || !courseName) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    await connectDB();
    const enquiry = await CourseEnquiry.create({
      name,
      email,
      mobile,
      courseId,
      courseName,
    });
    return NextResponse.json({ message: "Enquiry submitted successfully", enquiry }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
