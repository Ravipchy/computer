import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { CourseEnquiry } from "@/models/CourseEnquiry";
import { verifyAdmin } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const isAdmin = await verifyAdmin(req);
    if (!isAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const enquiries = await CourseEnquiry.find().sort({ createdAt: -1 });
    return NextResponse.json(enquiries);
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
