import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { config } from "./config";

let PrismaPg;
try {
  PrismaPg = require("@prisma/adapter-pg").PrismaPg;
} catch {
  PrismaPg = undefined;
}

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: config.database.ssl ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle database client", err);
});

const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

process.on("beforeExit", async () => {
  await prisma.$disconnect();
  await pool.end();
});
