import type { NextAuthConfig } from "next-auth";

// This config is intentionally minimal — no Prisma adapter, no bcrypt, no
// providers with Node-only dependencies. It's used by middleware, which runs
// in Next.js's Edge Runtime and can't load native Node modules (that's what
// caused the "node:util/types" error: pulling in the Prisma/pg-backed config
// there). The full config with real providers lives in auth.ts, used only in
// API routes and server components (regular Node.js runtime).
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [], // real providers are registered in auth.ts, not here
} satisfies NextAuthConfig;
