// app/suppliers/page.tsx
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import SuppliersView from "./_components/SuppliersView";

export default async function SuppliersPage() {
  const session = await auth();
  if (!session?.user?.id)
    return <div className="min-h-screen flex items-center justify-center">Please sign in</div>;

  const userId = session.user.id;
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { role: true } });
  const isAdmin = profile?.role?.toLowerCase().trim() === "admin";

  const shops = await prisma.shop.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const raw = await prisma.supplier.findMany({
    where: isAdmin ? undefined : { shop: { userId } },
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
      shops={shops}
    />
  );
}