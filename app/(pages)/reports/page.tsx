// app/reports/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { resolveActiveShop } from "@/lib/active-shop";
import ReportsClientWrapper from "./_components/ReportsClientWrapper";

export const revalidate = 0;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; preset?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { activeShopId, activeShop } = await resolveActiveShop(session.user.id);
  const params = await searchParams;

  const now = new Date();
  const defaultFrom = `${now.getFullYear()}-01-01`;
  const defaultTo   = now.toISOString().split("T")[0];

  const fromStr   = params.from   ?? defaultFrom;
  const toStr     = params.to     ?? defaultTo;
  const presetStr = (params.preset ?? "year") as "today" | "week" | "month" | "year" | "custom";

  const fromDate = new Date(`${fromStr}T00:00:00.000Z`);
  const toDate   = new Date(`${toStr}T23:59:59.999Z`);

  const where = { shopId: activeShopId };
  const rangeWhere = { shopId: activeShopId, createdAt: { gte: fromDate, lte: toDate } };

  const [
    salesAgg, quotesAgg, paymentsAgg, expensesAgg,
    creditsAgg, advancesAgg, salariesAgg, payrollsAgg,
    buysAgg, adjustmentsAgg, assetsAgg, suppliersCount,
    staffCount, productCount, marginsAgg, transactionsAgg,
  ] = await Promise.all([
    prisma.sale.aggregate({ where: rangeWhere, _sum: { totalAmount: true }, _count: true }),
    prisma.quote.aggregate({ where: rangeWhere, _sum: { amount: true }, _count: true }),
    prisma.payment.aggregate({ where: rangeWhere, _sum: { amount: true }, _count: true }),
    prisma.expense.aggregate({ where: rangeWhere, _sum: { amount: true }, _count: true }),
    prisma.credit.aggregate({ where: rangeWhere, _sum: { amount: true, downPayment: true }, _count: true }),
    prisma.advance.aggregate({ where: rangeWhere, _sum: { amount: true }, _count: true }),
    prisma.salary.aggregate({ where: rangeWhere, _sum: { amount: true }, _count: true }),
    prisma.payroll.aggregate({ where: rangeWhere, _sum: { salary: true, payable: true }, _count: true }),
    prisma.buy.aggregate({ where: rangeWhere, _sum: { totalAmount: true, transportCost: true }, _count: true }),
    prisma.adjustment.aggregate({ where: rangeWhere, _count: true }),
    prisma.asset.aggregate({ where, _sum: { cost: true }, _count: true }), // assets = all-time
    prisma.supplier.count({ where }),
    prisma.staff.count({ where: { shopId: activeShopId } }),
    prisma.product.count({ where }),
    prisma.margin.aggregate({ where: rangeWhere, _sum: { value: true }, _count: true }),
    prisma.transaction.aggregate({ where: rangeWhere, _sum: { amount: true }, _count: true }),
  ]);

  // Monthly data (last 12 months) for chart
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const [monthlySalesRaw, monthlyExpensesRaw] = await Promise.all([
    prisma.sale.findMany({
      where: { ...where, createdAt: { gte: twelveMonthsAgo } },
      select: { totalAmount: true, createdAt: true },
    }),
    prisma.expense.findMany({
      where: { ...where, createdAt: { gte: twelveMonthsAgo } },
      select: { amount: true, createdAt: true },
    }),
  ]);

  const monthlyMap: Record<string, { sales: number; expenses: number }> = {};
  for (let i = 0; i < 12; i++) {
    const d = new Date(twelveMonthsAgo);
    d.setMonth(d.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap[key] = { sales: 0, expenses: 0 };
  }

  monthlySalesRaw.forEach(s => {
    const key = `${s.createdAt.getFullYear()}-${String(s.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyMap[key]) monthlyMap[key].sales += s.totalAmount;
  });
  monthlyExpensesRaw.forEach(e => {
    const key = `${e.createdAt.getFullYear()}-${String(e.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyMap[key]) monthlyMap[key].expenses += e.amount;
  });

  const monthlyData = Object.entries(monthlyMap).map(([month, data]) => ({
    month,
    label: new Date(month + "-01").toLocaleDateString("en-KE", { month: "short", year: "2-digit" }),
    sales: data.sales,
    expenses: data.expenses,
    profit: data.sales - data.expenses,
  }));

  const summary = {
    sales:        { count: salesAgg._count,        amount: salesAgg._sum.totalAmount ?? 0 },
    quotes:       { count: quotesAgg._count,        amount: quotesAgg._sum.amount ?? 0 },
    payments:     { count: paymentsAgg._count,      amount: paymentsAgg._sum.amount ?? 0 },
    expenses:     { count: expensesAgg._count,      amount: expensesAgg._sum.amount ?? 0 },
    credits:      { count: creditsAgg._count,       amount: creditsAgg._sum.amount ?? 0,  paid: creditsAgg._sum.downPayment ?? 0 },
    advances:     { count: advancesAgg._count,      amount: advancesAgg._sum.amount ?? 0 },
    salaries:     { count: salariesAgg._count,      amount: salariesAgg._sum.amount ?? 0 },
    payrolls:     { count: payrollsAgg._count,      salary: payrollsAgg._sum.salary ?? 0, payable: payrollsAgg._sum.payable ?? 0 },
    buys:         { count: buysAgg._count,          amount: buysAgg._sum.totalAmount ?? 0, fare: buysAgg._sum.transportCost ?? 0 },
    adjustments:  { count: adjustmentsAgg._count },
    assets:       { count: assetsAgg._count,        amount: assetsAgg._sum.cost ?? 0 },
    suppliers:    suppliersCount,
    staff:        staffCount,
    products:     productCount,
    margins:      { count: marginsAgg._count,       amount: marginsAgg._sum.value ?? 0 },
    transactions: { count: transactionsAgg._count,  amount: transactionsAgg._sum.amount ?? 0 },
  };

  return (
    <ReportsClientWrapper
      activeShop={activeShop}
      summary={summary}
      monthlyData={monthlyData}
      initialDateRange={{ preset: presetStr, from: fromStr, to: toStr }}
    />
  );
}