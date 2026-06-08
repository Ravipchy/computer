import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { connectDB } from "@/lib/mongodb";
import { AtcUser } from "@/models/AtcUser";

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { tpCode?: string; password?: string };
    const { tpCode, password } = body;

    if (!tpCode?.trim() || !password?.trim()) {
      return NextResponse.json({ message: "TP Code and password are required." }, { status: 400 });
    }

    await connectDB();

    const user = await AtcUser.findOne({ tpCode: tpCode.trim().toUpperCase() });
    if (!user) {
      return NextResponse.json({ message: "Invalid TP Code or password." }, { status: 401 });
    }

    if (user.status === "disabled") {
      return NextResponse.json({ message: "Your center is disabled. Please contact the administrator." }, { status: 403 });
    }

    const isPlainMatch = password === user.password;
    const isHashMatch = user.password?.startsWith("$2b$") 
      ? await bcrypt.compare(password, user.password) 
      : false;
    
    if (!isPlainMatch && !isHashMatch) {
      return NextResponse.json({ message: "Invalid TP Code or password." }, { status: 401 });
    }

    const token = jwt.sign(
      { id: user._id.toString(), tpCode: user.tpCode, trainingPartnerName: user.trainingPartnerName, role: "atc" },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    const response = NextResponse.json({
      message: "Login successful.",
      token,
      user: {
        id: user._id.toString(),
        tpCode: user.tpCode,
        trainingPartnerName: user.trainingPartnerName,
        email: user.email,
        role: "atc"
      },
    });

    response.cookies.set("atc_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    // Clear any existing admin token to prevent session crossover
    response.cookies.delete("admin_token");

    return response;
  } catch (error) {
    console.error("[atc/login]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
