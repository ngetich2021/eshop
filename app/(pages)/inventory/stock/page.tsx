// app/inventory/adjustStock/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { resolveActiveShop } from "@/lib/active-shop";
import AdjustStockView from "./_components/AdjustStockView";

export const revalidate = 0;

export default async function AdjustStockPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { activeShopId, activeShop, isStaff, isAdmin } = await resolveActiveShop(
    session.user.id
  );

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { role: true, shopId: true, fullName: true },
  });

  // ── Products scoped to the active shop only ───────────────────────────────
  const products = await prisma.product.findMany({
    where: { shopId: activeShopId },
    select: { id: true, productName: true, quantity: true, sellingPrice: true },
    orderBy: { productName: "asc" },
  });

  // ── Shops list (admin may see all; staff/owner see only active shop) ──────
  const shops = isAdmin
    ? await prisma.shop.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
    : [{ id: activeShop.id, name: activeShop.name }];

  // ── Adjustments scoped to the active shop ─────────────────────────────────
  const raw = await prisma.adjustment.findMany({
    where: { shopId: activeShopId },
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

  // ── Returns scoped to the active shop ────────────────────────────────────
  const rawReturns = await prisma.return.findMany({
    where: { shopId: activeShopId },
    select: {
      id: true,
      saleId: true,
      reason: true,
      status: true,
      returnedById: true,
      shopId: true,
      createdAt: true,
      shop: { select: { name: true } },
      returnItems: {
        select: {
          id: true,
          quantity: true,
          price: true,
          reason: true,
          product: { select: { id: true, productName: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const returns = rawReturns.map((r) => ({
    id: r.id,
    saleId: r.saleId ?? null,
    reason: r.reason ?? "",
    status: r.status,
    returnedById: r.returnedById,
    shopId: r.shopId,
    shopName: r.shop.name,
    date: r.createdAt.toISOString().split("T")[0],
    totalQty: r.returnItems.reduce((s, i) => s + i.quantity, 0),
    totalValue: r.returnItems.reduce((s, i) => s + i.price * i.quantity, 0),
    items: r.returnItems.map((i) => ({
      id: i.id,
      productId: i.product.id,
      productName: i.product.productName,
      quantity: i.quantity,
      price: i.price,
      reason: i.reason ?? "",
    })),
  }));

  // ── Sales for return linking ──────────────────────────────────────────────
  const sales = await prisma.sale.findMany({
    where: { shopId: activeShopId },
    select: { id: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const totalValue = adjustments.reduce((sum, a) => sum + a.value, 0);
  const totalReturnValue = returns.reduce((sum, r) => sum + r.totalValue, 0);

  return (
    <AdjustStockView
      activeShop={activeShop}
      activeShopId={activeShopId}
      isStaff={isStaff}
      isAdmin={isAdmin}
      stats={{
        totalAdjustments: adjustments.length,
        totalValue,
        totalReturns: returns.length,
        totalReturnValue,
        pendingReturns: returns.filter((r) => r.status === "pending").length,
      }}
      adjustments={adjustments}
      returns={returns}
      sales={sales.map((s) => ({
        id: s.id,
        label: `Sale — ${s.createdAt.toISOString().split("T")[0]}`,
      }))}
      products={products}
      shops={shops}
      profile={{
        role: profile?.role ?? "user",
        shopId: activeShopId,
        fullName: profile?.fullName ?? session.user.name ?? "Unknown",
      }}
    />
  );
}