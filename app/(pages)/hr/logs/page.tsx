import { auth } from "@/auth";
import { redirect} from "next/navigation";
import prisma from "@/lib/prisma";
import { resolveActiveShop } from "@/lib/active-shop";
import { logActivity } from "@/lib/log-activity";
import LogsClient from "./_components/Logsclient";

export default async function LogsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Log this page visit directly from the server component
  await logActivity(session.user.id, "/logs", "GET");

  const { activeShop } = await resolveActiveShop(session.user.id);

  // ── LoginLogs ──────────────────────────────────────────────────────────────
  const rawLogin = await prisma.loginLog.findMany({
    orderBy: { loginTime: "desc" },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  const logs = rawLogin.map((log) => ({
    id: log.id,
    userId: log.userId,
    loginTime: log.loginTime.toISOString(),
    lastSeen: log.lastSeen.toISOString(),
    duration: log.duration ?? 0,
    user: {
      id: log.user.id,
      name: log.user.name ?? "Unknown",
      email: log.user.email ?? "—",
      image: log.user.image ?? null,
    },
  }));

  // ── ActivityLogs ───────────────────────────────────────────────────────────
  const rawActivity = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  const activityLogs = rawActivity.map((a) => ({
    id: a.id,
    userId: a.userId,
    action: a.action,
    path: a.path,
    method: a.method,
    createdAt: a.createdAt.toISOString(),
    user: {
      id: a.user.id,
      name: a.user.name ?? "Unknown",
      email: a.user.email ?? "—",
      image: a.user.image ?? null,
    },
  }));

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalSessions = logs.length;
  const longSessions = logs.filter((l) => l.duration > 3600).length;
  const nonZero = logs.filter((l) => l.duration > 0);
  const avgDuration = nonZero.length
    ? Math.round(nonZero.reduce((a, b) => a + b.duration, 0) / nonZero.length)
    : 0;

  return (
    <LogsClient
      activeShop={activeShop}
      stats={{ totalSessions, longSessions, avgDuration }}
      logs={logs}
      activityLogs={activityLogs}
    />
  );
}