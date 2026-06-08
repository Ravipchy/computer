import mongoose, { Schema, model, models } from "mongoose";

export interface ISubjectMark {
  subjectName: string;
  marksObtained: number;
  totalMarks: number;
  /**
   * Optional split — when present, the overlay renders these directly
   * into the printed Internal/External (Obt/Max) columns. Otherwise the
   * UI derives a ~30/70 split from `marksObtained` / `totalMarks`.
   */
  internalObtained?: number;
  internalMax?: number;
  externalObtained?: number;
  externalMax?: number;
}

export interface IMarksheet {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  atcId: mongoose.Types.ObjectId;
  examId: mongoose.Types.ObjectId;
  enrollmentNo: string;
  rollNo: string;
  courseName: string;
  subjects: ISubjectMark[];
  totalObtained: number;
  totalMax: number;
  percentage: number;
  grade: string;
  result: "Pass" | "Fail";
  issueDate: Date;
  isApproved: boolean;
  createdAt: Date;
}

const MarksheetSchema = new Schema<IMarksheet>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "AtcStudent", required: true },
    atcId: { type: Schema.Types.ObjectId, ref: "AtcUser", required: true },
    examId: { type: Schema.Types.ObjectId, ref: "StudentExam", required: true },
    enrollmentNo: { type: String, required: true },
    rollNo: { type: String, required: true },
    courseName: { type: String, required: true },
    subjects: [
      {
        subjectName: { type: String, required: true },
        marksObtained: { type: Number, required: true },
        totalMarks: { type: Number, required: true },
        internalObtained: { type: Number },
        internalMax: { type: Number },
        externalObtained: { type: Number },
        externalMax: { type: Number },
      },
    ],
    totalObtained: { type: Number, required: true },
    totalMax: { type: Number, required: true },
    percentage: { type: Number, required: true },
    grade: { type: String, required: true },
    result: { type: String, enum: ["Pass", "Fail"], required: true },
    issueDate: { type: Date, default: Date.now },
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Marksheet = models.Marksheet || model<IMarksheet>("Marksheet", MarksheetSchema);
