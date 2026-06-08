import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { AtcApplication } from "@/models/AtcApplication";
import { AtcUser } from "@/models/AtcUser";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;

async function verifyAdmin() {
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

export async function POST(request: Request) {
  try {
    const admin = await verifyAdmin();
    if (!admin) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const { ids, action } = await request.json();
    if (!ids || !Array.isArray(ids) || !action) {
      return NextResponse.json({ message: "Invalid request" }, { status: 400 });
    }

    await connectDB();

    if (action === "delete") {
      await AtcUser.deleteMany({ applicationId: { $in: ids } });
      await AtcApplication.deleteMany({ _id: { $in: ids } });
      return NextResponse.json({ message: `${ids.length} centers deleted successfully` });
    } 
    else if (action === "disable") {
      await AtcUser.updateMany({ applicationId: { $in: ids } }, { $set: { status: "disabled" } });
      return NextResponse.json({ message: "Centers disabled successfully" });
    }
    else if (action === "reject") {
      const res = await AtcApplication.updateMany({ _id: { $in: ids }, status: "pending" }, { $set: { status: "rejected" } });
      return NextResponse.json({ message: `${res.modifiedCount} applications rejected successfully` });
    }
    else if (action === "approve") {
      const apps = await AtcApplication.find({ _id: { $in: ids }, status: "pending" });
      if (apps.length === 0) return NextResponse.json({ message: "No pending applications selected to approve." }, { status: 400 });
      const results = [];
      
      for (const app of apps) {
        app.status = "approved";
        const existingUser = await AtcUser.findOne({ email: app.email });
        let tpCode = app.tpCode;
        
        if (!existingUser) {
          let nextId = 1;
          const lastUser = await AtcUser.findOne().sort({ createdAt: -1 });
          if (lastUser?.tpCode) {
            const parts = lastUser.tpCode.split("-");
            if (parts.length === 3) nextId = parseInt(parts[2], 10) + 1;
          }
          
          const year = new Date().getFullYear();
          tpCode = `ATC-${year}-${String(isNaN(nextId) ? 1 : nextId).padStart(4, "0")}`;
          const finalPassword = app.mobile;
          
          await AtcUser.create({
            tpCode,
            trainingPartnerName: app.trainingPartnerName,
            email: app.email,
            mobile: app.mobile,
            password: finalPassword,
            applicationId: app._id,
            status: "active",
          });
        } else {
          tpCode = existingUser.tpCode;
        }
        
        app.tpCode = tpCode;
        await app.save();
        results.push({ id: app._id, tpCode });
      }
      return NextResponse.json({ message: `${results.length} centers approved successfully.` });
    }
    else if (action === "enable") {
      await AtcUser.updateMany({ applicationId: { $in: ids } }, { $set: { status: "active" } });
      return NextResponse.json({ message: "Centers enabled successfully" });
    }

    return NextResponse.json({ message: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
