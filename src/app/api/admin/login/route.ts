import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db, { connectDB } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ message: "Invalid JSON in request body." }, { status: 400 });
    }

    const { email, password } = body as { email?: string; password?: string };

    if (!email?.trim() || !password?.trim()) {
      return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
    }

    if (!JWT_SECRET) {
      return NextResponse.json({ message: "Server configuration error: Missing JWT_SECRET." }, { status: 500 });
    }

    await connectDB();

    const admin = await db.adminUser.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!admin) {
      return NextResponse.json({ message: "Invalid credentials." }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return NextResponse.json({ message: "Invalid credentials." }, { status: 401 });
    }

    const token = jwt.sign(
      { id: admin.id, username: admin.username, role: "admin" },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    const response = NextResponse.json({
      message: "Login successful.",
      token,
      user: { id: admin.id, username: admin.username, email: admin.email, role: "admin" },
    });

    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    // Clear any existing ATC token to prevent session crossover
    response.cookies.delete("atc_token");

    return response;
  } catch (error: any) {
    console.error("[admin/login] UNEXPECTED_ERROR:", error);
    return NextResponse.json({ 
      message: "Internal server error.",
      debug_info: `UNEXPECTED: ${error.message}`
    }, { status: 500 });
  }
}
