// middleware.ts
import { auth } from "@/auth";
import { NextResponse } from "next/server";

const protectedRoutes = [
  "/welcome",
  "/dashboard",
  "/dashboard/:path*",
  "/inventory",
  "/inventory/:path*",
  "/sales",
  "/sales/:path*",
  "/reports",
  "/reports/:path*",
  "/staff",
  "/staff/:path*",
   "/suppliers",
  "/suppliers/:path*",
   "/payments",
  "/payments/:path*",
    "/finance",
  "/finance/:path*",
   "/hr",
  "/hr/:path*",
   "/expenses",
  "/expenses/:path*",
  "/shop",
  "/shop/:path*",
  "/assets",
  "/assets/:path*",
  "/buys",
  "/buys/:path*",
];

const authorizedRoles = ["admin", "staff"];

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;

  // Helper: check if current path matches any protected route (exact or prefix)
  const isProtected = protectedRoutes.some((route) => {
    const base = route.replace("/:path*", "");
    return nextUrl.pathname === base || nextUrl.pathname.startsWith(`${base}/`);
  });

  if (!isProtected) {
    return NextResponse.next();
  }

  // Case 1: Not authenticated → redirect to login/home with optional "from" tracking
  if (!session?.user) {
    const loginUrl = new URL("/", nextUrl); // or "/login" if you move it
    loginUrl.searchParams.set("from", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Case 2: Authenticated but no admin role → FORCE sign-out
 if (!authorizedRoles.includes(session.user.role)){
    const signOutUrl = new URL("/api/auth/signout", nextUrl.origin);

    // After sign-out, try the original protected path again (user will need to pick correct account)
    signOutUrl.searchParams.set("callbackUrl", nextUrl.pathname + nextUrl.search);

    // Optional: add hint param for UI message on home page
    // signOutUrl.searchParams.set("reason", "no-access");

    return NextResponse.redirect(signOutUrl);
  }

  // Case 3: Good to go
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/welcome/:path*",
    "/dashboard/:path*",
    "/inventory/:path*",
    "/sales/:path*",
    "/reports/:path*",
    "/staff/:path*",
    "/suppliers/:path*",
    "/payments/:path*",
    "/labs/:path*",
    "/finance/:path*",
    "/expenses/:path*",
    "/hr/:path*",
    "/assets/:path*",
    "/shop/:path*",
    "/buys/:path*",
  ],
};