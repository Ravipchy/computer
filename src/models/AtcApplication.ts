import mongoose, { Schema, model, models } from "mongoose";

export type AtcApplicationStatus = "pending" | "approved" | "rejected";

export type AtcFeeCalculationSnapshot = {
  zoneLineItems: { zone: string; amount: number }[];
  totalAmount: number;
  affiliationYear: number;
  discountPercent: number;
  finalAmount: number;
  discountAmount: number;
  payableAmount: number;
};

export interface IAtcApplication {
  _id: mongoose.Types.ObjectId;
  /** Payable amount (rupees) or legacy process-fee plan value */
  processFee: string;
  /** Selected duration in years (1, 2, 3, …) from admin-configured plans */
  affiliationPlanYear: number;
  /** Server-computed fee breakdown at submission */
  feeCalculation?: AtcFeeCalculationSnapshot | null;
  trainingPartnerName: string;
  trainingPartnerAddress: string;
  totalName: string;
  district: string;
  state: string;
  pin: string;
  country: string;
  mobile: string;
  email: string;
  statusOfInstitution: string;
  yearOfEstablishment: string;
  chiefName: string;
  designation: string;
  educationQualification: string;
  professionalExperience: string;
  dob: string;
  photo?: string; // Base64 or URL
  logo?: string; // Base64 or URL
  signature?: string; // Base64 or URL
  aadharDoc?: string; // Base64 or URL
  aadharNo?: string;
  marksheetDoc?: string; // Base64 or URL
  otherDocs?: string; // Base64 or URL
  paymentMode: string;
  paymentScreenshot?: string; // Base64 or URL
  instituteDocument?: string; // Base64 or URL
  infrastructure: string; // JSON string
  paidAmount: string;
  transactionNo: string;
  status: AtcApplicationStatus;
  tpCode?: string; // Generated after approval
  submittedByAdmin: boolean; // true if Admin filled and directly approved
  postalAddressOffice: string;
  zones: string[];
  createdAt: Date;
  updatedAt: Date;
}

const AtcApplicationSchema = new Schema<IAtcApplication>(
  {
    processFee: { type: String, default: "" },
    affiliationPlanYear: { type: Number, default: 0 },
    feeCalculation: { type: Schema.Types.Mixed, default: null },
    trainingPartnerName: { type: String, required: true },
    trainingPartnerAddress: { type: String, required: true },
    postalAddressOffice: { type: String, default: "" },
    zones: { type: [String], default: [] },
    totalName: { type: String, default: "" },
    district: { type: String, required: true },
    state: { type: String, required: true },
    pin: { type: String, required: true },
    country: { type: String, default: "INDIA" },
    mobile: { type: String, required: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    statusOfInstitution: { type: String, required: true },
    yearOfEstablishment: { type: String, required: true },
    chiefName: { type: String, required: true },
    designation: { type: String, required: true },
    educationQualification: { type: String, required: true },
    professionalExperience: { type: String, required: true },
    dob: { type: String, required: true },
    photo: { type: String },
    logo: { type: String },
    signature: { type: String },
    aadharDoc: { type: String },
    aadharNo: { type: String, default: "" },
    marksheetDoc: { type: String },
    otherDocs: { type: String },
    paymentMode: { type: String, required: true },
    paymentScreenshot: { type: String },
    instituteDocument: { type: String },
    infrastructure: { type: String, default: "{}" },
    paidAmount: { type: String, default: "" },
    transactionNo: { type: String, default: "" },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    tpCode: { type: String, default: "" },
    submittedByAdmin: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const AtcApplication =
  models.AtcApplication ?? model<IAtcApplication>("AtcApplication", AtcApplicationSchema);
