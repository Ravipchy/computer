import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB, db } from "@/lib/db";
import { cookies } from "next/headers";
import { resolveAffiliationFeeForPersist } from "@/lib/affiliationFee";
import { isValidIsoDate, normalizeIsoDate } from "@/lib/isoDate";

const JWT_SECRET = process.env.JWT_SECRET as string;
export const dynamic = 'force-dynamic';

async function verifyAdmin(request: Request) {
  // Try cookie first (httpOnly), fallback to Authorization header (for client-side fetch)
  const cookieStore = await cookies();
  let token = cookieStore.get("admin_token")?.value ?? "";
  if (!token) {
    const auth = request.headers.get("Authorization") ?? "";
    token = auth.replace("Bearer ", "");
  }
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { role: string };
    if (decoded.role !== "admin") return null;
    return decoded;
  } catch {
    return null;
  }
}

// GET — list all applications
export async function GET(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  await connectDB();

  const applications = await db.atcApplication.findMany({
    orderBy: { createdAt: "desc" },
  });

  const users = await db.atcUser.findMany({
    select: {
      tpCode: true,
      email: true,
      applicationId: true,
      status: true,
      password: true,
    },
  });

  const tpCodeMap = new Map<string, string | undefined>();
  const emailMap = new Map<string, string | undefined>();
  const statusMap = new Map<string, string | undefined>();
  const passMap = new Map<string, string | undefined>();

  users.forEach((u: { tpCode?: string; email: string; applicationId?: string | null; status?: string; password?: string }) => {
    if (u.applicationId) {
      tpCodeMap.set(u.applicationId, u.tpCode);
      statusMap.set(u.applicationId, u.status);
      passMap.set(u.applicationId, u.password);
    }
    const emailKey = u.email.trim().toLowerCase();
    emailMap.set(emailKey, u.tpCode);
    statusMap.set(emailKey, u.status);
    passMap.set(emailKey, u.password);
  });

  const enrichedApps = applications.map((app: { id: string; email?: string | null; tpCode?: string | null }) => {
    const emailKey = (app.email ?? "").trim().toLowerCase();
    const appStatus = statusMap.get(app.id) || statusMap.get(emailKey) || "active";
    return {
      ...app,
      tpCode: app.tpCode || tpCodeMap.get(app.id) || emailMap.get(emailKey) || null,
      userStatus: appStatus,
      password: passMap.get(app.id) || passMap.get(emailKey) || null,
    };
  });

  return NextResponse.json({ applications: enrichedApps });
}

