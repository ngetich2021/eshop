// app/payments/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { resolveActiveShop } from "@/lib/active-shop";
import PaymentsView, { type MoneyEntry, type SaleRow } from "./_components/PaymentsView";

export const revalidate = 0;

export default async function PaymentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { activeShopId, activeShop, isStaff, isAdmin } = await resolveActiveShop(
    session.user.id
  );

  const now          = new Date();
  const startOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek  = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear  = new Date(now.getFullYear(), 0, 1);

  const shopFilter = { shopId: activeShopId };

  const [
    salesRaw,
    todayAgg, weekAgg, monthAgg, yearAgg, totalAgg,
    creditPaymentsRaw,
    creditsRaw,
    totalTransferredOutAgg,
    paymentRecordsRaw,
  ] = await Promise.all([
    // ALL sales — for product-name lookup and sale metadata
    prisma.sale.findMany({
      where: shopFilter,
      select: {
        id: true, totalAmount: true, paymentMethod: true, shopId: true,
        shop: { select: { name: true } },
        saleItems: { select: { quantity: true, product: { select: { productName: true } } } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.sale.aggregate({ where: { ...shopFilter, createdAt: { gte: startOfDay } },   _sum: { totalAmount: true }, _count: true }),
    prisma.sale.aggregate({ where: { ...shopFilter, createdAt: { gte: startOfWeek } },  _sum: { totalAmount: true }, _count: true }),
    prisma.sale.aggregate({ where: { ...shopFilter, createdAt: { gte: startOfMonth } }, _sum: { totalAmount: true }, _count: true }),
    prisma.sale.aggregate({ where: { ...shopFilter, createdAt: { gte: startOfYear } },  _sum: { totalAmount: true }, _count: true }),
    prisma.sale.aggregate({ where: shopFilter, _sum: { totalAmount: true } }),

    // Post-sale credit installment payments
    prisma.creditPayment.findMany({
      where: shopFilter,
      select: {
        id: true, amount: true, method: true, note: true,
        dueDate: true, paidAt: true, shopId: true,
        shop: { select: { name: true } },
        credit: {
          select: {
            id: true, amount: true, downPayment: true,
            creditPayments: { select: { amount: true } },
          },
        },
      },
      orderBy: { paidAt: "desc" },
    }),

    // All credits (for summary tab)
    prisma.credit.findMany({
      where: shopFilter,
      select: {
        id: true, amount: true, downPayment: true, status: true, dueDate: true,
        shopId: true, shop: { select: { name: true } }, createdAt: true,
        creditPayments: { select: { amount: true } },
      },
      orderBy: { createdAt: "desc" },
    }),

    // Transfers out
    prisma.transaction.aggregate({
      where: { shopId: activeShopId, name: "transfer_out" },
      _sum: { amount: true },
    }),

    // ★ THE PRIMARY SOURCE OF TRUTH FOR CASH RECEIVED
    // Every Payment row = one atomic cash-flow leg written by sale/quote actions.
    // transactionCode patterns written by existing actions:
    //   PAY-{SALE_ID_LAST8}-{METHOD}  → non-credit split leg OR cash portion of credit sale
    //   DP-{SALE_ID_LAST8}            → legacy single down-payment on a credit sale
    //   anything else / null          → manual or other payment
    prisma.payment.findMany({
      where: { shopId: activeShopId },
      select: {
        id: true, amount: true, method: true, transactionCode: true,
        createdAt: true, shop: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // ─── Sale metadata lookup: suffix → sale ──────────────────────────────────
  // "suffix" = saleId.slice(-8).toUpperCase() — what's baked into transactionCode
  type SaleMeta = {
    saleId: string; products: string; totalAmount: number;
    isCreditSale: boolean; date: string; shop: string; shopId: string;
    paymentMethod: string;
  };
  const saleBySuffix = new Map<string, SaleMeta>();
  for (const s of salesRaw) {
    saleBySuffix.set(s.id.slice(-8).toUpperCase(), {
      saleId: s.id,
      products: s.saleItems.map(si => si.product.productName).join(", ") || "Sale",
      totalAmount: s.totalAmount,
      isCreditSale: s.paymentMethod === "credit",
      date: s.createdAt.toISOString().split("T")[0],
      shop: s.shop.name,
      shopId: s.shopId,
      paymentMethod: s.paymentMethod,
    });
  }

  // ─── Group Payment records by sale suffix ─────────────────────────────────
  type Leg = { method: string; amount: number; id: string };
  const legsBySuffix = new Map<string, Leg[]>();
  const leglessPayments: (typeof paymentRecordsRaw[0])[] = [];

  for (const p of paymentRecordsRaw) {
    const tc = p.transactionCode ?? "";
    let suffix: string | null = null;
    if (tc.startsWith("PAY-")) suffix = tc.split("-")[1] ?? null;
    else if (tc.startsWith("DP-")) suffix = tc.replace("DP-", "").slice(0, 8);

    if (suffix) {
      const arr = legsBySuffix.get(suffix) ?? [];
      arr.push({ method: p.method, amount: p.amount, id: p.id });
      legsBySuffix.set(suffix, arr);
    } else {
      leglessPayments.push(p);
    }
  }

  // ─── SaleRow[] for "Sale Payments" tab ────────────────────────────────────
  // One SaleRow per sale. Its `legs` array has one entry PER PAYMENT LEG.
  // A sale with "1000 cash + 2000 bank + 20000 credit" gets:
  //   legs = [{cash,1000}, {bank,2000}]
  //   creditAmount = 20000 (= totalAmount − sum(legs))
  // The credit amount is shown as a separate non-clickable "credit" badge.
  const saleRows: SaleRow[] = salesRaw.map(s => {
    const suffix = s.id.slice(-8).toUpperCase();
    const legs   = legsBySuffix.get(suffix) ?? [];
    const cashIn = legs.reduce((sum, l) => sum + l.amount, 0);
    // Credit portion = whatever wasn't paid in cash/mpesa/bank/card
    const creditAmount = Math.max(0, s.totalAmount - cashIn);
    const isCreditSale = s.paymentMethod === "credit" || creditAmount > 0;
    const products = s.saleItems.map(si => si.product.productName).join(", ") || "Sale";

    return {
      saleId: s.id,
      products,
      totalAmount: s.totalAmount,
      date: s.createdAt.toISOString().split("T")[0],
      shop: s.shop.name,
      shopId: s.shopId,
      paymentMethod: s.paymentMethod,
      isCreditSale,
      creditAmount,
      // If no Payment records exist (truly legacy), show one synthetic leg
      legs: legs.length > 0
        ? legs
        : [{ method: s.paymentMethod, amount: s.totalAmount, id: `leg-${s.id}` }],
    };
  });

  // ─── Credit payment tab data ──────────────────────────────────────────────
  const creditPayments = creditPaymentsRaw.map(cp => {
    const totalPaid = cp.credit.downPayment + cp.credit.creditPayments.reduce((s, p) => s + p.amount, 0);
    return {
      id: cp.id, amount: cp.amount, method: cp.method,
      note: cp.note ?? null,
      dueDate: cp.dueDate ? cp.dueDate.toISOString().split("T")[0] : null,
      paidAt: cp.paidAt.toISOString().split("T")[0],
      shop: cp.shop.name, shopId: cp.shopId,
      creditTotal: cp.credit.amount, creditTotalPaid: totalPaid,
    };
  });

  const creditSummaries = creditsRaw.map(c => {
    const extraPaid = c.creditPayments.reduce((s, p) => s + p.amount, 0);
    const totalPaid = c.downPayment + extraPaid;
    return {
      id: c.id, amount: c.amount, totalPaid,
      due: Math.max(0, c.amount - totalPaid),
      status: c.status,
      dueDate: c.dueDate ? c.dueDate.toISOString().split("T")[0] : null,
      shop: c.shop.name, date: c.createdAt.toISOString().split("T")[0],
    };
  });

  // ─── Unified MoneyEntry list ("All Money In" tab) ─────────────────────────
  // Rule: one MoneyEntry per Payment record row (never per sale total).
  // + one MoneyEntry per CreditPayment row.
  // + fallback MoneyEntry for sales with no Payment records.

  // Track which sale suffixes have Payment records (to avoid legacy double-count)
  const suffixesWithRecords = new Set(legsBySuffix.keys());

  // Source 1: Payment records
  const entriesFromPaymentRecords: MoneyEntry[] = paymentRecordsRaw.map(p => {
    const tc = p.transactionCode ?? "";
    let type: MoneyEntry["type"] = "sale";
    let description = "Payment";

    if (tc.startsWith("PAY-") || tc.startsWith("DP-")) {
      const suffix = tc.startsWith("PAY-")
        ? (tc.split("-")[1] ?? "")
        : tc.replace("DP-", "").slice(0, 8);
      const meta = saleBySuffix.get(suffix);
      if (meta) {
        description = meta.products;
        type = meta.isCreditSale ? "credit_downpayment" : "sale";
      }
    }

    return {
      id: `pay-${p.id}`,
      date: p.createdAt.toISOString().split("T")[0],
      amount: p.amount,
      method: p.method,
      type,
      description,
      shop: p.shop.name,
    };
  });

  // Source 2: CreditPayment records (post-sale installments)
  const entriesFromInstallments: MoneyEntry[] = creditPaymentsRaw.map(cp => ({
    id: `inst-${cp.id}`,
    date: cp.paidAt.toISOString().split("T")[0],
    amount: cp.amount,
    method: cp.method,
    type: "credit_installment" as const,
    description: cp.note ? `Credit repayment — ${cp.note}` : "Credit repayment",
    shop: cp.shop.name,
  }));

  // Source 3 (fallback): Non-credit sales that predate the Payment table
  const legacyEntries: MoneyEntry[] = salesRaw
    .filter(s => !suffixesWithRecords.has(s.id.slice(-8).toUpperCase()) && s.paymentMethod !== "credit")
    .map(s => ({
      id: `sale-${s.id}`,
      date: s.createdAt.toISOString().split("T")[0],
      amount: s.totalAmount,
      method: s.paymentMethod,
      type: "sale" as const,
      description: s.saleItems.map(si => si.product.productName).join(", ") || "Sale",
      shop: s.shop.name,
    }));

  const moneyEntries: MoneyEntry[] = [
    ...entriesFromPaymentRecords,
    ...entriesFromInstallments,
    ...legacyEntries,
  ].sort((a, b) => (b.date > a.date ? 1 : b.date < a.date ? -1 : 0));

  // ─── Method totals (real cash only, no "credit" method) ───────────────────
  const methodTotals: Record<string, number> = {};
  for (const p of paymentRecordsRaw) {
    if (p.method === "credit" || p.method === "credit_downpayment") continue;
    methodTotals[p.method] = (methodTotals[p.method] ?? 0) + p.amount;
  }
  for (const cp of creditPaymentsRaw) {
    methodTotals[cp.method] = (methodTotals[cp.method] ?? 0) + cp.amount;
  }

  // ─── Balance figures ──────────────────────────────────────────────────────
  const totalSalesAmount        = totalAgg._sum.totalAmount ?? 0;
  const totalTransferredOut     = totalTransferredOutAgg._sum.amount ?? 0;
  const totalCreditDownPayments = creditsRaw.reduce((s, c) => s + c.downPayment, 0);
  const totalCreditInstallments = creditPaymentsRaw.reduce((s, cp) => s + cp.amount, 0);
  const totalCreditReceived     = totalCreditDownPayments + totalCreditInstallments;

  // Real cash in = sum of all non-credit payment legs + all installments
  const realCashIn = paymentRecordsRaw
    .filter(p => p.method !== "credit" && p.method !== "credit_downpayment")
    .reduce((s, p) => s + p.amount, 0)
    + totalCreditInstallments;

  const availableBalance = Math.max(0, realCashIn - totalTransferredOut);

  return (
    <PaymentsView
      activeShop={activeShop}
      isStaff={isStaff}
      isAdmin={isAdmin}
      stats={{
        today: { count: todayAgg._count,   amount: todayAgg._sum.totalAmount  ?? 0 },
        week:  { count: weekAgg._count,    amount: weekAgg._sum.totalAmount   ?? 0 },
        month: { count: monthAgg._count,   amount: monthAgg._sum.totalAmount  ?? 0 },
        year:  { count: yearAgg._count,    amount: yearAgg._sum.totalAmount   ?? 0 },
        total: { count: salesRaw.length,   amount: totalSalesAmount },
      }}
      methodTotals={methodTotals}
      saleRows={saleRows}
      creditPayments={creditPayments}
      creditSummaries={creditSummaries}
      moneyEntries={moneyEntries}
      availableBalance={availableBalance}
      totalCreditReceived={totalCreditReceived}
      totalCreditDownPayments={totalCreditDownPayments}
      totalCreditInstallments={totalCreditInstallments}
    />
  );
}