import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 requires a driver adapter at runtime instead of reading the
// connection URL from schema.prisma. We use the pooled connection here
// (DATABASE_URL) — migrations use the direct one instead, configured
// separately in prisma.config.ts.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Next.js dev mode hot-reloads modules, which would otherwise create a new
// PrismaClient (and a new DB connection pool) on every file change.
// Stashing it on `globalThis` in development avoids that.

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
