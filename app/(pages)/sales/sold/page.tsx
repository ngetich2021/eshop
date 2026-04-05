// app/sale/sold/page.tsx
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { resolveActiveShop } from "@/lib/active-shop";
import SaleView from "./_components/SaleView";

export default async function SalePage() {
  const session = await auth();
  if (!session?.user?.id)
    return <div className="min-h-screen flex items-center justify-center">Please sign in</div>;

  const userId = session.user.id;
  const { activeShopId, activeShop, isAdmin, canSell } = await resolveActiveShop(userId);

  const [profile, staffRecord] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId },
      select: { role: true, shopId: true, fullName: true },
    }),
    prisma.staff.findUnique({
      where: { userId },
      select: { id: true, fullName: true },
    }),
  ]);

  const allBrowsableShops = await prisma.shop.findMany({
    where: isAdmin ? undefined : {
      OR: [
        { userId },
        { staffs: { some: { userId } } },
      ],
    },
    select: { id: true, name: true, location: true, tel: true },
    orderBy: { name: "asc" },
  });

  const staffList = await prisma.staff.findMany({
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  const allProducts = await prisma.product.findMany({
    where: { shopId: { in: allBrowsableShops.map(s => s.id) } },
    select: {
      id: true, productName: true, sellingPrice: true, buyingPrice: true,
      discount: true, quantity: true, imageUrl: true, shopId: true,
      shop: { select: { name: true } },
    },
    orderBy: { productName: "asc" },
  });

  const now = new Date();
  const startOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek  = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear  = new Date(now.getFullYear(), 0, 1);

  const where = { shopId: activeShopId };

  const [salesRaw, todayAgg, weekAgg, monthAgg, yearAgg, paymentsRaw, creditsRaw] = await Promise.all([
    prisma.sale.findMany({
      where: { shopId: activeShopId },
      select: {
        id: true, soldById: true, totalAmount: true, paymentMethod: true,
        shopId: true,
        shop: { select: { name: true, location: true, tel: true } },
        saleItems: {
          select: {
            id: true, quantity: true, price: true, discount: true,
            product: { select: { productName: true } },
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.sale.aggregate({ where: { ...where, createdAt: { gte: startOfDay } },   _sum: { totalAmount: true }, _count: true }),
    prisma.sale.aggregate({ where: { ...where, createdAt: { gte: startOfWeek } },  _sum: { totalAmount: true }, _count: true }),
    prisma.sale.aggregate({ where: { ...where, createdAt: { gte: startOfMonth } }, _sum: { totalAmount: true }, _count: true }),
    prisma.sale.aggregate({ where: { ...where, createdAt: { gte: startOfYear } },  _sum: { totalAmount: true }, _count: true }),
    prisma.payment.findMany({
      where: { shopId: activeShopId },
      select: { id: true, amount: true, method: true, transactionCode: true },
    }),
    // Fetch credit records so we can attach them to sales on the receipt
    prisma.credit.findMany({
      where: { shopId: activeShopId },
      select: {
        id: true,
        amount: true,
        downPayment: true,
        dueDate: true,
        status: true,
        customerName: true,
        customerPhone: true,
        createdAt: true,
        creditPayments: {
          select: { amount: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Build splits map (keyed by sale.id)
  const splitsBySaleId: Record<string, { method: string; amount: number }[]> = {};
  for (const p of paymentsRaw) {
    const tc = p.transactionCode ?? "";
    if (!tc.startsWith("PAY-")) continue;
    const parts = tc.split("-");
    const saleIdSuffix = parts[1];
    if (!saleIdSuffix) continue;
    const sale = salesRaw.find(s => s.id.slice(-8).toUpperCase() === saleIdSuffix);
    if (!sale) continue;
    if (!splitsBySaleId[sale.id]) splitsBySaleId[sale.id] = [];
    splitsBySaleId[sale.id].push({ method: p.method, amount: p.amount });
  }

  // Build credit info map — match credit records to sales by time proximity + shop
  // (Credits are created in the same DB transaction as the sale, same shopId, close timestamp)
  // We match by: same shop, created within 5 seconds of the sale, and the credit.amount === sale.totalAmount
  const creditsBySaleId: Record<string, typeof creditsRaw[number]> = {};
  for (const sale of salesRaw) {
    const saleTime = sale.createdAt.getTime();
    const matched = creditsRaw.find(c => {
      const creditTime = c.createdAt.getTime();
      return Math.abs(creditTime - saleTime) < 10_000 && c.amount === sale.totalAmount;
    });
    if (matched) creditsBySaleId[sale.id] = matched;
  }

  const sales = salesRaw.map((s) => {
    const credit = creditsBySaleId[s.id] ?? null;
    const totalCreditPaymentsReceived = credit
      ? credit.creditPayments.reduce((sum, cp) => sum + cp.amount, 0)
      : 0;
    const remaining = credit
      ? Math.max(0, credit.amount - credit.downPayment - totalCreditPaymentsReceived)
      : 0;

    return {
      id: s.id,
      soldById: s.soldById,
      soldByName: staffList.find((st) => st.id === s.soldById)?.fullName ?? "Unknown",
      items: s.saleItems.map((si) => ({
        id: si.id,
        productName: si.product.productName,
        quantity: si.quantity,
        price: si.price,
        discount: si.discount,
      })),
      totalAmount: s.totalAmount,
      paymentMethod: s.paymentMethod,
      paymentSplits: splitsBySaleId[s.id] ?? [],
      // Customer info from the matched credit record (most reliable source)
      customerName: credit?.customerName ?? null,
      customerContact: credit?.customerPhone ?? null,
      shop: s.shop.name,
      shopLocation: s.shop.location ?? "",
      shopTel: s.shop.tel ?? "",
      shopId: s.shopId,
      date: s.createdAt.toISOString().split("T")[0],
      createdAt: s.createdAt.toISOString(),
      // Credit details for the receipt
      creditInfo: credit
        ? {
            amount: credit.amount,
            downPayment: credit.downPayment,
            dueDate: credit.dueDate?.toISOString() ?? null,
            status: credit.status,
            remaining,
          }
        : null,
    };
  });

  return (
    <SaleView
      stats={{
        today: { count: todayAgg._count, amount: todayAgg._sum.totalAmount ?? 0 },
        week:  { count: weekAgg._count,  amount: weekAgg._sum.totalAmount  ?? 0 },
        month: { count: monthAgg._count, amount: monthAgg._sum.totalAmount ?? 0 },
        year:  { count: yearAgg._count,  amount: yearAgg._sum.totalAmount  ?? 0 },
        total: { count: sales.length, amount: sales.reduce((s, sale) => s + sale.totalAmount, 0) },
      }}
      sales={sales}
      products={allProducts.map((p) => ({
        id: p.id, productName: p.productName, sellingPrice: p.sellingPrice,
        buyingPrice: p.buyingPrice ?? 0, discount: p.discount ?? 0, quantity: p.quantity,
        imageUrl: p.imageUrl ?? null, shopId: p.shopId, shopName: p.shop.name,
      }))}
      shops={allBrowsableShops}
      staffList={staffList}
      profile={{
        role: profile?.role ?? "user",
        shopId: activeShopId,
        fullName: staffRecord?.fullName ?? profile?.fullName ?? session.user.name ?? "Unknown",
      }}
      hasStaffRecord={!!staffRecord}
      canSell={canSell}
      activeShopId={activeShopId}
      activeShopName={activeShop.name}
      activeShopLocation={activeShop.location}
    />
  );
}