import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { resolveActiveShop } from "@/lib/active-shop";
import BuyView from "./_components/BuyView";

export const revalidate = 0;

export default async function BuyPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { activeShopId, activeShop } = await resolveActiveShop(session.user.id);

  // Active user display name
  const [profile, staffRecord] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: session.user.id }, select: { fullName: true } }),
    prisma.staff.findFirst({ where: { userId: session.user.id, shopId: activeShopId }, select: { fullName: true } }),
  ]);
  const activeUserName = staffRecord?.fullName ?? profile?.fullName ?? session.user.name ?? "You";

  // Suppliers scoped to this shop (Updated Selection)
  const suppliers = await prisma.supplier.findMany({
    where: { shopId: activeShopId },
    select: { id: true, name: true, contact1: true, goodsType: true }, // Added new fields
    orderBy: { name: "asc" },
  });

  // All buys for active shop
  const raw = await prisma.buy.findMany({
    where: { shopId: activeShopId },
    include: {
      supplier: { select: { name: true, contact1: true } },
      shop: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Resolve buyer names
  const authorIds = Array.from(new Set(raw.map((b) => b.authorizeId).filter((id): id is string => !!id)));

  const [profiles, staffProfiles] = await Promise.all([
    prisma.profile.findMany({ where: { userId: { in: authorIds } }, select: { userId: true, fullName: true } }),
    prisma.staff.findMany({ where: { userId: { in: authorIds } }, select: { userId: true, fullName: true } }),
  ]);

  const nameMap: Record<string, string> = {};
  profiles.forEach(p => { if (p.userId) nameMap[p.userId] = p.fullName || "" });
  staffProfiles.forEach(s => { if (s.userId) nameMap[s.userId] = s.fullName || "" });

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
    buyerName: b.authorizeId ? (nameMap[b.authorizeId] ?? "Unknown") : "Unknown",
    date: b.createdAt.toISOString().split("T")[0],
  }));

  const totalAmount = buys.reduce((sum, b) => sum + b.totalAmount, 0);
  const totalTransport = buys.reduce((sum, b) => sum + b.transportCost, 0);

  return (
    <BuyView
      activeShop={activeShop}
      activeUserName={activeUserName}
      stats={{ totalItems: buys.length, totalAmount, totalTransport }}
      buys={buys}
      suppliers={suppliers}
    />
  );
}