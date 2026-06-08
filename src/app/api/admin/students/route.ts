import { NextResponse } from "next/server";
import { connectDB, db } from "@/lib/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

async function verifyAdmin(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get("admin_token")?.value;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    return decoded.role === "admin" ? decoded : null;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const admin = await verifyAdmin(request);
    if (!admin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    await connectDB();
    const students = await db.atcStudent.findMany({
      where: {
        OR: [
          { isDirectAdmission: false },
          {
            AND: [
              { isDirectAdmission: true },
              { status: { in: ["pending_admin", "approved", "active", "rejected"] } },
            ],
          },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    // Merge media (only photo to reduce payload)
    const studentsWithRealBalances = await Promise.all(students.map(async (s: any) => {
      const media = await db.studentMedia.findMany({
        where: { studentId: s.id, fieldName: "photo" },
        select: { fieldName: true, content: true },
      });
      const mediaMap: any = {};
      media.forEach((m: any) => { mediaMap[m.fieldName] = m.content; });
      
      const txs = await db.feeTransaction.findMany({ where: { studentId: s.id } });
      const totalPaid = txs.reduce((acc: number, t: any) => acc + (t.type === 'collect' ? t.amount : -t.amount), 0);
      const totalAdmission = s.totalFee || Number(s.admissionFees) || 0;

      return { 
        ...s, 
        ...mediaMap,
        totalFee: totalAdmission,
        paidAmount: totalPaid,
        duesAmount: totalAdmission - totalPaid
      };
    }));

    return NextResponse.json({ students: studentsWithRealBalances });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