// POST — admin manually creates/submits an ATC application (directly approved)
export async function POST(request: Request) {
  const admin = await verifyAdmin(request);
  if (!admin) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

  try {
    const formData = await request.formData();

    const requiredFields = [
      "affiliationYear",
      "trainingPartnerName",
      "trainingPartnerAddress",
      "district",
      "state",
      "pin",
      "mobile",
      "email",
      "statusOfInstitution",
      "yearOfEstablishment",
      "chiefName",
      "designation",
      "educationQualification",
      "professionalExperience",
      "dob",
      "paymentMode",
    ];

    for (const field of requiredFields) {
      const value = String(formData.get(field) ?? "").trim();
      if (!value) {
        return NextResponse.json({ message: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const mobile = String(formData.get("mobile") ?? "");
    const pin = String(formData.get("pin") ?? "");
    const email = String(formData.get("email") ?? "").toLowerCase().trim();

    if (!/^\d{10}$/.test(mobile))
      return NextResponse.json({ message: "Mobile must be exactly 10 digits." }, { status: 400 });
    if (!/^\d{6}$/.test(pin))
      return NextResponse.json({ message: "PIN must be exactly 6 digits." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return NextResponse.json({ message: "Please enter a valid email address." }, { status: 400 });

    const dobNormalized = normalizeIsoDate(formData.get("dob"));
    if (!isValidIsoDate(dobNormalized)) {
      return NextResponse.json(
        { message: "Date of birth must be a valid date (YYYY-MM-DD, year exactly 4 digits)." },
        { status: 400 },
      );
    }

    const feeResolved = await resolveAffiliationFeeForPersist(
      formData.get("zones"),
      formData.get("affiliationYear"),
    );
    if (!feeResolved.ok) {
      return NextResponse.json({ message: feeResolved.error }, { status: feeResolved.status });
    }

    await connectDB();

    // Check if user already exists
    const existingUser = await db.atcUser.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ message: "An ATC user with this email already exists." }, { status: 400 });
    }

    // Handle files (convert to base64 for MongoDB storage)
    // Helper to read and check size
    const processFile = async (name: string, maxSizeKB: number) => {
      const file = formData.get(name) as File | null;
      if (!file || file.size === 0) return "";
      if (file.size > maxSizeKB * 1024) {
        throw new Error(`${name} exceeds ${maxSizeKB}KB limit.`);
      }
      const buffer = await file.arrayBuffer();
      return `data:${file.type};base64,${Buffer.from(buffer).toString("base64")}`;
    };

    let photoBase64 = "", logoBase64 = "", sigBase64 = "", aadharBase64 = "", marksheetBase64 = "", otherBase64 = "", ssBase64 = "", instDocBase64 = "";

    try {
      photoBase64 = await processFile("photo", 100);
      logoBase64 = await processFile("logo", 100);
      sigBase64 = await processFile("signature", 100);
      aadharBase64 = await processFile("aadharDoc", 500);
      marksheetBase64 = await processFile("marksheetDoc", 500);
      otherBase64 = await processFile("otherDocs", 500);
      ssBase64 = await processFile("paymentScreenshot", 100);
      instDocBase64 = await processFile("instituteDocument", 500);
    } catch (e: any) {
      return NextResponse.json({ message: e.message }, { status: 400 });
    }

    const data = {
      processFee: feeResolved.processFee,
      affiliationPlanYear: feeResolved.affiliationPlanYear,
      feeCalculation: feeResolved.feeCalculation,
      trainingPartnerName: String(formData.get("trainingPartnerName") ?? ""),
      trainingPartnerAddress: String(formData.get("trainingPartnerAddress") ?? ""),
      postalAddressOffice: String(formData.get("postalAddressOffice") ?? ""),
      zones: feeResolved.zones,
      totalName: String(formData.get("totalName") ?? ""),
      district: String(formData.get("district") ?? ""),
      state: String(formData.get("state") ?? ""),
      pin,
      country: String(formData.get("country") ?? "INDIA"),
      mobile,
      email,
      statusOfInstitution: String(formData.get("statusOfInstitution") ?? ""),
      yearOfEstablishment: String(formData.get("yearOfEstablishment") ?? ""),
      chiefName: String(formData.get("chiefName") ?? ""),
      designation: String(formData.get("designation") ?? ""),
      educationQualification: String(formData.get("educationQualification") ?? ""),
      professionalExperience: String(formData.get("professionalExperience") ?? ""),
      dob: dobNormalized,
      photo: photoBase64,
      logo: logoBase64,
      signature: sigBase64,
      aadharDoc: aadharBase64,
      marksheetDoc: marksheetBase64,
      otherDocs: otherBase64,
      paymentMode: String(formData.get("paymentMode") ?? ""),
      paymentScreenshot: ssBase64,
      instituteDocument: instDocBase64,
      infrastructure: String(formData.get("infrastructure") ?? "{}"),
      paidAmount: String(formData.get("paidAmount") ?? ""),
      transactionNo: String(formData.get("transactionNo") ?? ""),
      status: "approved" as const,
      submittedByAdmin: true,
    };

    const application = await db.atcApplication.create({ data });

    // Auto-generate ATC account
    let tpCode = String(formData.get("customTpCode") || "").trim();
    let rawPassword = String(formData.get("password") || formData.get("customPassword") || "").trim();

    if (!tpCode) {
      const { generateNextId } = await import("@/lib/idGenerator");
      tpCode = await generateNextId("reg_format_center");
    }

    const finalPassword = rawPassword || mobile;
    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    await db.atcUser.create({
      data: {
        tpCode,
        trainingPartnerName: application.trainingPartnerName,
        email: application.email,
        mobile: application.mobile,
        password: hashedPassword,
        applicationId: application.id,
        zones: data.zones,
        status: "active",
      },
    });

    await db.atcApplication.update({
      where: { id: application.id },
      data: { tpCode },
    });

    return NextResponse.json({ 
      message: "ATC Center added and approved successfully.", 
      tpCode, 
      mobile: finalPassword 
    }, { status: 201 });

  } catch (error: any) {
    console.error("[admin/applications POST]", error);
    return NextResponse.json({ message: error.message || "Internal server error." }, { status: 500 });
  }
}

