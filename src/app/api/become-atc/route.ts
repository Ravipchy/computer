import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { AtcApplication } from "@/models/AtcApplication";
import { resolveAffiliationFeeForPersist } from "@/lib/affiliationFee";
import { isValidIsoDate, normalizeIsoDate } from "@/lib/isoDate";

export async function POST(request: Request) {
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
      return NextResponse.json(
        { message: `Missing required field: ${field}` },
        { status: 400 },
      );
    }
  }

  const feeResolved = await resolveAffiliationFeeForPersist(
    formData.get("zones"),
    formData.get("affiliationYear"),
  );
  if (!feeResolved.ok) {
    return NextResponse.json({ message: feeResolved.error }, { status: feeResolved.status });
  }

  const mobile = String(formData.get("mobile") ?? "");
  const pin = String(formData.get("pin") ?? "");
  const email = String(formData.get("email") ?? "");

  if (!/^\d{10}$/.test(mobile)) {
    return NextResponse.json({ message: "Mobile must be exactly 10 digits." }, { status: 400 });
  }
  if (!/^\d{6}$/.test(pin)) {
    return NextResponse.json({ message: "PIN must be exactly 6 digits." }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ message: "Please enter a valid email address." }, { status: 400 });
  }

  const dobNormalized = normalizeIsoDate(formData.get("dob"));
  if (!isValidIsoDate(dobNormalized)) {
    return NextResponse.json(
      { message: "Date of birth must be a valid date (YYYY-MM-DD, year exactly 4 digits)." },
      { status: 400 },
    );
  }

  try {
    await connectDB();

    // Check for duplicate email
    const existing = await AtcApplication.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { message: "An application with this email already exists." },
        { status: 409 },
      );
    }

    // Handle files (convert to base64 for MongoDB storage)
    const fileFields = ["photo", "logo", "signature", "aadharDoc", "marksheetDoc", "otherDocs", "paymentScreenshot", "instituteDocument"];
    const base64Files: any = {};

    for (const field of fileFields) {
      const file = formData.get(field) as File | null;
      if (file && file.size > 0) {
        const isImage = file.type.startsWith("image/");
        const isPdf = file.type === "application/pdf";
        const sizeKb = file.size / 1024;

        if (isImage && sizeKb > 100) {
          return NextResponse.json({ message: `${field}: Image must be under 100KB.` }, { status: 400 });
        }
        if (isPdf && sizeKb > 500) {
          return NextResponse.json({ message: `${field}: PDF must be under 500KB.` }, { status: 400 });
        }
        if (!isImage && !isPdf && sizeKb > 500) {
          return NextResponse.json({ message: `${field}: File must be under 500KB.` }, { status: 400 });
        }

        const buffer = await file.arrayBuffer();
        base64Files[field] = `data:${file.type};base64,${Buffer.from(buffer).toString("base64")}`;
      }
    }

    const aadharNo = String(formData.get("aadharNo") ?? "").trim();
    const application = await AtcApplication.create({
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
      photo: base64Files.photo || "",
      logo: base64Files.logo || "",
      signature: base64Files.signature || "",
      aadharDoc: base64Files.aadharDoc || "",
      aadharNo,
      marksheetDoc: base64Files.marksheetDoc || "",
      otherDocs: base64Files.otherDocs || "",
      paymentMode: String(formData.get("paymentMode") ?? ""),
      paymentScreenshot: base64Files.paymentScreenshot || "",
      instituteDocument: base64Files.instituteDocument || "",
      infrastructure: String(formData.get("infrastructure") ?? "{}"),
      paidAmount: String(formData.get("paidAmount") ?? ""),
      transactionNo: String(formData.get("transactionNo") ?? ""),
      status: "pending",
      submittedByAdmin: false,
    });

    const refNumber = `ATC-${Date.now()}-${aadharNo || application._id.toString().slice(-6).toUpperCase()}`;
    return NextResponse.json({ message: "Application submitted successfully. We will review and contact you soon.", refNumber });
  } catch (error) {
    console.error("[become-atc POST]", error);
    return NextResponse.json({ message: "Failed to save application. Please try again." }, { status: 500 });
  }
}
