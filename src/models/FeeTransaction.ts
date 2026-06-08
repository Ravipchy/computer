import mongoose, { Schema, model, models } from "mongoose";

export interface IFeeTransaction {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  date: Date;
  receiptNo: string;
  paidFor: string;
  paymentMode: "Cash" | "Online";
  amount: number;
  type: "collect" | "return";
  nextInstallmentDate?: Date;
  nextInstallmentAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const FeeTransactionSchema = new Schema<IFeeTransaction>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "AtcStudent", required: true },
    date: { type: Date, required: true },
    receiptNo: { type: String, required: true, unique: true },
    paidFor: { type: String, required: true },
    paymentMode: { type: String, enum: ["Cash", "Online"], required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ["collect", "return"], required: true },
    nextInstallmentDate: { type: Date },
    nextInstallmentAmount: { type: Number },
  },
  { timestamps: true }
);

if (mongoose.models.FeeTransaction) {
  delete mongoose.models.FeeTransaction;
}
export const FeeTransaction = model<IFeeTransaction>("FeeTransaction", FeeTransactionSchema);
