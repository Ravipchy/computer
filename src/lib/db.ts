import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/**
 * PostgreSQL Database Connection via Prisma 7 with Direct Adapter
 * This replaces the previous MongoDB connection with Mongoose
 */

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);

export const db =
  globalForPrisma.prisma ||
  new PrismaClient({
    adapter,
    log: ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

export async function connectDB() {
  try {
    // Test connection
    await db.$queryRaw`SELECT 1`;
    console.log("✓ PostgreSQL connection successful");
    return db;
  } catch (err) {
    console.error("✗ PostgreSQL connection failed:", err);
    throw new Error(`DB_CONNECTION_FAILED: ${err instanceof Error ? err.message : "Unknown error"}`);
  }
}

export default db;
