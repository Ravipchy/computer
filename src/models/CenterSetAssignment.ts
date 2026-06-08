import mongoose, { Schema, model, models } from "mongoose";

export interface ICenterSetAssignment {
  _id: mongoose.Types.ObjectId;
  atcId: mongoose.Types.ObjectId;
  tpCode: string;
  setIds: mongoose.Types.ObjectId[];
  examDate?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CenterSetAssignmentSchema = new Schema<ICenterSetAssignment>(
  {
    atcId: { type: Schema.Types.ObjectId, ref: "AtcUser", required: true },
    tpCode: { type: String, required: true, trim: true },
    setIds: [{ type: Schema.Types.ObjectId, ref: "QuestionSet", required: true }],
    examDate: { type: String },
    notes: { type: String, default: "" },
  },
  { timestamps: true },
);

export const CenterSetAssignment = models.CenterSetAssignment ?? model<ICenterSetAssignment>("CenterSetAssignment", CenterSetAssignmentSchema);
