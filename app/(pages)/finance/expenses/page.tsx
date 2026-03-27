// app/expense/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { resolveActiveShop } from "@/lib/active-shop";
import ExpenseView from "./_components/ExpenseView";

export default async function ExpensePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { activeShopId, activeShop, isStaff, isAdmin } = await resolveActiveShop(
    session.user.id
  );

  // Resolve current user's display name
  const userProfile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { fullName: true },
  });
  const currentUserName =
    userProfile?.fullName ?? session.user.name ?? session.user.email ?? "You";

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const where = { shopId: activeShopId };

  const [expensesRaw, todayTotal, weekTotal, monthTotal, yearTotal] = await Promise.all([
    prisma.expense.findMany({
      where,
      select: {
        id: true,
        description: true,
        amount: true,
        category: true,
        paidById: true,
        shopId: true,
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

  // Resolve paidBy names
  const userIds = [...new Set(expensesRaw.map((e) => e.paidById))];
  const profiles = await prisma.profile.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, fullName: true },
  });
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const nameMap: Record<string, string> = {};
  userIds.forEach((uid) => {
    const p = profiles.find((x) => x.userId === uid);
    const u = users.find((x) => x.id === uid);
    nameMap[uid] = p?.fullName ?? u?.name ?? u?.email ?? uid;
  });

  const wallet = await prisma.wallet.findUnique({
    where: { shopId: activeShopId },
    select: { balance: true },
  });
  const walletBalance = wallet?.balance ?? 0;

  const expenses = expensesRaw.map((e) => ({
    id: e.id,
    description: e.description,
    amount: e.amount,
    category: e.category ?? null,
    paidById: e.paidById,
    paidByName: nameMap[e.paidById] ?? "—",
    shop: e.shop.name,
    shopId: e.shopId,
    date: e.createdAt.toISOString().split("T")[0],
  }));

  return (
    <ExpenseView
      activeShop={activeShop}
      isStaff={isStaff}
      isAdmin={isAdmin}
      walletBalance={walletBalance}
      currentUserName={currentUserName}
      stats={{
        today: { count: todayTotal._count, amount: todayTotal._sum.amount ?? 0 },
        week: { count: weekTotal._count, amount: weekTotal._sum.amount ?? 0 },
        month: { count: monthTotal._count, amount: monthTotal._sum.amount ?? 0 },
        year: { count: yearTotal._count, amount: yearTotal._sum.amount ?? 0 },
        total: { count: expenses.length, amount: expenses.reduce((s, e) => s + e.amount, 0) },
      }}
      expenses={expenses}
    />
  );
}