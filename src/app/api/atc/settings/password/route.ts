import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { AtcUser } from "@/models/AtcUser";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("atc_token")?.value;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { id: string, tpCode: string };
    
    const { oldPassword, newPassword } = await request.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ message: "Both old and new passwords are required." }, { status: 400 });
    }

    await connectDB();

    const user = await AtcUser.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ message: "ATC user not found." }, { status: 404 });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return NextResponse.json({ message: "Current password is incorrect." }, { status: 401 });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    user.password = hashed;
    await user.save();

    return NextResponse.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("[atc/settings/password]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
