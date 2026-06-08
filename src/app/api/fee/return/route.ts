import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { AtcStudent } from "@/models/Student";
import { FeeTransaction } from "@/models/FeeTransaction";
import { getAuthUser } from "@/utils/auth";

export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user || (user.role !== "admin" && user.role !== "atc")) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  
  try {
    const body = await request.json();
    const { studentId, date, receiptNo, paidFor, paymentMode, amount } = body;

    const student = await AtcStudent.findById(studentId);
    if (!student) {
      return NextResponse.json({ message: "Student not found" }, { status: 404 });
    }

    // ATC can only return for their own students
    if (user.role === "atc") {
      const isOwner = student.atcId?.toString() === user.id || student.tpCode === user.tpCode;
      if (!isOwner) return NextResponse.json({ message: "Forbidden: You can only manage fees for your own students." }, { status: 403 });
    }

    // Handle legacy students
    let currentTotal = student.totalFee;
    if (currentTotal === 0 && student.admissionFees) {
      currentTotal = Number(student.admissionFees) || 0;
      student.totalFee = currentTotal;
    }

    const transaction = await FeeTransaction.create({
      studentId,
      date,
      receiptNo,
      paidFor,
      paymentMode,
      amount: Number(amount),
      type: "return"
    });

    // Update student record by recalculating from all transactions
    const allTransactions = await FeeTransaction.find({ studentId }).lean();
    const totalPaid = allTransactions.reduce((acc: number, t: any) => acc + (t.type === 'collect' ? t.amount : -t.amount), 0);
    
    student.paidAmount = totalPaid;
    student.duesAmount = currentTotal - totalPaid;
    await student.save();

    return NextResponse.json({ message: "Fee returned successfully", transaction, student, totalPaid });
  } catch (error: any) {
    if (error.code === 11000) {
      return NextResponse.json({ message: "Receipt number already exists" }, { status: 400 });
    }
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
