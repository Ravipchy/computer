import mongoose, { Schema, model, models } from "mongoose";

export interface ICertificate {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  atcId: mongoose.Types.ObjectId;
  examId: mongoose.Types.ObjectId;
  enrollmentNo: string;
  serialNo: string;
  issueDate: Date;
  session: string;
  courseName: string;
  centerCode: string;
  centerName: string;
  grade: string;
  /** e.g. "APR-2025" — month-year admission started; printed on the "From ___" line. */
  fromLabel?: string;
  /** Course duration in months — printed on the "___ Duration" line as e.g. "3 MONTHS". */
  durationMonths?: number;
  isApproved: boolean;
  createdAt: Date;
}

const CertificateSchema = new Schema<ICertificate>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "AtcStudent", required: true },
    atcId: { type: Schema.Types.ObjectId, ref: "AtcUser", required: true },
    examId: { type: Schema.Types.ObjectId, ref: "StudentExam", required: true },
    enrollmentNo: { type: String, required: true },
    serialNo: { type: String, required: true, unique: true },
    issueDate: { type: Date, default: Date.now },
    session: { type: String, required: true },
    courseName: { type: String, required: true },
    centerCode: { type: String, required: true },
    centerName: { type: String, required: true },
    grade: { type: String, required: true },
    fromLabel: { type: String },
    durationMonths: { type: Number, min: 0 },
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Certificate =
  models.Certificate || model<ICertificate>("Certificate", CertificateSchema);
