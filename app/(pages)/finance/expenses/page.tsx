// app/expense/page.tsx
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import ExpenseView from "./_components/ExpenseView";

export default async function ExpensePage() {
  const session = await auth();
  if (!session?.user?.id)
    return <div className="min-h-screen flex items-center justify-center">Please sign in</div>;

  const userId = session.user.id;
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { role: true } });
  const isAdmin = profile?.role?.toLowerCase().trim() === "admin";

  const shops = await prisma.shop.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  const staffList = await prisma.staff.findMany({ select: { id: true, fullName: true }, orderBy: { fullName: "asc" } });

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay); startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const where = isAdmin ? {} : { shop: { userId } };

  const [expensesRaw, todayTotal, weekTotal, monthTotal, yearTotal] = await Promise.all([
    prisma.expense.findMany({
      where: isAdmin ? undefined : { shop: { userId } },
      select: {
        id: true, description: true, amount: true, category: true,
        paidById: true, shopId: true,
        shop: { select: { name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.expense.aggregate({ where: { ...where, createdAt: { gte: startOfDay } }, _sum: { amount: true }, _count: true }),
    prisma.expense.aggregate({ where: { ...where, createdAt: { gte: startOfWeek } }, _sum: { amount: true }, _count: true }),
    prisma.expense.aggregate({ where: { ...where, createdAt: { gte: startOfMonth } }, _sum: { amount: true }, _count: true }),
    prisma.expense.aggregate({ where: { ...where, createdAt: { gte: startOfYear } }, _sum: { amount: true }, _count: true }),
  ]);

  const expenses = expensesRaw.map((e) => ({
    id: e.id,
    description: e.description,
    amount: e.amount,
    category: e.category ?? null,
    paidById: e.paidById,
    shop: e.shop.name,
    shopId: e.shopId,
    date: e.createdAt.toISOString().split("T")[0],
  }));

  return (
    <ExpenseView
      stats={{
        today: { count: todayTotal._count, amount: todayTotal._sum.amount ?? 0 },
        week: { count: weekTotal._count, amount: weekTotal._sum.amount ?? 0 },
        month: { count: monthTotal._count, amount: monthTotal._sum.amount ?? 0 },
        year: { count: yearTotal._count, amount: yearTotal._sum.amount ?? 0 },
        total: { count: expenses.length, amount: expenses.reduce((s, e) => s + e.amount, 0) },
      }}
      expenses={expenses}
      shops={shops}
      staffList={staffList}
    />
  );
}