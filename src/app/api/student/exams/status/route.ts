import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { AtcStudent } from "@/models/Student";
import { StudentExam } from "@/models/StudentExam";
import { CenterSetAssignment } from "@/models/CenterSetAssignment";
import "@/models/QuestionSet";
import { lifecycleStatusForExam } from "@/lib/exam-schedule";
import { assignEnrollmentNoIfPending } from "@/lib/assignStudentEnrollmentNo";
import { assignRegistrationNoIfPending } from "@/lib/assignStudentRegistrationNo";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return NextResponse.json({ message: "studentId is required." }, { status: 400 });
    }

    await connectDB();
    // Populate setId for titles in the UI
    const exams = await StudentExam.find({ studentId }).populate("setId").sort({ createdAt: -1 });
    const changed: Promise<unknown>[] = [];
    exams.forEach((exam) => {
      const lifecycleStatus = lifecycleStatusForExam(exam);
      if (exam.lifecycleStatus !== lifecycleStatus) {
        exam.lifecycleStatus = lifecycleStatus;
        changed.push(exam.save());
      }
    });
    if (changed.length > 0) {
      await Promise.all(changed);
    }

    return NextResponse.json({ exams });
  } catch (error) {
    console.error("[student/exams/status GET]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId, examMode, preferredDate, preferredCenter, preferredTimeSlot } = body;

    if (!studentId || !examMode) {
      return NextResponse.json({ message: "studentId and examMode are required." }, { status: 400 });
    }

    await connectDB();

    const student = await AtcStudent.findById(studentId);
    if (!student) {
      return NextResponse.json({ message: "Student not found." }, { status: 404 });
    }

    const existingExam = await StudentExam.findOne({ 
      studentId: student._id, 
      status: "pending" 
    });

    if (existingExam && existingExam.approvalStatus !== "rejected") {
      return NextResponse.json({ message: "You already have an active exam request or scheduled exam." }, { status: 400 });
    }

    // Auto-assign first available setId for this center if Online
    let assignedSetId = undefined;
    if (examMode === "online") {
       const assignment = await CenterSetAssignment.findOne({ atcId: student.atcId });
       if (assignment && assignment.setIds?.length > 0) {
          assignedSetId = assignment.setIds[0];
       }
    }

    const examData: any = {
      studentId: student._id,
      atcId: student.atcId,
      setId: assignedSetId,
      examMode,
      approvalStatus: examMode === "online" ? "approved" : "pending",
      status: "pending",
      admitCardReleased: examMode === "online" ? true : false,
      examDate: examMode === "online" ? new Date() : undefined, // Online is available immediately
    };

    if (examMode === "offline") {
      examData.offlineDetails = {
        preferredDate,
        preferredCenter,
        preferredTimeSlot,
      };
    }

    const newExam = await StudentExam.create(examData);

    // Sync mode to student profile
    await AtcStudent.findByIdAndUpdate(studentId, { examMode: examMode });

    if (examMode === "online" && newExam.approvalStatus === "approved" && newExam.admitCardReleased) {
      try {
        await assignEnrollmentNoIfPending(newExam.studentId);
        await assignRegistrationNoIfPending(newExam.studentId);
      } catch (e) {
        console.error("[student/exams/status POST] assign enrollment/registration", e);
      }
    }

    return NextResponse.json({ message: "Exam mode selected successfully.", exam: newExam });
  } catch (error) {
    console.error("[student/exams/request-mode POST]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { examId, examMode, preferredDate, preferredCenter, preferredTimeSlot } = body;

    if (!examId || !examMode) {
      return NextResponse.json({ message: "examId and examMode are required." }, { status: 400 });
    }

    await connectDB();

    const exam = await StudentExam.findById(examId);
    if (!exam) {
      return NextResponse.json({ message: "Exam record not found." }, { status: 404 });
    }

    if (exam.status !== "pending") {
      return NextResponse.json({ message: "Exam already in progress or completed." }, { status: 400 });
    }

    exam.examMode = examMode;
    
    if (examMode === "online") {
      exam.approvalStatus = "approved";
      exam.admitCardReleased = true;
      exam.offlineDetails = undefined;
      exam.examDate = new Date();
      
      // Also try to assign setId if missing
      if (!exam.setId) {
        const student = await AtcStudent.findById(exam.studentId);
        if (student) {
          const assignment = await CenterSetAssignment.findOne({ atcId: student.atcId });
          if (assignment && assignment.setIds?.length > 0) {
            exam.setId = assignment.setIds[0];
          }
        }
      }
    } else {
      exam.approvalStatus = "pending";
      exam.admitCardReleased = false;
      exam.offlineDetails = {
        preferredDate,
        preferredCenter,
        preferredTimeSlot,
      };
    }

    await exam.save();

    // Sync mode to student profile
    await AtcStudent.findByIdAndUpdate(exam.studentId, { examMode: examMode });

    if (exam.approvalStatus === "approved" && exam.admitCardReleased) {
      try {
        await assignEnrollmentNoIfPending(exam.studentId);
        await assignRegistrationNoIfPending(exam.studentId);
      } catch (e) {
        console.error("[student/exams/status PUT] assign enrollment/registration", e);
      }
    }

    return NextResponse.json({ message: "Exam request updated successfully.", exam });
  } catch (error: any) {
    console.error("[student/exams/status PUT]", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
