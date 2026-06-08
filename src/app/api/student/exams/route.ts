import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { AtcStudent } from "@/models/Student";
import { CenterSetAssignment } from "@/models/CenterSetAssignment";
import { QuestionSet } from "@/models/QuestionSet";
import { ExamQuestion } from "@/models/ExamQuestion";
import { StudentExam } from "@/models/StudentExam";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const identifier = searchParams.get("identifier") || searchParams.get("studentId");
  if (!identifier) {
    return NextResponse.json({ message: "student identifier is required." }, { status: 400 });
  }

  await connectDB();
  const query = mongoose.Types.ObjectId.isValid(identifier)
    ? { _id: new mongoose.Types.ObjectId(identifier) }
    : { $or: [{ enrollmentNo: identifier }, { registrationNo: identifier }] };
  const student = await AtcStudent.findOne(query).lean();
  if (!student) {
    return NextResponse.json({ message: "Student not found." }, { status: 404 });
  }

  const assignment = await CenterSetAssignment.findOne({ atcId: student.atcId }).lean();
  if (!assignment) {
    return NextResponse.json({ message: "No exam sets assigned to the student's center." }, { status: 404 });
  }

  const sets = await QuestionSet.find({ _id: { $in: assignment.setIds } }).lean();
  const questions = await ExamQuestion.find({ setId: { $in: assignment.setIds }, isActive: true }).lean();

  return NextResponse.json({ student, assignment, sets, questions });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentId, enrollmentNo, setId, answers } = body as {
      studentId?: string;
      enrollmentNo?: string;
      setId?: string;
      answers?: Array<{ questionId: string; selectedOption: string }>;
    };

    if ((!studentId && !enrollmentNo) || !setId || !answers?.length) {
      return NextResponse.json({ message: "studentId or enrollmentNo, setId, and answers are required." }, { status: 400 });
    }

    await connectDB();
    const idOrCode = studentId ? studentId : enrollmentNo;
    const studentQuery =
      idOrCode && mongoose.Types.ObjectId.isValid(idOrCode)
        ? { _id: new mongoose.Types.ObjectId(idOrCode) }
        : { $or: [{ enrollmentNo: idOrCode }, { registrationNo: idOrCode }] };
    const student = await AtcStudent.findOne(studentQuery).lean();
    if (!student) {
      return NextResponse.json({ message: "Student not found." }, { status: 404 });
    }

    const set = await QuestionSet.findById(setId).lean();
    if (!set) {
      return NextResponse.json({ message: "Question set not found." }, { status: 404 });
    }

    const examQuestions = await ExamQuestion.find({ setId, isActive: true }).lean();
    const questionMap = new Map(examQuestions.map((q) => [q._id.toString(), q]));

    const answerRecords = answers.map((answer) => {
      const question = questionMap.get(answer.questionId);
      const isCorrect = question?.correctOption.trim() === answer.selectedOption.trim();
      return {
        questionId: answer.questionId,
        selectedOption: answer.selectedOption.trim(),
        correct: Boolean(isCorrect),
        marksEarned: isCorrect ? question?.marks ?? 1 : 0,
      };
    });

    const totalScore = answerRecords.reduce((sum, item) => sum + item.marksEarned, 0);
    const maxScore = examQuestions.reduce((sum, item) => sum + item.marks, 0);

    const studentExam = await StudentExam.create({
      studentId: student._id,
      atcId: student.atcId,
      setId,
      answers: answerRecords,
      totalScore,
      maxScore,
      status: "completed",
      resultDeclared: false,
      marksheetReleased: false,
      certificateReleased: false,
      admitCardIssued: true,
      startedAt: new Date(),
      submittedAt: new Date(),
    });

    return NextResponse.json({ studentExam, result: { totalScore, maxScore } });
  } catch (error) {
    console.error("[student/exams POST]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
