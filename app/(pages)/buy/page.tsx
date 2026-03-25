// app/buy/page.tsx
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import BuyView from "./_components/BuyView";

export default async function BuyPage() {
  const session = await auth();
  if (!session?.user?.id)
    return <div className="min-h-screen flex items-center justify-center">Please sign in</div>;

  const userId = session.user.id;
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { role: true } });
  const isAdmin = profile?.role?.toLowerCase().trim() === "admin";

  const suppliers = await prisma.supplier.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const shops = await prisma.shop.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const raw = await prisma.buy.findMany({
    where: isAdmin ? undefined : { shop: { userId } },
    select: {
      id: true,
      itemsJson: true,
      totalAmount: true,
      transportCost: true,
      status: true,
      shopId: true,
      supplierId: true,
      supplier: { select: { name: true } },
      shop: { select: { name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const buys = raw.map((b) => ({
    id: b.id,
    supplierName: b.supplier.name,
    supplierId: b.supplierId,
    itemsJson: b.itemsJson,
    totalAmount: b.totalAmount,
    transportCost: b.transportCost,
    status: b.status,
    shop: b.shop.name,
    shopId: b.shopId,
    date: b.createdAt.toISOString().split("T")[0],
  }));

  const totalAmount = buys.reduce((sum, b) => sum + b.totalAmount, 0);

  return (
    <BuyView
      stats={{ totalItems: buys.length, totalAmount }}
      buys={buys}
      suppliers={suppliers}
      shops={shops}
    />
  );
}