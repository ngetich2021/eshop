// app/sale/quote/page.tsx
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { resolveActiveShop } from "@/lib/active-shop";
import QuoteView from "./_components/QuoteView";

export default async function QuotePage() {
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

  const shopFilter = { shopId: activeShopId };

  const [quotesRaw, todayAgg, weekAgg, monthAgg, yearAgg] = await Promise.all([
    prisma.quote.findMany({
      where: shopFilter,
      select: {
        id: true, soldById: true, amount: true, customerName: true, customerContact: true,
        shopId: true,
        shop: { select: { name: true, location: true, tel: true } },
        quoteItems: {
          select: {
            id: true, quantity: true, price: true, discount: true,
            product: { select: { productName: true } },
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.quote.aggregate({ where: { ...shopFilter, createdAt: { gte: startOfDay } },   _sum: { amount: true }, _count: true }),
    prisma.quote.aggregate({ where: { ...shopFilter, createdAt: { gte: startOfWeek } },  _sum: { amount: true }, _count: true }),
    prisma.quote.aggregate({ where: { ...shopFilter, createdAt: { gte: startOfMonth } }, _sum: { amount: true }, _count: true }),
    prisma.quote.aggregate({ where: { ...shopFilter, createdAt: { gte: startOfYear } },  _sum: { amount: true }, _count: true }),
  ]);

  const quotes = quotesRaw.map((q) => ({
    id: q.id,
    soldById: q.soldById,
    soldByName: staffList.find((s) => s.id === q.soldById)?.fullName ?? "Unknown",
    customerName: q.customerName,
    customerContact: q.customerContact,
    items: q.quoteItems.map((qi) => ({
      id: qi.id,
      productName: qi.product.productName,
      quantity: qi.quantity,
      price: qi.price,
      discount: qi.discount,
    })),
    amount: q.amount,
    shop: q.shop.name,
    shopLocation: q.shop.location ?? "",
    shopTel: q.shop.tel ?? "",
    shopId: q.shopId,
    date: q.createdAt.toISOString().split("T")[0],
    createdAt: q.createdAt.toISOString(),
  }));

  return (
    <QuoteView
      stats={{
        today: { count: todayAgg._count, amount: todayAgg._sum.amount ?? 0 },
        week:  { count: weekAgg._count,  amount: weekAgg._sum.amount  ?? 0 },
        month: { count: monthAgg._count, amount: monthAgg._sum.amount ?? 0 },
        year:  { count: yearAgg._count,  amount: yearAgg._sum.amount  ?? 0 },
        total: { count: quotes.length, amount: quotes.reduce((s, q) => s + q.amount, 0) },
      }}
      quotes={quotes}
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