import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { connectDB } from "@/lib/mongodb";
import { Course } from "@/models/Course";

export async function GET() {
  try {
    await connectDB();
    const courses = await Course.find({ status: "active" }).sort({ name: 1 });
    return NextResponse.json(courses);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
