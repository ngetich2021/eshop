import { PrismaClient } from "@/generated/prisma/client"; // Matches your new tsconfig
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

// 1. Setup the PostgreSQL Pool with safer timeouts
const pool = new Pool({ 
  connectionString,
  max: 10, 
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased to 10s to prevent the crash you saw
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ?? 
  new PrismaClient({ 
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;