import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import db, { connectDB } from "@/lib/db";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id?: string; email?: string; role: string };
    if (decoded.role !== "admin") {
      return NextResponse.json({ message: "Forbidden." }, { status: 403 });
    }

    const { oldPassword, newPassword } = await request.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ message: "Both old and new passwords are required." }, { status: 400 });
    }

    await connectDB();

    const user = decoded.id
      ? await db.adminUser.findUnique({ where: { id: decoded.id } })
      : await db.adminUser.findUnique({ where: { email: decoded.email ?? "" } });
    if (!user) {
      return NextResponse.json({ message: "Admin user not found." }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return NextResponse.json({ message: "Current password is incorrect." }, { status: 401 });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await db.adminUser.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    return NextResponse.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("[admin/settings/password]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
