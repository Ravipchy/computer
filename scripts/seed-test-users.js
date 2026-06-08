#!/usr/bin/env node
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const { Pool } = require("pg");

dotenv.config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const db = new PrismaClient({ adapter });

async function main() {
  await db.$connect();

  const adminEmail = "admin@example.com";
  const adminUsername = "admin";
  const adminPassword = "Admin1234!";

  const existingAdmin = await db.adminUser.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const hashedAdminPassword = await bcrypt.hash(adminPassword, 12);
    await db.adminUser.create({
      data: {
        username: adminUsername,
        email: adminEmail,
        password: hashedAdminPassword,
      },
    });
    console.log(`Created admin user: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log(`Admin already exists: ${adminEmail}`);
  }

  const atcTpCode = "TP001";
  const atcEmail = "atc@example.com";
  const atcPassword = "Atc1234!";

  let atcUser = await db.atcUser.findUnique({ where: { tpCode: atcTpCode } });
  if (!atcUser) {
    const hashedAtcPassword = await bcrypt.hash(atcPassword, 12);
    atcUser = await db.atcUser.create({
      data: {
        tpCode: atcTpCode,
        trainingPartnerName: "Test Training Partner",
        email: atcEmail,
        mobile: "9999999999",
        password: hashedAtcPassword,
        zones: [],
      },
    });
    console.log(`Created ATC user: ${atcEmail} / ${atcPassword}`);
  } else {
    console.log(`ATC user already exists: ${atcEmail}`);
  }

  const studentEnrollment = "STU1001";
  const studentPassword = "Student123!";

  const existingStudent = await db.atcStudent.findUnique({ where: { enrollmentNo: studentEnrollment } });
  if (!existingStudent) {
    const hashedStudentPassword = await bcrypt.hash(studentPassword, 12);
    await db.atcStudent.create({
      data: {
        atcId: atcUser.id,
        tpCode: atcUser.tpCode,
        enrollmentNo: studentEnrollment,
        registrationNo: "REG1001",
        name: "Test Student",
        fatherName: "Test Father",
        motherName: "Test Mother",
        dob: "2000-01-01",
        gender: "Male",
        mobile: "8888888888",
        currentAddress: "123 Test Street, Test City",
        permanentAddress: "123 Test Street, Test City",
        course: "Computer Fundamentals",
        courseType: "Regular",
        session: "2025-2026",
        category: "General",
        admissionFees: "1000",
        admissionDate: "2025-06-01",
        password: hashedStudentPassword,
        status: "active",
        userStatus: "active",
      },
    });
    console.log(`Created student user: ${studentEnrollment} / ${studentPassword}`);
  } else {
    console.log(`Student already exists: ${studentEnrollment}`);
  }

  await db.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});