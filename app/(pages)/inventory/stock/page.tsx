// app/inventory/adjustStock/page.tsx
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import AdjustStockView from "./_components/AdjustStockView";

export default async function AdjustStockPage() {
  const session = await auth();
  if (!session?.user?.id)
    return <div className="min-h-screen flex items-center justify-center">Please sign in</div>;

  const userId = session.user.id;

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { role: true, shopId: true, fullName: true },
  });

  const isAdmin = profile?.role?.toLowerCase().trim() === "admin";

  const products = await prisma.product.findMany({
    select: { id: true, productName: true, quantity: true, sellingPrice: true },
    orderBy: { productName: "asc" },
  });

  const shops = await prisma.shop.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const raw = await prisma.adjustment.findMany({
    where: isAdmin ? undefined : { shop: { userId } },
    select: {
      id: true,
      adjustType: true,
      quantity: true,
      originalStock: true,
      newStockQty: true,
      value: true,
      adjustedBy: true,
      shopId: true,
      productId: true,
      product: { select: { productName: true } },
      shop: { select: { name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const adjustments = raw.map((a) => ({
    id: a.id,
    productName: a.product.productName,
    productId: a.productId,
    adjustType: a.adjustType,
    quantity: a.quantity,
    originalStock: a.originalStock ?? 0,
    newStockQty: a.newStockQty ?? 0,
    value: a.value ?? 0,
    adjustedBy: a.adjustedBy,
    shop: a.shop.name,
    shopId: a.shopId,
    date: a.createdAt.toISOString().split("T")[0],
  }));

  const totalValue = adjustments.reduce((sum, a) => sum + a.value, 0);

  return (
    <AdjustStockView
      stats={{ totalAdjustments: adjustments.length, totalValue }}
      adjustments={adjustments}
      products={products}
      shops={shops}
      profile={{
        role: profile?.role ?? "user",
        shopId: profile?.shopId ?? null,
        fullName: profile?.fullName ?? session.user.name ?? "Unknown",
      }}
    />
  );
}