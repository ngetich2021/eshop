// auth.ts  (project root)
// strategy:"database" means the session callback runs on EVERY request that
// reads the session, so role/shopId/allowedRoutes are always fresh from the DB.
import NextAuth          from "next-auth";
import Google            from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma            from "@/lib/prisma";

function parseRoutes(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as string[]; } catch { return []; }
  }
  return [];
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma as unknown as Parameters<typeof PrismaAdapter>[0]),
  providers: [
    Google({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "database",
    maxAge:   60 * 60 * 8, // 8 hours
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path:     "/",
        secure:   process.env.NODE_ENV === "production",
      },
    },
  },
  events: {
    async createUser({ user }) {
      if (!user.id) return;
      await prisma.profile.upsert({
        where:  { userId: user.id },
        update: { email: user.email ?? null },
        create: { userId: user.id, role: "user", email: user.email ?? null },
      });
    },
    async signIn({ user }) {
      if (!user.id) return;
      await prisma.loginLog.create({
        data: { userId: user.id, loginTime: new Date(), lastSeen: new Date(), duration: 0 },
      });
      await prisma.profile.upsert({
        where:  { userId: user.id },
        update: { email: user.email ?? null },
        create: { userId: user.id, role: "user", email: user.email ?? null },
      });
    },
  },
  callbacks: {
    async session({ session, user }) {
      if (!user?.id || !session.user) return session;

      // Fresh read every time — designation / allowedRoutes / shopId changes
      // in the admin panel take effect on the staff member's very next request.
      const profile = await prisma.profile.findUnique({
        where:  { userId: user.id },
        select: {
          role:          true,
          designation:   true,
          allowedRoutes: true,
          shopId:        true,
        },
      });

      // Keep login duration fresh
      const latestLog = await prisma.loginLog.findFirst({
        where:   { userId: user.id },
        orderBy: { loginTime: "desc" },
      });
      if (latestLog) {
        const now = new Date();
        await prisma.loginLog.update({
          where: { id: latestLog.id },
          data: {
            lastSeen: now,
            duration: Math.floor(
              (now.getTime() - latestLog.loginTime.getTime()) / 1000
            ),
          },
        });
      }

      session.user.id            = user.id;
      session.user.role          = profile?.role        ?? "user";
      session.user.designation   = profile?.designation ?? null;
      session.user.shopId        = profile?.shopId      ?? null;
      // allowedRoutes is String[] in Prisma — parseRoutes handles both
      // native arrays (from Prisma) and JSON strings (legacy data)
      session.user.allowedRoutes = parseRoutes(
        (profile as { allowedRoutes?: unknown })?.allowedRoutes
      );

      return session;
    },
  },
});