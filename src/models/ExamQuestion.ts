import mongoose, { Schema, model, models } from "mongoose";

export interface IExamQuestion {
  _id: mongoose.Types.ObjectId;
  setId: mongoose.Types.ObjectId;
  questionText: string;
  options: string[];
  correctOption: string;
  marks: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ExamQuestionSchema = new Schema<IExamQuestion>(
  {
    setId: { type: Schema.Types.ObjectId, ref: "QuestionSet", required: true },
    questionText: { type: String, required: true, trim: true },
    options: { type: [String], required: true, validate: [(val: string[]) => val.length >= 2, "At least 2 options are required."] },
    correctOption: { type: String, required: true, trim: true },
    marks: { type: Number, required: true, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const ExamQuestion = models.ExamQuestion ?? model<IExamQuestion>("ExamQuestion", ExamQuestionSchema);
