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
const args = process.argv.slice(2);

function getArg(key, fallback = undefined) {
  const index = args.indexOf(key);
  if (index !== -1 && index + 1 < args.length) {
    return args[index + 1];
  }
  return fallback;
}

function exitWithUsage() {
  console.log("Usage: node scripts/create-user.js --type <admin|atc> [options]");
  console.log("");
  console.log("Admin options:");
  console.log("  --type admin --username <username> --email <email> --password <password>");
  console.log("");
  console.log("ATC options:");
  console.log("  --type atc --tpCode <code> --trainingPartnerName <name> --email <email> --mobile <mobile> --password <password>");
  console.log("");
  process.exit(1);
}

async function main() {
  const type = getArg("--type");
  if (!type) {
    exitWithUsage();
  }

  if (type === "admin") {
    const username = getArg("--username");
    const email = getArg("--email");
    const password = getArg("--password");

    if (!username || !email || !password) {
      exitWithUsage();
    }

    await db.$connect();

    const existing = await db.adminUser.findFirst({
      where: {
        OR: [{ email: email.trim().toLowerCase() }, { username: username.trim() }],
      },
    });
    if (existing) {
      console.log("Admin user already exists:", existing.email || existing.username);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const admin = await db.adminUser.create({
      data: {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        password: hashedPassword,
      },
    });

    console.log("Created admin user:", admin.id, admin.email);
    process.exit(0);
  }

  if (type === "atc") {
    const tpCode = getArg("--tpCode");
    const trainingPartnerName = getArg("--trainingPartnerName");
    const email = getArg("--email");
    const mobile = getArg("--mobile");
    const password = getArg("--password");

    if (!tpCode || !trainingPartnerName || !email || !mobile || !password) {
      exitWithUsage();
    }

    await db.$connect();

    const existing = await db.atcUser.findFirst({
      where: {
        OR: [{ email: email.trim().toLowerCase() }, { tpCode: tpCode.trim() }],
      },
    });
    if (existing) {
      console.log("ATC user already exists:", existing.email || existing.tpCode);
      process.exit(0);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const atc = await db.atcUser.create({
      data: {
        tpCode: tpCode.trim(),
        trainingPartnerName: trainingPartnerName.trim(),
        email: email.trim().toLowerCase(),
        mobile: mobile.trim(),
        password: hashedPassword,
        zones: [],
      },
    });

    console.log("Created ATC user:", atc.id, atc.email);
    process.exit(0);
  }

  console.error("Unknown user type:", type);
  exitWithUsage();
}

main().catch((err) => {
  console.error("Error creating user:", err);
  process.exit(1);
});