// app/wallet/margins/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { resolveActiveShop } from "@/lib/active-shop";
import MarginView from "./_components/MarginView";

export default async function MarginPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { activeShopId, activeShop, isStaff, isAdmin } = await resolveActiveShop(session.user.id);

  // ── SOLD STOCK: profit per sale item ──
  const rawSaleItems = await prisma.saleItem.findMany({
    where: { sale: { shopId: activeShopId } },
    select: {
      quantity: true,
      price: true,       // selling price at time of sale
      discount: true,
      product: { select: { buyingPrice: true } },
      sale: { select: { createdAt: true } },
    },
  });

  // Group into per-day buckets for charting
  const dayMap: Record<string, { profit: number; revenue: number; cost: number }> = {};
  let totalSoldProfit = 0;
  let totalSoldRevenue = 0;
  let totalSoldCost = 0;

  for (const item of rawSaleItems) {
    const effectiveSelling = item.price - (item.discount ?? 0);
    const itemRevenue = effectiveSelling * item.quantity;
    const itemCost = item.product.buyingPrice * item.quantity;
    const itemProfit = itemRevenue - itemCost;

    totalSoldRevenue += itemRevenue;
    totalSoldCost += itemCost;
    totalSoldProfit += itemProfit;

    const dateKey = item.sale.createdAt.toISOString().split("T")[0];
    if (!dayMap[dateKey]) dayMap[dateKey] = { profit: 0, revenue: 0, cost: 0 };
    dayMap[dateKey].profit += itemProfit;
    dayMap[dateKey].revenue += itemRevenue;
    dayMap[dateKey].cost += itemCost;
  }

  const saleItems = Object.entries(dayMap).map(([date, val]) => ({
    date,
    profit: val.profit,
    revenue: val.revenue,
    cost: val.cost,
  }));

  // ── CURRENT STOCK: present value ──
  const products = await prisma.product.findMany({
    where: { shopId: activeShopId },
    select: { sellingPrice: true, buyingPrice: true, quantity: true },
  });

  const currentStockValue = products.reduce((s, p) => s + p.sellingPrice * p.quantity, 0);
  const currentStockCost = products.reduce((s, p) => s + p.buyingPrice * p.quantity, 0);
  const currentStockProfit = currentStockValue - currentStockCost;

  return (
    <MarginView
      activeShop={activeShop}
      isStaff={isStaff}
      isAdmin={isAdmin}
      soldProfit={totalSoldProfit}
      soldRevenue={totalSoldRevenue}
      soldCost={totalSoldCost}
      currentStockValue={currentStockValue}
      currentStockCost={currentStockCost}
      currentStockProfit={currentStockProfit}
      saleItems={saleItems}
    />
  );
}