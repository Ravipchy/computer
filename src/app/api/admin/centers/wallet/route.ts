import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { verifyAdmin } from "@/lib/auth";
import { AtcUser } from "@/models/AtcUser";
import { WalletTransaction } from "@/models/WalletTransaction";

export async function GET(request: Request) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const tpCode = String(searchParams.get("tpCode") || "").trim();
    if (!tpCode) return NextResponse.json({ message: "tpCode is required" }, { status: 400 });

    const atc = await AtcUser.findOne({ tpCode }).select("_id tpCode trainingPartnerName walletBalance").lean() as any;
    if (!atc) return NextResponse.json({ message: "Center wallet account not found" }, { status: 404 });

    const history = await WalletTransaction.find({ atcId: atc._id }).sort({ createdAt: -1 }).limit(200).lean();
    return NextResponse.json({ center: atc, history });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Failed to load wallet details" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { tpCode, action, amount, remark } = await request.json();
    const normalizedTpCode = String(tpCode || "").trim();
    const normalizedAction = String(action || "").trim();
    const numericAmount = Number(amount);
    const adminRemark = String(remark || "").trim();

    if (!normalizedTpCode) return NextResponse.json({ message: "tpCode is required" }, { status: 400 });
    if (!["credit", "debit"].includes(normalizedAction)) {
      return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    }
    if (!numericAmount || numericAmount <= 0) {
      return NextResponse.json({ message: "Amount must be greater than zero" }, { status: 400 });
    }

    await connectDB();
    const atc = await AtcUser.findOne({ tpCode: normalizedTpCode });
    if (!atc) return NextResponse.json({ message: "Center wallet account not found" }, { status: 404 });

    if (normalizedAction === "debit" && Number(atc.walletBalance || 0) < numericAmount) {
      return NextResponse.json({ message: "Insufficient wallet balance for withdrawal" }, { status: 400 });
    }

    atc.walletBalance = Number(atc.walletBalance || 0) + (normalizedAction === "credit" ? numericAmount : -numericAmount);
    await atc.save();

    await WalletTransaction.create({
      atcId: atc._id,
      tpCode: atc.tpCode,
      type: normalizedAction,
      amount: numericAmount,
      reason: normalizedAction === "credit" ? "Admin wallet manual credit" : "Admin wallet manual withdrawal",
      adminRemark,
    });

    return NextResponse.json({
      message: normalizedAction === "credit" ? "Balance added successfully" : "Balance withdrawn successfully",
      balance: atc.walletBalance,
    });
  } catch (error: any) {
    return NextResponse.json({ message: error.message || "Wallet update failed" }, { status: 500 });
  }
}
