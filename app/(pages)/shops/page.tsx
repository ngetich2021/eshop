// app/shops/page.tsx
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import ShopsClient from "./_components/ShopsClient";

export const revalidate = 1;

export default async function ShopsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="text-xl text-gray-700">Please sign in to view shops.</p>
      </div>
    );
  }

  const userId = session.user.id;

  const userProfile = await prisma.profile.findUnique({
    where: { userId },
    select: { role: true },
  });

  const isAdmin = ["admin"].includes((userProfile?.role || "").toLowerCase().trim());

  const shops = await prisma.shop.findMany({
    where: isAdmin ? {} : { userId },
    select: {
      id: true,
      name: true,
      tel: true,
      location: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return <ShopsClient totalShops={shops.length} initialShops={shops} />;
}