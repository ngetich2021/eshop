// app/credit/page.tsx
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import CreditView from "./_components/CreditView";

export default async function CreditPage() {
  const session = await auth();
  if (!session?.user?.id)
    return <div className="min-h-screen flex items-center justify-center">Please sign in</div>;

  const userId = session.user.id;
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { role: true } });
  const isAdmin = profile?.role?.toLowerCase().trim() === "admin";

  const shops = await prisma.shop.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const where = isAdmin ? {} : { shop: { userId } };

  const [raw, todayAgg, weekAgg, monthAgg, yearAgg] = await Promise.all([
    prisma.credit.findMany({
      where: isAdmin ? undefined : { shop: { userId } },
      select: {
        id: true, amount: true, downPayment: true, dueDate: true, status: true,
        shopId: true, shop: { select: { name: true } }, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.credit.aggregate({ where: { ...where, createdAt: { gte: startOfDay } }, _sum: { amount: true, downPayment: true }, _count: true }),
    prisma.credit.aggregate({ where: { ...where, createdAt: { gte: startOfWeek } }, _sum: { amount: true, downPayment: true }, _count: true }),
    prisma.credit.aggregate({ where: { ...where, createdAt: { gte: startOfMonth } }, _sum: { amount: true, downPayment: true }, _count: true }),
    prisma.credit.aggregate({ where: { ...where, createdAt: { gte: startOfYear } }, _sum: { amount: true, downPayment: true }, _count: true }),
  ]);

  const credits = raw.map((c) => ({
    id: c.id,
    amount: c.amount,
    downPayment: c.downPayment,
    due: c.amount - c.downPayment,
    dueDate: c.dueDate ? c.dueDate.toISOString().split("T")[0] : null,
    status: c.status,
    shop: c.shop.name,
    shopId: c.shopId,
    date: c.createdAt.toISOString().split("T")[0],
  }));

  const mkStat = (agg: typeof todayAgg) => ({
    count: agg._count,
    added: agg._sum.amount ?? 0,
    paid: agg._sum.downPayment ?? 0,
    due: (agg._sum.amount ?? 0) - (agg._sum.downPayment ?? 0),
  });

  return (
    <CreditView
      stats={{ today: mkStat(todayAgg), week: mkStat(weekAgg), month: mkStat(monthAgg), year: mkStat(yearAgg), total: mkStat({ _count: credits.length, _sum: { amount: credits.reduce((s, c) => s + c.amount, 0), downPayment: credits.reduce((s, c) => s + c.downPayment, 0) } }) }}
      credits={credits}
      shops={shops}
    />
  );
}