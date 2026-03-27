// app/credit/page.tsx
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { resolveActiveShop } from "@/lib/active-shop";
import CreditView from "./_components/CreditView";

export const revalidate = 0;

export default async function CreditPage() {
  const session = await auth();
  if (!session?.user?.id)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Please sign in
      </div>
    );

  const userId = session.user.id;
  const { activeShopId, activeShop, isAdmin } = await resolveActiveShop(userId);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const shopFilter = { shopId: activeShopId };

  const [raw, todayAgg, weekAgg, monthAgg, yearAgg] = await Promise.all([
    prisma.credit.findMany({
      where: shopFilter,
      select: {
        id: true,
        amount: true,
        downPayment: true,
        dueDate: true,
        status: true,
        shopId: true,
        customerName: true,
        customerPhone: true,
        shop: { select: { name: true } },
        createdAt: true,
        creditPayments: {
          select: {
            id: true,
            amount: true,
            method: true,
            note: true,
            dueDate: true,
            paidAt: true,
            createdAt: true,
          },
          orderBy: { paidAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.credit.aggregate({
      where: { ...shopFilter, createdAt: { gte: startOfDay } },
      _sum: { amount: true, downPayment: true },
      _count: true,
    }),
    prisma.credit.aggregate({
      where: { ...shopFilter, createdAt: { gte: startOfWeek } },
      _sum: { amount: true, downPayment: true },
      _count: true,
    }),
    prisma.credit.aggregate({
      where: { ...shopFilter, createdAt: { gte: startOfMonth } },
      _sum: { amount: true, downPayment: true },
      _count: true,
    }),
    prisma.credit.aggregate({
      where: { ...shopFilter, createdAt: { gte: startOfYear } },
      _sum: { amount: true, downPayment: true },
      _count: true,
    }),
  ]);

  const credits = raw.map((c) => {
    const extraPaid = c.creditPayments.reduce((s, p) => s + p.amount, 0);
    const totalPaid = c.downPayment + extraPaid;
    const due = Math.max(0, c.amount - totalPaid);

    return {
      id: c.id,
      amount: c.amount,
      downPayment: c.downPayment,
      totalPaid,
      due,
      dueDate: c.dueDate ? c.dueDate.toISOString().split("T")[0] : null,
      status: c.status,
      shop: c.shop.name,
      shopId: c.shopId,
      customerName: c.customerName ?? null,
      customerPhone: c.customerPhone ?? null,
      date: c.createdAt.toISOString().split("T")[0],
      payments: c.creditPayments.map((p) => ({
        id: p.id,
        amount: p.amount,
        method: p.method,
        note: p.note ?? null,
        dueDate: p.dueDate ? p.dueDate.toISOString().split("T")[0] : null,
        paidAt: p.paidAt.toISOString().split("T")[0],
      })),
    };
  });

  const mkStat = (agg: typeof todayAgg) => ({
    count: agg._count,
    added: agg._sum.amount ?? 0,
    paid: agg._sum.downPayment ?? 0,
    due: (agg._sum.amount ?? 0) - (agg._sum.downPayment ?? 0),
  });

  const totalAdded = credits.reduce((s, c) => s + c.amount, 0);
  const totalPaidAll = credits.reduce((s, c) => s + c.totalPaid, 0);

  return (
    <CreditView
      activeShop={activeShop}
      isAdmin={isAdmin}
      stats={{
        today: mkStat(todayAgg),
        week: mkStat(weekAgg),
        month: mkStat(monthAgg),
        year: mkStat(yearAgg),
        total: {
          count: credits.length,
          added: totalAdded,
          paid: totalPaidAll,
          due: totalAdded - totalPaidAll,
        },
      }}
      credits={credits}
    />
  );
}