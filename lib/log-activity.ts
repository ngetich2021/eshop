// lib/log-activity.ts
import prisma from "./prisma";

const actionMap: Record<string, string> = {
  GET: "VISIT",
  POST: "CREATE/OPERATE",
  PATCH: "UPDATE",
  PUT: "UPDATE",
  DELETE: "DELETE",
};

export async function logActivity(
  userId: string,
  path: string,
  method: string
) {
  try {
    const normalizedMethod = method?.toUpperCase() || "UNKNOWN";
    
    await prisma.activityLog.create({
      data: {
        userId,
        path,
        method: normalizedMethod,
        action: actionMap[normalizedMethod] ?? "UNKNOWN",
      },
    });
  } catch (err) {
    console.error("Activity log database error:", err);
  }
}

export function logPageVisit(userId: string, path: string) {
  // Fire-and-forget to avoid blocking the main thread
  logActivity(userId, path, "GET").catch(() => {});
}