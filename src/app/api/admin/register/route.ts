import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db, { connectDB } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      username?: string;
      email?: string;
      password?: string;
    };

    const { username, email, password } = body;

    if (!username?.trim() || !email?.trim() || !password?.trim()) {
      return NextResponse.json({ message: "All fields are required." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "Password must be at least 6 characters." },
        { status: 400 },
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: "Please enter a valid email." }, { status: 400 });
    }

    await connectDB();

    const existing = await db.adminUser.findFirst({
      where: {
        OR: [{ email: email.trim().toLowerCase() }, { username: username.trim() }],
      },
    });
    if (existing) {
      return NextResponse.json(
        { message: "Username or email already taken." },
        { status: 409 },
      );
    }

    const hashed = await bcrypt.hash(password, 12);
    await db.adminUser.create({
      data: {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password: hashed,
      },
    });

    return NextResponse.json({ message: "Admin registered successfully." }, { status: 201 });
  } catch (error) {
    console.error("[admin/register]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
