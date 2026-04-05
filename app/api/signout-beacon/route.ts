// app/api/signout-beacon/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    const tokenCookie =
      cookieStore.get("__Secure-next-auth.session-token") ??
      cookieStore.get("next-auth.session-token");

    // Delete the DB session so it's globally invalid immediately
    if (tokenCookie?.value) {
      await prisma.session.deleteMany({
        where: { sessionToken: tokenCookie.value },
      });
    }

    // Beacon requests don't follow redirects — just return 200
    // The client-side signOut() call handles the actual redirect
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("Signout beacon error:", error);
    return new NextResponse(null, { status: 200 }); // always 200 for beacon
  }
}

export async function GET() {
  return new NextResponse(null, { status: 405 });
}