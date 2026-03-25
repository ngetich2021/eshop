// app/payments/page.tsx
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import PaymentsView from "./_components/PaymentsView";

export default async function PaymentsPage() {
  const session = await auth();
  if (!session?.user?.id)
    return <div className="min-h-screen flex items-center justify-center">Please sign in</div>;

  const userId = session.user.id;
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { role: true },
  });
  const isAdmin = profile?.role?.toLowerCase().trim() === "admin";

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const where = isAdmin ? {} : { shop: { userId } };

  const [salesRaw, todayAgg, weekAgg, monthAgg, yearAgg] = await Promise.all([
    prisma.sale.findMany({
      where: isAdmin ? undefined : { shop: { userId } },
      select: {
        id: true,
        totalAmount: true,
        paymentMethod: true,
        soldById: true,
        shopId: true,
        shop: { select: { name: true } },
        saleItems: {
          select: {
            quantity: true,
            product: { select: { productName: true } },
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.sale.aggregate({ where: { ...where, createdAt: { gte: startOfDay } }, _sum: { totalAmount: true }, _count: true }),
    prisma.sale.aggregate({ where: { ...where, createdAt: { gte: startOfWeek } }, _sum: { totalAmount: true }, _count: true }),
    prisma.sale.aggregate({ where: { ...where, createdAt: { gte: startOfMonth } }, _sum: { totalAmount: true }, _count: true }),
    prisma.sale.aggregate({ where: { ...where, createdAt: { gte: startOfYear } }, _sum: { totalAmount: true }, _count: true }),
  ]);

  // Aggregate by payment method for the summary breakdown
  const methodTotals = salesRaw.reduce<Record<string, number>>((acc, s) => {
    acc[s.paymentMethod] = (acc[s.paymentMethod] ?? 0) + s.totalAmount;
    return acc;
  }, {});

  const payments = salesRaw.map((s) => ({
    id: s.id,
    amount: s.totalAmount,
    method: s.paymentMethod,
    products: s.saleItems.map((si) => si.product.productName).join(", "),
    shop: s.shop.name,
    shopId: s.shopId,
    date: s.createdAt.toISOString().split("T")[0],
  }));

  return (
    <PaymentsView
      stats={{
        today: { count: todayAgg._count, amount: todayAgg._sum.totalAmount ?? 0 },
        week: { count: weekAgg._count, amount: weekAgg._sum.totalAmount ?? 0 },
        month: { count: monthAgg._count, amount: monthAgg._sum.totalAmount ?? 0 },
        year: { count: yearAgg._count, amount: yearAgg._sum.totalAmount ?? 0 },
        total: { count: payments.length, amount: payments.reduce((s, p) => s + p.amount, 0) },
      }}
      methodTotals={methodTotals}
      payments={payments}
    />
  );
}