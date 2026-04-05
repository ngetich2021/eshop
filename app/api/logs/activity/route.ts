import { NextResponse } from "next/server";
import { logActivity } from "@/lib/log-activity";

export async function POST(req: Request) {
  try {
    const { userId, path, method } = await req.json();

    if (!userId || !path || !method) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await logActivity(userId, path, method);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Activity log route error:", error);
    return NextResponse.json({ error: "Logging failed" }, { status: 500 });
  }
}