// app/assets/page.tsx
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import AssetsView from "./_components/AssetsView";

export default async function AssetsPage() {
  const session = await auth();
  if (!session?.user?.id)
    return <div className="min-h-screen flex items-center justify-center">Please sign in</div>;

  const userId = session.user.id;
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { role: true } });
  const isAdmin = profile?.role?.toLowerCase().trim() === "admin";

  const shops = await prisma.shop.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });

  const raw = await prisma.asset.findMany({
    where: isAdmin ? undefined : { shop: { userId } },
    select: {
      id: true,
      itemName: true,
      imageUrl: true,
      cost: true,
      shopId: true,
      shop: { select: { name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const assets = raw.map((a) => ({
    id: a.id,
    itemName: a.itemName,
    imageUrl: a.imageUrl ?? null,
    cost: a.cost,
    shop: a.shop.name,
    shopId: a.shopId,
    date: a.createdAt.toISOString().split("T")[0],
  }));

  const totalCost = assets.reduce((sum, a) => sum + a.cost, 0);

  return (
    <AssetsView
      stats={{ totalAssets: assets.length, totalValue: totalCost }}
      assets={assets}
      shops={shops}
    />
  );
}