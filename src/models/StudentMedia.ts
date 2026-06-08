import mongoose, { Schema, model, models } from "mongoose";

const StudentMediaSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "AtcStudent", required: true },
    fieldName: { type: String, required: true },
    content: { type: String, required: true }, // Base64 Data
  },
  { timestamps: true }
);

// Index for fast lookups
StudentMediaSchema.index({ studentId: 1, fieldName: 1 });

export const StudentMedia = models.StudentMedia || model("StudentMedia", StudentMediaSchema);
