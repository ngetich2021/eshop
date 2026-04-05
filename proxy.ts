// middleware.ts  (project root)
// ─────────────────────────────────────────────────────────────────────────────
// Rules:
//   • /dashboard        — always allowed for any authenticated user
//   • /api/auth/**      — always public (OAuth callbacks live here)
//   • admin role        — full access everywhere
//   • staff role        — allowed if pathname starts with one of their
//                         allowedRoutes prefixes (e.g. "/sales")
//   • user role / guest — redirect to /
// ─────────────────────────────────────────────────────────────────────────────
import { auth }         from "@/auth";
import { NextResponse } from "next/server";

// These paths are ALWAYS accessible — no permission check needed
const ALWAYS_ALLOWED = [
  "/",
  "/dashboard",   // ← staff must always reach the dashboard
  "/api/auth",    // ← OAuth callback chain
];

function isAlwaysAllowed(pathname: string): boolean {
  return ALWAYS_ALLOWED.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

function parseRoutes(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as string[]; } catch { return []; }
  }
  return [];
}

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Always pass through static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Always-allowed paths need no auth check
  if (isAlwaysAllowed(pathname)) {
    return NextResponse.next();
  }

  // Not signed in → home
  const session = req.auth;
  if (!session?.user) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const u             = session.user as { role?: string; allowedRoutes?: unknown };
  const role          = (u.role ?? "user").toLowerCase().trim();
  const allowedRoutes = parseRoutes(u.allowedRoutes);

  // Admin → unrestricted
  if (role === "admin") return NextResponse.next();

  // Non-staff (plain "user" account) → home
  if (role !== "staff") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Staff → allow only if pathname starts with one of their allowed prefixes
  const allowed = allowedRoutes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );

  if (allowed) return NextResponse.next();

  // Blocked — back to dashboard with flag (dashboard is always allowed above,
  // so this can never create a redirect loop)
  const url = req.nextUrl.clone();
  url.pathname = "/dashboard";
  url.searchParams.set("blocked", "1");
  return NextResponse.redirect(url);
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};