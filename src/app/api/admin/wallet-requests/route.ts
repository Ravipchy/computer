import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { verifyAdmin } from "@/lib/auth";
import { WalletRequest } from "@/models/WalletRequest";
import { AtcUser } from "@/models/AtcUser";
import { WalletTransaction } from "@/models/WalletTransaction";

export async function GET(request: Request) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    await connectDB();
    const requests = await WalletRequest.find()
      .sort({ createdAt: -1 })
      .limit(200)
      .populate({ path: "atcId", select: "trainingPartnerName tpCode walletBalance" })
      .lean();

    return NextResponse.json({ requests });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const isAdmin = await verifyAdmin(request);
  if (!isAdmin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const { requestId, action, approvedAmount, adminRemark } = await request.json();
    if (!requestId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
    }

    await connectDB();
    const walletRequest = await WalletRequest.findById(requestId);
    if (!walletRequest) return NextResponse.json({ message: "Request not found" }, { status: 404 });
    if (walletRequest.status !== "pending") {
      return NextResponse.json({ message: "Request already processed" }, { status: 400 });
    }

    if (action === "approve") {
      const finalAmount = Number(approvedAmount ?? walletRequest.amount);
      if (!finalAmount || finalAmount <= 0) {
        return NextResponse.json({ message: "Approved amount must be greater than zero" }, { status: 400 });
      }
      const updatedAtc = await AtcUser.findByIdAndUpdate(walletRequest.atcId, {
        $inc: { walletBalance: finalAmount },
      }, { new: true }).lean() as any;
      walletRequest.status = "approved";
      walletRequest.approvedAmount = finalAmount;
      walletRequest.adminRemark = String(adminRemark || "").trim();
      walletRequest.processedAt = new Date();
      if (updatedAtc) {
        await WalletTransaction.create({
          atcId: updatedAtc._id,
          tpCode: updatedAtc.tpCode,
          type: "credit",
          amount: finalAmount,
          requestedAmount: walletRequest.amount,
          adminRemark: String(adminRemark || "").trim(),
          reason: "Wallet request approved by admin",
        });
      }
    } else {
      walletRequest.status = "rejected";
      walletRequest.adminRemark = String(adminRemark || "").trim();
      walletRequest.processedAt = new Date();
    }

    await walletRequest.save();
    return NextResponse.json({ message: `Request ${action}d successfully`, request: walletRequest });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
