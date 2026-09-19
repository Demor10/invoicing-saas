import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Deliberately built from the edge-safe authConfig, NOT from "@/lib/auth" —
// that full config pulls in Prisma's pg driver, which can't run in
// middleware's Edge Runtime (see auth.config.ts for why).
const { auth } = NextAuth(authConfig);

// Public no matter what: the marketing/home page, login/signup, NextAuth's
// own routes, and the client-facing invoice/proposal pages (accessed via an
// unguessable token, no login required by design).
const PUBLIC_PATHS = ["/", "/login", "/signup"];
const PUBLIC_PREFIXES = ["/api/auth", "/api/register", "/invoice/", "/proposal/"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isPublic) return NextResponse.next();

  if (!req.auth) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  // Run on everything except static assets and Next internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
