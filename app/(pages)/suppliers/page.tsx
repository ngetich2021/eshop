import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { resolveActiveShop } from "@/lib/active-shop";
import SuppliersView from "./_components/SuppliersView";

export default async function SuppliersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { activeShopId, activeShop } = await resolveActiveShop(session.user.id);

  const raw = await prisma.supplier.findMany({
    where: { shopId: activeShopId },
    select: {
      id: true,
      name: true,
      contact1: true,
      contact2: true,
      goodsType: true,
      shopId: true,
      shop: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const suppliers = raw.map((s) => ({
    id: s.id,
    name: s.name,
    contact1: s.contact1,
    contact2: s.contact2 ?? null,
    goodsType: s.goodsType ?? null,
    shop: s.shop.name,
    shopId: s.shopId,
  }));

  return (
    <SuppliersView
      stats={{ totalSuppliers: suppliers.length }}
      suppliers={suppliers}
      activeShop={activeShop}
    />
  );
}