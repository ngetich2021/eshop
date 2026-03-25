// app/sale/quote/page.tsx
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import QuoteView from "./_components/QuoteView";

export default async function QuotePage() {
  const session = await auth();
  if (!session?.user?.id)
    return <div className="min-h-screen flex items-center justify-center">Please sign in</div>;

  const userId = session.user.id;

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

  const isAdmin = profile?.role?.toLowerCase().trim() === "admin";

  const [products, shops, staffList] = await Promise.all([
    prisma.product.findMany({
      where: isAdmin ? undefined : { shop: { userId } },
      select: {
        id: true,
        productName: true,
        sellingPrice: true,
        buyingPrice: true,
        discount: true,
        quantity: true,
        imageUrl: true,
        shopId: true,
        shop: { select: { name: true } },
      },
      orderBy: { productName: "asc" },
    }),
    prisma.shop.findMany({
      where: isAdmin ? undefined : { userId },
      select: { id: true, name: true, location: true, tel: true },
      orderBy: { name: "asc" },
    }),
    prisma.staff.findMany({
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const where = isAdmin ? {} : { shop: { userId } };

  const [quotesRaw, todayAgg, weekAgg, monthAgg, yearAgg] = await Promise.all([
    prisma.quote.findMany({
      where: isAdmin ? undefined : { shop: { userId } },
      select: {
        id: true,
        soldById: true,
        amount: true,
        customerName: true,
        customerContact: true,
        shopId: true,
        shop: { select: { name: true, location: true, tel: true } },
        quoteItems: {
          select: {
            id: true,
            quantity: true,
            price: true,
            discount: true,
            product: { select: { productName: true } },
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.quote.aggregate({ where: { ...where, createdAt: { gte: startOfDay } }, _sum: { amount: true }, _count: true }),
    prisma.quote.aggregate({ where: { ...where, createdAt: { gte: startOfWeek } }, _sum: { amount: true }, _count: true }),
    prisma.quote.aggregate({ where: { ...where, createdAt: { gte: startOfMonth } }, _sum: { amount: true }, _count: true }),
    prisma.quote.aggregate({ where: { ...where, createdAt: { gte: startOfYear } }, _sum: { amount: true }, _count: true }),
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
        week: { count: weekAgg._count, amount: weekAgg._sum.amount ?? 0 },
        month: { count: monthAgg._count, amount: monthAgg._sum.amount ?? 0 },
        year: { count: yearAgg._count, amount: yearAgg._sum.amount ?? 0 },
        total: { count: quotes.length, amount: quotes.reduce((s, q) => s + q.amount, 0) },
      }}
      quotes={quotes}
      products={products.map((p) => ({
        id: p.id,
        productName: p.productName,
        sellingPrice: p.sellingPrice,
        buyingPrice: p.buyingPrice ?? 0,
        discount: p.discount ?? 0,
        quantity: p.quantity,
        imageUrl: p.imageUrl ?? null,
        shopId: p.shopId,
        shopName: p.shop.name,
      }))}
      shops={shops}
      staffList={staffList}
      profile={{
        role: profile?.role ?? "user",
        shopId: profile?.shopId ?? null,
        fullName: staffRecord?.fullName ?? profile?.fullName ?? session.user.name ?? "Unknown",
      }}
      hasStaffRecord={!!staffRecord}
    />
  );
}