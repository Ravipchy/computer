import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { verifyAtc } from "@/lib/auth";
import { AtcUser } from "@/models/AtcUser";
import { WalletRequest } from "@/models/WalletRequest";
import { WalletTransaction } from "@/models/WalletTransaction";
import { Settings } from "@/models/Settings";
import { AtcStudent } from "@/models/Student";
import { isValidIsoDate, normalizeIsoDate } from "@/lib/isoDate";

export async function GET(request: Request) {
  const user = await verifyAtc(request);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const atc = await AtcUser.findById(user.id).select("walletBalance tpCode").lean() as any;
    if (!atc) return NextResponse.json({ message: "ATC not found" }, { status: 404 });

    const requests = await WalletRequest.find({ atcId: user.id }).sort({ createdAt: -1 }).limit(50).lean();
    const history = await WalletTransaction.find({ atcId: user.id }).sort({ createdAt: -1 }).limit(100).lean();
    const studentIds = history
      .map((item: any) => String(item.studentId || ""))
      .filter((id: string) => Boolean(id));
    const students = studentIds.length
      ? await AtcStudent.find({ _id: { $in: studentIds } }).select("_id enrollmentNo").lean()
      : [];
    const regMap = new Map<string, string>();
    students.forEach((student: any) => regMap.set(String(student._id), String(student.enrollmentNo || "")));
    const historyWithReg = history.map((item: any) => ({
      ...item,
      enrollmentNo: item.studentId ? regMap.get(String(item.studentId)) || "" : "",
    }));
    const walletSettings = await Settings.find({
      key: { $in: ["wallet_payment_name", "wallet_payment_upi", "wallet_payment_note", "wallet_payment_qr", "qr_code"] },
    }).lean();
    const paymentConfig: Record<string, string> = {
      name: "",
      upi: "",
      note: "",
      qr: "",
    };
    walletSettings.forEach((setting: any) => {
      if (setting.key === "wallet_payment_name") paymentConfig.name = setting.value;
      if (setting.key === "wallet_payment_upi") paymentConfig.upi = setting.value;
      if (setting.key === "wallet_payment_note") paymentConfig.note = setting.value;
      if (setting.key === "wallet_payment_qr") paymentConfig.qr = setting.value;
      if (setting.key === "qr_code" && !paymentConfig.qr) paymentConfig.qr = setting.value;
    });
    Object.keys(paymentConfig).forEach((key) => {
      if ((paymentConfig as any)[key] === "-") (paymentConfig as any)[key] = "";
    });
    if (!paymentConfig.note) paymentConfig.note = "Course Wallet Payment";

    return NextResponse.json({
      balance: atc.walletBalance || 0,
      requests,
      history: historyWithReg,
      paymentConfig,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await verifyAtc(request);
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { amount, transactionId, paymentDate, paymentScreenshot, paymentNote } = await request.json();
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      return NextResponse.json({ message: "Please provide a valid amount" }, { status: 400 });
    }
    if (!transactionId || !String(transactionId).trim()) {
      return NextResponse.json({ message: "Transaction ID is required" }, { status: 400 });
    }
    if (!paymentScreenshot || !String(paymentScreenshot).startsWith("data:image/")) {
      return NextResponse.json({ message: "Payment screenshot is required" }, { status: 400 });
    }

    let paymentDateValue: Date | undefined;
    if (paymentDate != null && String(paymentDate).trim()) {
      const normalized = normalizeIsoDate(paymentDate);
      if (!isValidIsoDate(normalized)) {
        return NextResponse.json(
          { message: "Payment date must be a valid date (YYYY-MM-DD, year exactly 4 digits)." },
          { status: 400 },
        );
      }
      paymentDateValue = new Date(`${normalized}T00:00:00Z`);
    }

    await connectDB();
    const atc = await AtcUser.findById(user.id).select("tpCode").lean() as any;
    if (!atc) return NextResponse.json({ message: "ATC not found" }, { status: 404 });

    const walletRequest = await WalletRequest.create({
      atcId: user.id,
      tpCode: atc.tpCode,
      amount: numericAmount,
      transactionId: String(transactionId).trim(),
      paymentDate: paymentDateValue,
      paymentScreenshot,
      paymentNote: String(paymentNote || "").trim(),
      status: "pending",
    });

    return NextResponse.json({ message: "Wallet request submitted", request: walletRequest }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
