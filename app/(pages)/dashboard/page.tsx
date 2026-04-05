// app/dashboard/page.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Staff who don't have a section in their allowedRoutes will see
// "No data available — ask your admin for more permissions" for that block.
// ─────────────────────────────────────────────────────────────────────────────
import { auth }          from "@/auth";
import prisma            from "@/lib/prisma";
import { redirect }      from "next/navigation";
import DashboardView     from "./_components/DashboardView";
import { parseAllowedRoutes, isRouteAllowed } from "@/lib/permissions";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ shopId?: string; blocked?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const userId  = session.user.id;
  const params  = await searchParams;
  const blocked = params.blocked === "1";

  const profile = await prisma.profile.findUnique({
    where:  { userId },
    select: { role: true, shopId: true, allowedRoutes: true },
  });

  const role          = (profile?.role ?? "user").toLowerCase().trim();
  const isAdmin       = role === "admin";
  const allowedRoutes = parseAllowedRoutes((profile as { allowedRoutes?: unknown })?.allowedRoutes);

  // ── Permission helpers ────────────────────────────────────────────────────
  const can = (prefix: string) => isRouteAllowed(prefix, role, allowedRoutes);

  const canSales     = can("/sales");
  const canFinance   = can("/finance");
  const canInventory = can("/inventory");
  const canHR        = can("/hr");
  const canReports   = can("/reports");

  // ── Shop scoping ──────────────────────────────────────────────────────────
  const activeShopId: string | undefined = isAdmin
    ? params.shopId ?? undefined
    : (profile?.shopId ?? undefined);

  const shopFilter = activeShopId ? { shopId: activeShopId } : {};
  const shopWhere  = activeShopId ? { id: activeShopId } : undefined;

  // Staff with no assigned shop
  if (!isAdmin && !activeShopId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    return (
      <DashboardView
        userName={user?.name ?? "User"}
        isAdmin={false}
        shops={[]}
        stats={emptyStats()}
        recentSales={[]}
        recentExpenses={[]}
        monthlyData={[]}
        wallets={[]}
        noShopAssigned={true}
        blocked={blocked}
        permissions={{ canSales, canFinance, canInventory, canHR, canReports }}
      />
    );
  }

  // ── Date ranges ───────────────────────────────────────────────────────────
  const now          = new Date();
  const startOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek  = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const twelveAgo    = new Date();
  twelveAgo.setMonth(twelveAgo.getMonth() - 11);
  twelveAgo.setDate(1);
  twelveAgo.setHours(0, 0, 0, 0);

  // ── Queries — conditionally fetched based on permissions ─────────────────
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
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),

    prisma.shop.findMany({
      where:  shopWhere ?? (isAdmin ? undefined : { userId }),
      select: { id: true, name: true, location: true },
    }),

    // Inventory data — gated
    canInventory
      ? prisma.product.count({ where: activeShopId ? { shopId: activeShopId } : (isAdmin ? undefined : { shop: { userId } }) })
      : Promise.resolve(null),

    // HR data — gated
    canHR
      ? prisma.staff.count({ where: activeShopId ? { shopId: activeShopId } : undefined })
      : Promise.resolve(null),

    // Sales data — gated
    ...(canSales ? [
      prisma.sale.aggregate({ where: shopFilter, _sum: { totalAmount: true }, _count: true }),
      prisma.sale.aggregate({ where: { ...shopFilter, createdAt: { gte: startOfDay   } }, _sum: { totalAmount: true }, _count: true }),
      prisma.sale.aggregate({ where: { ...shopFilter, createdAt: { gte: startOfWeek  } }, _sum: { totalAmount: true }, _count: true }),
      prisma.sale.aggregate({ where: { ...shopFilter, createdAt: { gte: startOfMonth } }, _sum: { totalAmount: true }, _count: true }),
    ] : [
      Promise.resolve(nullAgg()), Promise.resolve(nullAgg()),
      Promise.resolve(nullAgg()), Promise.resolve(nullAgg()),
    ]),

    // Finance: expenses — gated
    ...(canFinance ? [
      prisma.expense.aggregate({ where: shopFilter, _sum: { amount: true }, _count: true }),
      prisma.expense.aggregate({ where: { ...shopFilter, createdAt: { gte: startOfDay } }, _sum: { amount: true }, _count: true }),
    ] : [Promise.resolve(nullAgg()), Promise.resolve(nullAgg())]),

    // Finance: credit — gated
    canFinance
      ? prisma.credit.aggregate({ where: shopFilter, _sum: { amount: true, downPayment: true }, _count: true })
      : Promise.resolve({ _sum: { amount: 0, downPayment: 0 }, _count: 0 }),

    // Wallet — finance gated
    canFinance
      ? prisma.wallet.findMany({
          where:  activeShopId ? { shopId: activeShopId } : (isAdmin ? undefined : { shop: { userId } }),
          select: { balance: true, shopId: true, shop: { select: { name: true } } },
        })
      : Promise.resolve([]),

    // Recent sales — gated
    canSales
      ? prisma.sale.findMany({
          where:   activeShopId ? { shopId: activeShopId } : (isAdmin ? undefined : { shop: { userId } }),
          select: {
            id: true, totalAmount: true, paymentMethod: true, shopId: true,
            shop: { select: { name: true } },
            saleItems: { select: { quantity: true, product: { select: { productName: true } } }, take: 1 },
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
          take: 8,
        })
      : Promise.resolve([]),

    // Recent expenses — gated
    canFinance
      ? prisma.expense.findMany({
          where:   activeShopId ? { shopId: activeShopId } : (isAdmin ? undefined : { shop: { userId } }),
          select: { id: true, description: true, amount: true, category: true, shop: { select: { name: true } }, createdAt: true },
          orderBy: { createdAt: "desc" },
          take: 6,
        })
      : Promise.resolve([]),

    // Monthly sales — gated
    canSales
      ? prisma.sale.findMany({ where: { ...shopFilter, createdAt: { gte: twelveAgo } }, select: { totalAmount: true, createdAt: true } })
      : Promise.resolve([]),

    // Monthly expenses — gated
    canFinance
      ? prisma.expense.findMany({ where: { ...shopFilter, createdAt: { gte: twelveAgo } }, select: { amount: true, createdAt: true } })
      : Promise.resolve([]),

    // HR advances — gated
    canHR
      ? prisma.advance.aggregate({ where: shopFilter, _sum: { amount: true }, _count: true })
      : Promise.resolve(nullAgg()),

    // Finance payments today — gated
    canFinance
      ? prisma.payment.aggregate({ where: { ...shopFilter, createdAt: { gte: startOfDay } }, _sum: { amount: true }, _count: true })
      : Promise.resolve(nullAgg()),
  ]);

  // ── Monthly chart data ────────────────────────────────────────────────────
  const monthlyMap: Record<string, { sales: number; expenses: number }> = {};
  for (let i = 0; i < 12; i++) {
    const d = new Date(twelveAgo);
    d.setMonth(d.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap[key] = { sales: 0, expenses: 0 };
  }
  (monthlySalesRaw as { totalAmount: number; createdAt: Date }[]).forEach((s) => {
    const key = `${s.createdAt.getFullYear()}-${String(s.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyMap[key]) monthlyMap[key].sales += s.totalAmount;
  });
  (monthlyExpensesRaw as { amount: number; createdAt: Date }[]).forEach((e) => {
    const key = `${e.createdAt.getFullYear()}-${String(e.createdAt.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyMap[key]) monthlyMap[key].expenses += e.amount;
  });

  const monthlyData = Object.entries(monthlyMap).map(([month, data]) => ({
    month,
    label:    new Date(month + "-01").toLocaleDateString("en-KE", { month: "short" }),
    sales:    data.sales,
    expenses: data.expenses,
    profit:   data.sales - data.expenses,
  }));

  // ── Derived totals ────────────────────────────────────────────────────────
  const st  = salesTotal   as ReturnType<typeof nullAgg>;
  const sd  = salesToday   as ReturnType<typeof nullAgg>;
  const sw  = salesWeek    as ReturnType<typeof nullAgg>;
  const sm  = salesMonth   as ReturnType<typeof nullAgg>;
  const et  = expenseTotal as ReturnType<typeof nullAgg>;
  const ed  = expenseToday as ReturnType<typeof nullAgg>;
  const ca  = creditAgg    as { _sum: { amount: number | null; downPayment: number | null }; _count: number };
  const adv = advanceAgg   as ReturnType<typeof nullAgg>;
  const pay = paymentAgg   as ReturnType<typeof nullAgg>;

  const totalSalesAmount   = (st._sum as { totalAmount?: number | null })?.totalAmount ?? 0;
  const totalExpenseAmount = (et._sum as { amount?: number | null })?.amount ?? 0;
  const netProfit          = totalSalesAmount - totalExpenseAmount;
  const creditDue          = (ca._sum?.amount ?? 0) - (ca._sum?.downPayment ?? 0);
  const walletsArr         = wallets as { balance: number; shopId: string; shop: { name: string } }[];
  const totalBalance       = walletsArr.reduce((s, w) => s + w.balance, 0);
  const selectedShop       = activeShopId ? shops.find((s) => s.id === activeShopId) : null;

  return (
    <DashboardView
      userName={user?.name ?? "User"}
      isAdmin={isAdmin}
      shops={shops}
      selectedShopName={selectedShop?.name}
      blocked={blocked}
      permissions={{ canSales, canFinance, canInventory, canHR, canReports }}
      stats={{
        sales: {
          today: { count: (sd._count as number) ?? 0, amount: (sd._sum as { totalAmount?: number | null })?.totalAmount ?? 0 },
          week:  { count: (sw._count as number) ?? 0, amount: (sw._sum as { totalAmount?: number | null })?.totalAmount ?? 0 },
          month: { count: (sm._count as number) ?? 0, amount: (sm._sum as { totalAmount?: number | null })?.totalAmount ?? 0 },
          total: { count: (st._count as number) ?? 0, amount: totalSalesAmount },
        },
        expenses: {
          today: { count: (ed._count as number) ?? 0, amount: (ed._sum as { amount?: number | null })?.amount ?? 0 },
          total: { count: (et._count as number) ?? 0, amount: totalExpenseAmount },
        },
        totalProducts: (totalProducts as number | null) ?? 0,
        totalStaff:    (totalStaff    as number | null) ?? 0,
        netProfit,
        creditDue,
        totalBalance,
        advances:      { count: (adv._count as number) ?? 0, amount: (adv._sum as { amount?: number | null })?.amount ?? 0 },
        paymentsToday: { count: (pay._count as number) ?? 0, amount: (pay._sum as { amount?: number | null })?.amount ?? 0 },
      }}
      recentSales={(recentSalesRaw as {
        id: string; totalAmount: number; paymentMethod: string; shopId: string;
        shop: { name: string };
        saleItems: { quantity: number; product: { productName: string } }[];
        createdAt: Date;
      }[]).map((s) => ({
        id:          s.id,
        productName: s.saleItems[0]?.product.productName ?? "Multiple items",
        totalItems:  s.saleItems.reduce((sum, i) => sum + i.quantity, 0),
        amount:      s.totalAmount,
        method:      s.paymentMethod,
        shop:        s.shop.name,
        date:        s.createdAt.toISOString().split("T")[0],
        time:        s.createdAt.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" }),
      }))}
      recentExpenses={(recentExpensesRaw as {
        id: string; description: string; amount: number; category: string | null;
        shop: { name: string }; createdAt: Date;
      }[]).map((e) => ({
        id:          e.id,
        description: e.description,
        amount:      e.amount,
        category:    e.category ?? "General",
        shop:        e.shop.name,
        date:        e.createdAt.toISOString().split("T")[0],
      }))}
      monthlyData={monthlyData}
      wallets={walletsArr.map((w) => ({ balance: w.balance, shopName: w.shop.name, shopId: w.shopId }))}
    />
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function nullAgg() {
  return { _sum: {}, _count: 0 };
}

function emptyStats() {
  const zero = { count: 0, amount: 0 };
  return {
    sales:         { today: zero, week: zero, month: zero, total: zero },
    expenses:      { today: zero, total: zero },
    totalProducts: 0, totalStaff: 0,
    netProfit: 0, creditDue: 0, totalBalance: 0,
    advances: zero, paymentsToday: zero,
  };
}