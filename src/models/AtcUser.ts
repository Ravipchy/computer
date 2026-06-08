import mongoose, { Schema, model, models } from "mongoose";

export interface IAtcUser {
  _id: mongoose.Types.ObjectId;
  tpCode: string; // unique login code
  trainingPartnerName: string;
  email: string;
  mobile: string;
  password: string; // hashed
  applicationId: mongoose.Types.ObjectId;
  zones: string[];
  walletBalance: number;
  status: "active" | "disabled";
  createdAt: Date;
}

const AtcUserSchema = new Schema<IAtcUser>(
  {
    tpCode: { type: String, required: true, unique: true },
    trainingPartnerName: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, required: true },
    password: { type: String, required: true },
    applicationId: { type: Schema.Types.ObjectId, ref: "AtcApplication", required: true },
    zones: [{ type: String }],
    walletBalance: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: ["active", "disabled"], default: "active" },
  },
  { timestamps: true },
);

export const AtcUser = models.AtcUser ?? model<IAtcUser>("AtcUser", AtcUserSchema);
