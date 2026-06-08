import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { StudentExam } from "@/models/StudentExam";
import { AtcStudent } from "@/models/Student"; // Ensure model registration
import { Course } from "@/models/Course";
import { lifecycleStatusForExam } from "@/lib/exam-schedule";

import { verifyAdmin } from "@/lib/auth";

type CourseDoc = {
  _id: mongoose.Types.ObjectId;
  name?: string;
  shortName?: string;
  subjects?: Array<{
    name: string;
    fullMarks: number;
    theoryMarks: number;
    practicalMarks: number;
  }>;
};

export async function GET(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const atcId = searchParams.get("atcId");

    await connectDB();
    
    const query: Record<string, unknown> = {};
    if (atcId && mongoose.Types.ObjectId.isValid(atcId)) {
      query.atcId = new mongoose.Types.ObjectId(atcId);
    }

    // We populate student info and ATC info
    const requests = await StudentExam.find(query)
      .populate({
        path: "studentId",
        select: "name enrollmentNo mobile course courseId session",
        model: AtcStudent
      })
      .populate({
        path: "atcId",
        select: "trainingPartnerName tpCode",
      })
      .sort({ createdAt: -1 })
      .lean();

    const courseIdSet = new Set<string>();
    const courseNameSet = new Set<string>();
    for (const r of requests) {
      const stu = (r as { studentId?: { courseId?: unknown; course?: unknown } }).studentId || {};
      if (stu.courseId) courseIdSet.add(String(stu.courseId));
      if (stu.course) courseNameSet.add(String(stu.course).trim());
    }
    const courseOrs: Record<string, unknown>[] = [];
    if (courseIdSet.size > 0) {
      courseOrs.push({
        _id: { $in: Array.from(courseIdSet).map((id) => new mongoose.Types.ObjectId(id)) },
      });
    }
    for (const n of courseNameSet) {
      const escaped = n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      courseOrs.push({ name: { $regex: `^${escaped}$`, $options: "i" } });
      courseOrs.push({ shortName: { $regex: `^${escaped}$`, $options: "i" } });
    }
    const courseDocs = courseOrs.length
      ? ((await Course.find({ $or: courseOrs })
          .select("name shortName subjects")
          .lean()) as CourseDoc[])
      : [];
    const byId = new Map<string, CourseDoc>();
    const byName = new Map<string, CourseDoc>();
    for (const c of courseDocs) {
      byId.set(String(c._id), c);
      if (c.name) byName.set(String(c.name).trim().toLowerCase(), c);
      if (c.shortName) byName.set(String(c.shortName).trim().toLowerCase(), c);
    }

    const enriched = requests.map((r) => {
      const stu = (r as { studentId?: { courseId?: unknown; course?: unknown } }).studentId || {};
      let course: CourseDoc | undefined;
      if (stu.courseId) course = byId.get(String(stu.courseId));
      if (!course && stu.course) {
        course = byName.get(String(stu.course).trim().toLowerCase());
      }
      return {
        ...r,
        courseSubjects: course?.subjects ?? [],
      };
    });

    const updates = requests
      .map((req) => {
        const lifecycleStatus = lifecycleStatusForExam(req);
        if (req.lifecycleStatus === lifecycleStatus) return null;
        return {
          updateOne: {
            filter: { _id: req._id },
            update: { $set: { lifecycleStatus } },
          },
        };
      })
      .filter(Boolean) as Array<{ updateOne: { filter: { _id: unknown }; update: { $set: { lifecycleStatus: string } } } }>;
    if (updates.length > 0) {
      await StudentExam.bulkWrite(updates);
    }

    return NextResponse.json({ requests: enriched });
  } catch (error) {
    console.error("[admin/exams/all GET]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
