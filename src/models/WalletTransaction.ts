import mongoose, { Schema, model, models } from "mongoose";

export interface IWalletTransaction {
  _id: mongoose.Types.ObjectId;
  atcId: mongoose.Types.ObjectId;
  tpCode: string;
  type: "credit" | "debit";
  amount: number;
  reason: string;
  adminRemark?: string;
  requestedAmount?: number;
  studentId?: mongoose.Types.ObjectId;
  studentName?: string;
  courseName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const WalletTransactionSchema = new Schema<IWalletTransaction>(
  {
    atcId: { type: Schema.Types.ObjectId, ref: "AtcUser", required: true },
    tpCode: { type: String, required: true },
    type: { type: String, enum: ["credit", "debit"], required: true },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true },
    adminRemark: { type: String, default: "" },
    requestedAmount: { type: Number, min: 0 },
    studentId: { type: Schema.Types.ObjectId, ref: "AtcStudent" },
    studentName: { type: String, default: "" },
    courseName: { type: String, default: "" },
  },
  { timestamps: true }
);

WalletTransactionSchema.index({ atcId: 1, createdAt: -1 });

export const WalletTransaction =
  models.WalletTransaction ?? model<IWalletTransaction>("WalletTransaction", WalletTransactionSchema);
