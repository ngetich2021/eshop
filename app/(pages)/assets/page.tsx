import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { resolveActiveShop } from "@/lib/active-shop";
import AssetsView from "./_components/AssetsView";
import { logPageVisit } from "@/lib/log-activity";

export default async function AssetsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  logPageVisit(session.user.id, "/assets");

  const { activeShopId, activeShop } = await resolveActiveShop(session.user.id);

  const raw = await prisma.asset.findMany({
    where: { shopId: activeShopId },
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
      activeShop={activeShop}
      stats={{ totalAssets: assets.length, totalValue: totalCost }}
      assets={assets}
      shopId={activeShopId}
    />
  );
}