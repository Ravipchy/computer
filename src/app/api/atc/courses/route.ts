import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { connectDB } from "@/lib/mongodb";
import { Course } from "@/models/Course";
import { verifyAtc } from "@/lib/auth";

export async function GET(request: Request) {
  const sessionUser = await verifyAtc(request);
  if (!sessionUser) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    // ATC new admission should show all admin-managed active courses.
    const courses = await Course.find({ status: "active" }).sort({ name: 1 });

    return NextResponse.json(courses);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
