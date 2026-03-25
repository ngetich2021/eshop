import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import DashboardView from "./_components/DashboardView";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ shopId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const userId = session.user.id;
  const { shopId } = await searchParams;

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { role: true },
  });
  const isAdmin = profile?.role?.toLowerCase().trim() === "admin";

  const shopFilter = shopId
    ? { shopId }
    : isAdmin
    ? {}
    : { shop: { userId } };

  const shopWhere = shopId
    ? { id: shopId }
    : isAdmin
    ? undefined
    : { userId };

  const now = new Date();
  const startOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek  = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const twelveAgo = new Date();
  twelveAgo.setMonth(twelveAgo.getMonth() - 11);
  twelveAgo.setDate(1);
  twelveAgo.setHours(0, 0, 0, 0);

  const [
    user,
    shops,
    totalProducts,
    totalStaff,
    salesTotal,
    salesToday,
    salesWeek,
    salesMonth,
    expenseTotal,
    expenseToday,
    creditAgg,
    wallets,
    recentSalesRaw,
    recentExpensesRaw,
    monthlySalesRaw,
    monthlyExpensesRaw,
    advanceAgg,
    paymentAgg,
  ] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    }),

    prisma.shop.findMany({
      where: shopWhere,
      select: { id: true, name: true, location: true },
    }),

    prisma.product.count({
      where: shopId ? { shopId } : isAdmin ? undefined : { shop: { userId } },
    }),

    prisma.staff.count({
      where: shopId ? { shopId } : undefined,
    }),

    prisma.sale.aggregate({ where: shopFilter, _sum: { totalAmount: true }, _count: true }),
    prisma.sale.aggregate({ where: { ...shopFilter, createdAt: { gte: startOfDay } },   _sum: { totalAmount: true }, _count: true }),
    prisma.sale.aggregate({ where: { ...shopFilter, createdAt: { gte: startOfWeek } },  _sum: { totalAmount: true }, _count: true }),
    prisma.sale.aggregate({ where: { ...shopFilter, createdAt: { gte: startOfMonth } }, _sum: { totalAmount: true }, _count: true }),

    prisma.expense.aggregate({ where: shopFilter, _sum: { amount: true }, _count: true }),
    prisma.expense.aggregate({ where: { ...shopFilter, createdAt: { gte: startOfDay } }, _sum: { amount: true }, _count: true }),

    prisma.credit.aggregate({ where: shopFilter, _sum: { amount: true, downPayment: true }, _count: true }),

    prisma.wallet.findMany({
      where: shopId ? { shopId } : isAdmin ? undefined : { shop: { userId } },
      select: { balance: true, shopId: true, shop: { select: { name: true } } },
    }),

    prisma.sale.findMany({
      where: shopId ? { shopId } : isAdmin ? undefined : { shop: { userId } },
      select: {
        id: true, totalAmount: true, paymentMethod: true, shopId: true,
        shop: { select: { name: true } },
        saleItems: {
          select: { quantity: true, product: { select: { productName: true } } },
          take: 1,
        },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),

    prisma.expense.findMany({
      where: shopId ? { shopId } : isAdmin ? undefined : { shop: { userId } },
      select: {
        id: true, description: true, amount: true, category: true,
        shop: { select: { name: true } }, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),

    prisma.sale.findMany({
      where: { ...shopFilter, createdAt: { gte: twelveAgo } },
      select: { totalAmount: true, createdAt: true },
    }),

    prisma.expense.findMany({
      where: { ...shopFilter, createdAt: { gte: twelveAgo } },
      select: { amount: true, createdAt: true },
    }),

    prisma.advance.aggregate({ where: shopFilter, _sum: { amount: true }, _count: true }),

    prisma.payment.aggregate({
      where: { ...shopFilter, createdAt: { gte: startOfDay } },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const monthlyMap: Record<string, { sales: number; expenses: number }> = {};
  for (let i = 0; i < 12; i++) {
    const d = new Date(twelveAgo);
    d.setMonth(d.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap[key] = { sales: 0, expenses: 0 };
  }
  monthlySalesRaw.forEach((s) => {
    const key = `${s.createdAt.getFullYear()}-${String(s.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyMap[key]) monthlyMap[key].sales += s.totalAmount;
  });
  monthlyExpensesRaw.forEach((e) => {
    const key = `${e.createdAt.getFullYear()}-${String(e.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyMap[key]) monthlyMap[key].expenses += e.amount;
  });

  const monthlyData = Object.entries(monthlyMap).map(([month, data]) => ({
    month,
    label: new Date(month + "-01").toLocaleDateString("en-KE", { month: "short" }),
    sales: data.sales,
    expenses: data.expenses,
    profit: data.sales - data.expenses,
  }));

  const totalBalance       = wallets.reduce((s, w) => s + w.balance, 0);
  const totalSalesAmount   = salesTotal._sum.totalAmount ?? 0;
  const totalExpenseAmount = expenseTotal._sum.amount ?? 0;
  const netProfit          = totalSalesAmount - totalExpenseAmount;
  const creditDue          = (creditAgg._sum.amount ?? 0) - (creditAgg._sum.downPayment ?? 0);
  const selectedShop       = shopId ? shops.find((s) => s.id === shopId) : null;

  return (
    <DashboardView
      userName={user?.name ?? "User"}
      isAdmin={isAdmin}
      shops={shops}
      selectedShopName={selectedShop?.name}
      stats={{
        sales: {
          today: { count: salesToday._count, amount: salesToday._sum.totalAmount ?? 0 },
          week:  { count: salesWeek._count,  amount: salesWeek._sum.totalAmount  ?? 0 },
          month: { count: salesMonth._count, amount: salesMonth._sum.totalAmount ?? 0 },
          total: { count: salesTotal._count, amount: totalSalesAmount },
        },
        expenses: {
          today: { count: expenseToday._count, amount: expenseToday._sum.amount ?? 0 },
          total: { count: expenseTotal._count, amount: totalExpenseAmount },
        },
        totalProducts,
        totalStaff,
        netProfit,
        creditDue,
        totalBalance,
        advances:      { count: advanceAgg._count, amount: advanceAgg._sum.amount ?? 0 },
        paymentsToday: { count: paymentAgg._count, amount: paymentAgg._sum.amount ?? 0 },
      }}
      recentSales={recentSalesRaw.map((s) => ({
        id: s.id,
        productName: s.saleItems[0]?.product.productName ?? "Multiple items",
        totalItems: s.saleItems.reduce((sum, i) => sum + i.quantity, 0),
        amount: s.totalAmount,
        method: s.paymentMethod,
        shop: s.shop.name,
        date: s.createdAt.toISOString().split("T")[0],
        time: s.createdAt.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
      }))}
      recentExpenses={recentExpensesRaw.map((e) => ({
        id: e.id,
        description: e.description,
        amount: e.amount,
        category: e.category ?? "General",
        shop: e.shop.name,
        date: e.createdAt.toISOString().split("T")[0],
      }))}
      monthlyData={monthlyData}
      wallets={wallets.map((w) => ({
        balance: w.balance,
        shopName: w.shop.name,
        shopId: w.shopId,
      }))}
    />
  );
}