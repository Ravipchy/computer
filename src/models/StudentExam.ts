import mongoose, { Schema, model, models } from "mongoose";

export interface IStudentExamAnswer {
  questionId: mongoose.Types.ObjectId;
  selectedOption: string;
  correct: boolean;
  marksEarned: number;
}

export interface IExamSubjectMark {
  subjectName: string;
  internalObtained: number;
  internalMax: number;
  externalObtained: number;
  externalMax: number;
  marksObtained: number;
  totalMarks: number;
}

export interface IStudentExam {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  atcId: mongoose.Types.ObjectId;
  setId?: mongoose.Types.ObjectId;
  examMode?: "online" | "offline";
  offlineDetails?: {
    preferredDate?: string;
    preferredCenter?: string;
    preferredTimeSlot?: string;
  };
  approvalStatus: "none" | "pending" | "approved" | "rejected";
  admitCardReleased: boolean;
  examDate?: Date;
  examTime?: string;
  examDateTime?: Date;
  durationMinutes?: number;
  lifecycleStatus?: "upcoming" | "active" | "completed";
  answers: IStudentExamAnswer[];
  totalScore: number;
  maxScore: number;
  status: "pending" | "completed";
  startedAt?: Date;
  submittedAt?: Date;
  resultDeclared: boolean;
  grade?: string;
  session?: string;
  offlineExamStatus?: "not_appeared" | "appeared" | "review_pending" | "published";
  offlineExamResult?: "Pass" | "Fail" | "Waiting";
  offlineExamCopy?: string;
  marksheetReleased?: boolean;
  certificateReleased?: boolean;
  subjectMarks?: IExamSubjectMark[];
  createdAt: Date;
  updatedAt: Date;
}

const ExamSubjectMarkSchema = new Schema<IExamSubjectMark>(
  {
    subjectName: { type: String, required: true },
    internalObtained: { type: Number, default: 0 },
    internalMax: { type: Number, default: 0 },
    externalObtained: { type: Number, default: 0 },
    externalMax: { type: Number, default: 0 },
    marksObtained: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
  },
  { _id: false },
);

const StudentExamAnswerSchema = new Schema<IStudentExamAnswer>(
  {
    questionId: { type: Schema.Types.ObjectId, ref: "ExamQuestion", required: true },
    selectedOption: { type: String, required: true },
    correct: { type: Boolean, required: true },
    marksEarned: { type: Number, required: true },
  },
  { _id: false },
);

const StudentExamSchema = new Schema<IStudentExam>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "AtcStudent", required: true },
    atcId: { type: Schema.Types.ObjectId, ref: "AtcUser", required: true },
    setId: { type: Schema.Types.ObjectId, ref: "QuestionSet" },
    examMode: { type: String, enum: ["online", "offline"] },
    offlineDetails: {
      preferredDate: String,
      preferredCenter: String,
      preferredTimeSlot: String,
    },
    approvalStatus: { 
      type: String, 
      enum: ["none", "pending", "approved", "rejected"],
      default: "none" 
    },
    admitCardReleased: { type: Boolean, default: false },
    examDate: { type: Date },
    examTime: { type: String },
    examDateTime: { type: Date },
    durationMinutes: { type: Number, default: 60, min: 1 },
    lifecycleStatus: {
      type: String,
      enum: ["upcoming", "active", "completed"],
      default: "upcoming",
    },
    answers: { type: [StudentExamAnswerSchema], default: [] },
    totalScore: { type: Number, default: 0 },
    maxScore: { type: Number, default: 100 },
    status: { type: String, enum: ["pending", "completed"], default: "pending" },
    startedAt: { type: Date },
    submittedAt: { type: Date },
    resultDeclared: { type: Boolean, default: false },
    grade: { type: String },
    session: { type: String },
    // Offline specific tracking
    offlineExamStatus: { type: String, enum: ["not_appeared", "appeared", "review_pending", "published"], default: "not_appeared" },
    offlineExamResult: { type: String, enum: ["Pass", "Fail", "Waiting"], default: "Waiting" },
    offlineExamCopy: { type: String }, // Base64 PDF
    marksheetReleased: { type: Boolean, default: false },
    certificateReleased: { type: Boolean, default: false },
    subjectMarks: { type: [ExamSubjectMarkSchema], default: [] },
  },
  { timestamps: true },
);

export const StudentExam = models.StudentExam ?? model<IStudentExam>("StudentExam", StudentExamSchema);
