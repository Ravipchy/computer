import mongoose, { Schema, model, models } from "mongoose";

export interface IStudyMaterial {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  category: string; // Course name or subject
  type: "video" | "pdf" | "text";
  content: string; // YouTube ID, PDF URL, or Raw Text
  uploadedBy: "admin" | "atc";
  atcId?: mongoose.Types.ObjectId; // Null if uploaded by Admin
  tpCode?: string; // Optional reference
  status: "active" | "hidden";
  createdAt: Date;
  updatedAt: Date;
}

const StudyMaterialSchema = new Schema<IStudyMaterial>(
  {
    title: { type: String, required: true },
    description: { type: String },
    category: { type: String, required: true },
    type: { type: String, enum: ["video", "pdf", "text"], required: true },
    content: { type: String, required: true },
    uploadedBy: { type: String, enum: ["admin", "atc"], required: true },
    atcId: { type: Schema.Types.ObjectId, ref: "AtcUser" },
    tpCode: { type: String },
    status: { type: String, enum: ["active", "hidden"], default: "active" },
  },
  { timestamps: true }
);

export const StudyMaterial = models.StudyMaterial || model<IStudyMaterial>("StudyMaterial", StudyMaterialSchema);
