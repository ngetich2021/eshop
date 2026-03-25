// src/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma";

// Extend NextAuth types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
    };
  }

  interface User {
    id: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
  }
}

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma as unknown as Parameters<typeof PrismaAdapter>[0]),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  events: {
    async createUser({ user }) {
      if (!user.id) return;

      await prisma.profile.upsert({
        where: { userId: user.id },
        update: {
          email: user.email ?? null, // Sync email on first creation (in case of future changes)
        },
        create: {
          userId: user.id,
          role: "user",
          email: user.email ?? null, // Copy email at creation time
        },
      });

      console.log("🔥 New user profile created with email sync:", user.id);
    },
  },

  callbacks: {
    async session({ session, user }) {
      if (!user?.id || !session.user) return session;

      // Upsert profile to ensure it exists and email is always in sync
      const profile = await prisma.profile.upsert({
        where: { userId: user.id },
        update: {
          email: user.email ?? null, // Keep profile.email in sync whenever session is fetched
        },
        create: {
          userId: user.id,
          role: "user",
          email: user.email ?? null,
        },
        select: {
          role: true,
          email: true, // optional: if you want to use profile.email instead
        },
      });

      // Attach required fields to session
      session.user.id = user.id;
      session.user.role = profile.role ?? "user";

      // Use the freshest data: prefer user table (updated by provider), fallback to session
      session.user.email = user.email ?? session.user.email;
      session.user.name = user.name ?? session.user.name;
      session.user.image = user.image ?? session.user.image;

      return session;
    },
  },
});