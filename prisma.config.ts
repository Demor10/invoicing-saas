import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 moved CLI-side config (used by `prisma migrate`, `prisma generate`,
// `prisma studio`, etc.) out of schema.prisma and into this file. This is
// separate from the runtime connection the app itself uses (see
// src/lib/prisma.ts), which goes through a driver adapter instead.
//
// Migrations need a *direct* connection, not the pgBouncer/pooled one — using
// the pooled URL here causes cryptic migration failures on Supabase.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DIRECT_URL"),
    directUrl: env("DIRECT_URL"),
  },
});
