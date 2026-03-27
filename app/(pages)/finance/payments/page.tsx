// app/payments/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { resolveActiveShop } from "@/lib/active-shop";
import PaymentsView from "./_components/PaymentsView";

export const revalidate = 0;

export default async function PaymentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { activeShopId, activeShop, isStaff, isAdmin } = await resolveActiveShop(
    session.user.id
  );

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const shopFilter = { shopId: activeShopId };

  const [
    salesRaw,
    todayAgg,
    weekAgg,
    monthAgg,
    yearAgg,
    totalAgg,
    creditPaymentsRaw,
    creditsRaw,
    totalTransferredOutAgg,
  ] = await Promise.all([
    // Sale payments (exclude raw credit sales so we don't double-count)
    prisma.sale.findMany({
      where: { ...shopFilter, paymentMethod: { not: "credit" } },
      select: {
        id: true,
        totalAmount: true,
        paymentMethod: true,
        shopId: true,
        shop: { select: { name: true } },
        saleItems: {
          select: { quantity: true, product: { select: { productName: true } } },
        },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    // Stats (all sales including credit for accurate totals)
    prisma.sale.aggregate({
      where: { ...shopFilter, createdAt: { gte: startOfDay } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { ...shopFilter, createdAt: { gte: startOfWeek } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { ...shopFilter, createdAt: { gte: startOfMonth } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { ...shopFilter, createdAt: { gte: startOfYear } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: shopFilter,
      _sum: { totalAmount: true },
    }),
    // Credit payments received (installments)
    prisma.creditPayment.findMany({
      where: shopFilter,
      select: {
        id: true,
        amount: true,
        method: true,
        note: true,
        paidAt: true,
        shopId: true,
        shop: { select: { name: true } },
        credit: {
          select: {
            id: true,
            amount: true,
            downPayment: true,
            creditPayments: { select: { amount: true } },
          },
        },
      },
      orderBy: { paidAt: "desc" },
    }),
    // All credits (for summaries and down payment totals)
    prisma.credit.findMany({
      where: shopFilter,
      select: {
        id: true,
        amount: true,
        downPayment: true,
        status: true,
        dueDate: true,
        shopId: true,
        shop: { select: { name: true } },
        createdAt: true,
        creditPayments: { select: { amount: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    // Transfers out
    prisma.transaction.aggregate({
      where: { shopId: activeShopId, name: "transfer_out" },
      _sum: { amount: true },
    }),
  ]);

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

  // Credit payments with received/total context
  const creditPayments = creditPaymentsRaw.map((cp) => {
    const totalPaid =
      cp.credit.downPayment +
      cp.credit.creditPayments.reduce((s, p) => s + p.amount, 0);
    return {
      id: cp.id,
      amount: cp.amount,
      method: cp.method,
      note: cp.note ?? null,
      paidAt: cp.paidAt.toISOString().split("T")[0],
      shop: cp.shop.name,
      shopId: cp.shopId,
      creditTotal: cp.credit.amount,
      creditTotalPaid: totalPaid,
    };
  });

  // Credit summary rows
  const creditSummaries = creditsRaw.map((c) => {
    const extraPaid = c.creditPayments.reduce((s, p) => s + p.amount, 0);
    const totalPaid = c.downPayment + extraPaid;
    return {
      id: c.id,
      amount: c.amount,
      totalPaid,
      due: Math.max(0, c.amount - totalPaid),
      status: c.status,
      dueDate: c.dueDate ? c.dueDate.toISOString().split("T")[0] : null,
      shop: c.shop.name,
      date: c.createdAt.toISOString().split("T")[0],
    };
  });

  const totalSalesAmount = totalAgg._sum.totalAmount ?? 0;
  const totalTransferredOut = totalTransferredOutAgg._sum.amount ?? 0;

  // Available balance = non-credit sales + all credit money actually received
  // (down payments + subsequent installment payments)
  const totalCreditDownPayments = creditsRaw.reduce((s, c) => s + c.downPayment, 0);
  const totalCreditInstallments = creditPaymentsRaw.reduce((s, cp) => s + cp.amount, 0);
  const totalCreditReceived = totalCreditDownPayments + totalCreditInstallments;

  // Non-credit sales revenue
  const nonCreditSalesAmount = salesRaw.reduce((s, sale) => s + sale.totalAmount, 0);

  // Available balance = actual cash received (non-credit sales + credit money received) - transfers out
  const availableBalance = Math.max(
    0,
    nonCreditSalesAmount + totalCreditReceived - totalTransferredOut
  );

  return (
    <PaymentsView
      activeShop={activeShop}
      isStaff={isStaff}
      isAdmin={isAdmin}
      stats={{
        today: { count: todayAgg._count, amount: todayAgg._sum.totalAmount ?? 0 },
        week: { count: weekAgg._count, amount: weekAgg._sum.totalAmount ?? 0 },
        month: { count: monthAgg._count, amount: monthAgg._sum.totalAmount ?? 0 },
        year: { count: yearAgg._count, amount: yearAgg._sum.totalAmount ?? 0 },
        total: { count: payments.length, amount: totalSalesAmount },
      }}
      methodTotals={methodTotals}
      payments={payments}
      creditPayments={creditPayments}
      creditSummaries={creditSummaries}
      availableBalance={availableBalance}
      totalCreditReceived={totalCreditReceived}
      totalCreditDownPayments={totalCreditDownPayments}
      totalCreditInstallments={totalCreditInstallments}
    />
  );
}