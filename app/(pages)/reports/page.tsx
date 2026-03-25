import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import ReportsView from "./_components/ReportsView";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user?.id)
    return <div className="min-h-screen flex items-center justify-center">Please sign in</div>;

  const userId = session.user.id;
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { role: true } });
  const isAdmin = profile?.role?.toLowerCase().trim() === "admin";
  const where = isAdmin ? {} : { shop: { userId } };

  const shops = await prisma.shop.findMany({
    where: isAdmin ? undefined : { userId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  // Aggregate all model counts and amounts
  const [
    salesAgg, quotesAgg, paymentsAgg, expensesAgg,
    creditsAgg, advancesAgg, salariesAgg, payrollsAgg,
    buysAgg, adjustmentsAgg, assetsAgg, suppliersAgg,
    staffCount, productCount, marginsAgg, transactionsAgg,
  ] = await Promise.all([
    prisma.sale.aggregate({ where, _sum: { totalAmount: true }, _count: true }),
    prisma.quote.aggregate({ where, _sum: { amount: true }, _count: true }),
    prisma.payment.aggregate({ where, _sum: { amount: true }, _count: true }),
    prisma.expense.aggregate({ where, _sum: { amount: true }, _count: true }),
    prisma.credit.aggregate({ where, _sum: { amount: true, downPayment: true }, _count: true }),
    prisma.advance.aggregate({ where, _sum: { amount: true }, _count: true }),
    prisma.salary.aggregate({ where, _sum: { amount: true }, _count: true }),
    prisma.payroll.aggregate({ where, _sum: { salary: true, payable: true }, _count: true }),
    prisma.buy.aggregate({ where, _sum: { totalAmount: true, transportCost: true }, _count: true }),
    prisma.adjustment.aggregate({ where, _count: true }),
    prisma.asset.aggregate({ where, _sum: { cost: true }, _count: true }),
    prisma.supplier.count({ where }),
    prisma.staff.count(),
    prisma.product.count({ where: isAdmin ? undefined : { shop: { userId } } }),
    prisma.margin.aggregate({ where, _sum: { value: true }, _count: true }),
    prisma.transaction.aggregate({ where, _sum: { amount: true }, _count: true }),
  ]);

  // Monthly sales for chart (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
  twelveMonthsAgo.setDate(1);
  twelveMonthsAgo.setHours(0, 0, 0, 0);

  const monthlySalesRaw = await prisma.sale.findMany({
    where: { ...where, createdAt: { gte: twelveMonthsAgo } },
    select: { totalAmount: true, createdAt: true },
  });

  const monthlyExpensesRaw = await prisma.expense.findMany({
    where: { ...where, createdAt: { gte: twelveMonthsAgo } },
    select: { amount: true, createdAt: true },
  });

  // Build monthly buckets
  const monthlyMap: Record<string, { sales: number; expenses: number }> = {};
  for (let i = 0; i < 12; i++) {
    const d = new Date(twelveMonthsAgo);
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
    label: new Date(month + "-01").toLocaleDateString("en-KE", { month: "short", year: "2-digit" }),
    sales: data.sales,
    expenses: data.expenses,
    profit: data.sales - data.expenses,
  }));

  return (
    <ReportsView
      shops={shops}
      summary={{
        sales: { count: salesAgg._count, amount: salesAgg._sum.totalAmount ?? 0 },
        quotes: { count: quotesAgg._count, amount: quotesAgg._sum.amount ?? 0 },
        payments: { count: paymentsAgg._count, amount: paymentsAgg._sum.amount ?? 0 },
        expenses: { count: expensesAgg._count, amount: expensesAgg._sum.amount ?? 0 },
        credits: { count: creditsAgg._count, amount: creditsAgg._sum.amount ?? 0, paid: creditsAgg._sum.downPayment ?? 0 },
        advances: { count: advancesAgg._count, amount: advancesAgg._sum.amount ?? 0 },
        salaries: { count: salariesAgg._count, amount: salariesAgg._sum.amount ?? 0 },
        payrolls: { count: payrollsAgg._count, salary: payrollsAgg._sum.salary ?? 0, payable: payrollsAgg._sum.payable ?? 0 },
        buys: { count: buysAgg._count, amount: buysAgg._sum.totalAmount ?? 0, fare: buysAgg._sum.transportCost ?? 0 },
        adjustments: { count: adjustmentsAgg._count },
        assets: { count: assetsAgg._count, amount: assetsAgg._sum.cost ?? 0 },
        suppliers: suppliersAgg,
        staff: staffCount,
        products: productCount,
        margins: { count: marginsAgg._count, amount: marginsAgg._sum.value ?? 0 },
        transactions: { count: transactionsAgg._count, amount: transactionsAgg._sum.amount ?? 0 },
      }}
      monthlyData={monthlyData}
    />
  );
}