import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { verifyAtc } from "@/lib/auth";

export async function GET(request: Request) {
  const user = await verifyAtc(request);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");
  if (!studentId) return NextResponse.json({ message: "Student ID required" }, { status: 400 });

  await connectDB();
  try {
    const { StudentMedia } = await import("@/models/StudentMedia");
    const mediaItems = await StudentMedia.find({ studentId });
    const media: Record<string, string> = {};
    mediaItems.forEach(item => {
      media[item.fieldName] = item.content;
    });
    return NextResponse.json({ media });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await verifyAtc(request);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const formData = await request.formData();
    const studentId = formData.get("studentId") as string;
    const fieldName = formData.get("fieldName") as string;
    const file = formData.get("file") as File | null;

    if (!studentId || !fieldName || !file) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // File Size Validation
    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";
    const fileSizeKb = file.size / 1024;

    if (isImage && fileSizeKb > 100) {
      return NextResponse.json({ message: `${fieldName}: Image size exceeds 100KB limit.` }, { status: 400 });
    }
    if (isPdf && fileSizeKb > 500) {
      return NextResponse.json({ message: `${fieldName}: PDF size exceeds 500KB limit.` }, { status: 400 });
    }
    if (!isImage && !isPdf && fileSizeKb > 500) {
      // Default fallback for other files
      return NextResponse.json({ message: `${fieldName}: File size exceeds 500KB limit.` }, { status: 400 });
    }

    await connectDB();

    const toBase64 = async (f: File) => {
      try {
        if (!f.size || f.size === 0) return "";
        const arrayBuffer = await f.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        return `data:${f.type || "application/octet-stream"};base64,${buffer.toString("base64")}`;
      } catch (e: any) {
        console.error("toBase64 conversion fail:", e.message);
        return "";
      }
    };

    const content = await toBase64(file);
    if (!content) {
      return NextResponse.json({ message: "Empty file content" }, { status: 400 });
    }

    const { StudentMedia } = await import("@/models/StudentMedia");
    await StudentMedia.findOneAndUpdate(
      { studentId, fieldName },
      { content },
      { upsert: true }
    );

    // Also update the main Student document if it's a critical field
    // (photo, studentSignature, etc.) just to keep it in sync, if needed.
    // However, the main API fetches from StudentMedia and merges it anyway,
    // so we don't strictly need to duplicate it in AtcStudent, but let's check
    // if other parts of the app rely on AtcStudent having it.
    const { AtcStudent } = await import("@/models/Student");
    const allowedMainFields = ["photo", "studentSignature", "aadharDoc", "marksheet10th", "marksheet12th", "graduationDoc", "highestQualDoc", "otherDocs"];
    // Wait, in POST /api/atc/students, it explicitly removes heavy docs from main object:
    // studentData.photo = "";
    // So we don't need to put it in AtcStudent.

    return NextResponse.json({ message: "Media uploaded successfully" }, { status: 200 });
  } catch (error: any) {
    console.error("[POST MEDIA ERROR]", error);
    return NextResponse.json({ message: error.message || "Unknown error" }, { status: 500 });
  }
}
