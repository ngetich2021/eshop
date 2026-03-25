"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Package,
  Users,
  CreditCard,
  Wallet,
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  Star,
  DollarSign,
  Zap,
  Activity,
  Receipt,
  ShoppingBag,
  Building2,
  ArrowRightLeft,
  Banknote,
  Store,
} from "lucide-react";

/* ================================================================
   TYPES
================================================================ */

type StatPair = { count: number; amount: number };

type Props = {
  userName: string;
  isAdmin: boolean;
  selectedShopName?: string;
  shops: { id: string; name: string; location: string }[];
  stats: {
    sales: { today: StatPair; week: StatPair; month: StatPair; total: StatPair };
    expenses: { today: StatPair; total: StatPair };
    totalProducts: number;
    totalStaff: number;
    netProfit: number;
    creditDue: number;
    totalBalance: number;
    advances: StatPair;
    paymentsToday: StatPair;
  };
  recentSales: {
    id: string;
    productName: string;
    totalItems: number;
    amount: number;
    method: string;
    shop: string;
    date: string;
    time: string;
  }[];
  recentExpenses: {
    id: string;
    description: string;
    amount: number;
    category: string;
    shop: string;
    date: string;
  }[];
  monthlyData: {
    month: string;
    label: string;
    sales: number;
    expenses: number;
    profit: number;
  }[];
  wallets: { balance: number; shopName: string; shopId: string }[];
};

type MonthlyItem = {
  month: string;
  label: string;
  sales: number;
  expenses: number;
  profit: number;
};

type ChartView = "comparison" | "sales" | "expenses" | "profit";

type DonutSlice = { label: string; value: number; color: string };

/* ================================================================
   HELPERS
================================================================ */

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

const METHOD_COLORS: Record<string, string> = {
  cash:   "bg-emerald-900/60 text-emerald-300",
  mpesa:  "bg-green-900/60 text-green-300",
  bank:   "bg-sky-900/60 text-sky-300",
  card:   "bg-violet-900/60 text-violet-300",
  credit: "bg-rose-900/60 text-rose-300",
};

const METHOD_BAR_COLOR: Record<string, string> = {
  cash:   "#10b981",
  mpesa:  "#22c55e",
  bank:   "#0ea5e9",
  card:   "#8b5cf6",
  credit: "#f43f5e",
};

/* ================================================================
   KPI PALETTE
================================================================ */

type PaletteEntry = {
  bg: string;
  border: string;
  iconCls: string;
  text: string;
  badge: string;
};

const KPI_PALETTE: Record<string, PaletteEntry> = {
  emerald: {
    bg: "bg-emerald-950/40", border: "border-emerald-900/30",
    iconCls: "bg-emerald-900/50 text-emerald-400", text: "text-emerald-400",
    badge: "bg-emerald-900/40 text-emerald-400",
  },
  rose: {
    bg: "bg-rose-950/40", border: "border-rose-900/30",
    iconCls: "bg-rose-900/50 text-rose-400", text: "text-rose-400",
    badge: "bg-rose-900/40 text-rose-400",
  },
  amber: {
    bg: "bg-amber-950/40", border: "border-amber-900/30",
    iconCls: "bg-amber-900/50 text-amber-400", text: "text-amber-400",
    badge: "bg-amber-900/40 text-amber-400",
  },
  sky: {
    bg: "bg-sky-950/40", border: "border-sky-900/30",
    iconCls: "bg-sky-900/50 text-sky-400", text: "text-sky-400",
    badge: "bg-sky-900/40 text-sky-400",
  },
  violet: {
    bg: "bg-violet-950/40", border: "border-violet-900/30",
    iconCls: "bg-violet-900/50 text-violet-400", text: "text-violet-400",
    badge: "bg-violet-900/40 text-violet-400",
  },
  orange: {
    bg: "bg-orange-950/40", border: "border-orange-900/30",
    iconCls: "bg-orange-900/50 text-orange-400", text: "text-orange-400",
    badge: "bg-orange-900/40 text-orange-400",
  },
};

/* ================================================================
   ANIMATED NUMBER
================================================================ */

function AnimatedNumber({ value, duration = 900 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const startTime = performance.now();
    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(step);
    }
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <>{display.toLocaleString()}</>;
}

/* ================================================================
   SPARK LINE
================================================================ */

function SparkLine({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const W = 72, H = 24;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((v - min) / range) * H;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="flex-shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ================================================================
   BAR CHART
================================================================ */

function BarChart({ data, view }: { data: MonthlyItem[]; view: ChartView }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  function getValues(m: MonthlyItem): { a: number; b: number } {
    if (view === "sales")    return { a: m.sales,    b: 0 };
    if (view === "expenses") return { a: m.expenses, b: 0 };
    if (view === "profit")   return { a: m.profit,   b: 0 };
    return { a: m.sales, b: m.expenses };
  }

  const allAbsValues = data.flatMap((m) => {
    const { a, b } = getValues(m);
    return [Math.abs(a), Math.abs(b)];
  });
  const maxVal = Math.max(...allAbsValues, 1);

  const colorA =
    view === "expenses" ? "bg-rose-500" :
    view === "profit"   ? "bg-amber-500" :
    "bg-emerald-500";

  const yLabels = [1, 0.75, 0.5, 0.25, 0];

  return (
    <div className="relative">
      <div className="absolute left-0 top-0 h-36 flex flex-col justify-between pointer-events-none">
        {yLabels.map((frac) => (
          <span key={frac} className="text-[9px] text-gray-700 leading-none">
            {fmt(maxVal * frac)}
          </span>
        ))}
      </div>
      <div className="pl-8 overflow-x-auto pb-1">
        <div className="flex items-end gap-1.5 h-36 min-w-0">
          {data.map((m, i) => {
            const { a, b } = getValues(m);
            const isNegA = a < 0;
            const hA = Math.max((Math.abs(a) / maxVal) * 100, a !== 0 ? 2 : 0);
            const hB = Math.max((Math.abs(b) / maxVal) * 100, b !== 0 ? 2 : 0);
            const isHov = hoveredIdx === i;

            return (
              <div
                key={m.month}
                className="relative flex flex-col items-center gap-1 flex-1 min-w-[28px] cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {isHov && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-xs whitespace-nowrap z-30 shadow-xl pointer-events-none">
                    <div className="font-bold text-white mb-1">{m.label}</div>
                    {view === "comparison" ? (
                      <>
                        <div className="text-emerald-400">Sales: KSh {m.sales.toLocaleString()}</div>
                        <div className="text-rose-400">Exp: KSh {m.expenses.toLocaleString()}</div>
                        <div className={m.profit >= 0 ? "text-amber-400" : "text-rose-400"}>
                          Profit: KSh {m.profit.toLocaleString()}
                        </div>
                      </>
                    ) : (
                      <div className={isNegA ? "text-rose-400" : "text-white"}>
                        KSh {Math.abs(a).toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
                <div className="w-full flex items-end justify-center gap-0.5 h-32">
                  <div
                    style={{ height: `${hA}%` }}
                    className={`flex-1 rounded-t-md transition-all ${isNegA ? "bg-rose-500" : colorA} ${isHov ? "opacity-100" : "opacity-75"}`}
                  />
                  {view === "comparison" && (
                    <div
                      style={{ height: `${hB}%` }}
                      className={`flex-1 rounded-t-md transition-all bg-rose-500 ${isHov ? "opacity-100" : "opacity-55"}`}
                    />
                  )}
                </div>
                <span className="text-[9px] text-gray-600 truncate w-full text-center leading-none">
                  {m.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   DONUT CHART
================================================================ */

function DonutChart({ slices }: { slices: DonutSlice[] }) {
  const total = slices.reduce((s, sl) => s + sl.value, 0);

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-28 text-gray-600 text-xs">
        No data yet
      </div>
    );
  }

  const radius = 40, cx = 60, cy = 60;
  const circumference = 2 * Math.PI * radius;

  const enriched = slices.map((sl, i) => {
    const cumBefore = slices.slice(0, i).reduce((acc, x) => acc + x.value, 0);
    const pct = sl.value / total;
    const dashArray = `${(pct * circumference).toFixed(2)} ${circumference.toFixed(2)}`;
    const rotation = (cumBefore / total) * 360 - 90;
    return { ...sl, dashArray, rotation };
  });

  return (
    <div className="flex items-center gap-4">
      <svg width="120" height="120" viewBox="0 0 120 120" className="flex-shrink-0">
        <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#1f2937" strokeWidth="18" />
        {enriched.map((sl, i) => (
          <circle key={i} cx={cx} cy={cy} r={radius} fill="none" stroke={sl.color}
            strokeWidth="18" strokeDasharray={sl.dashArray} strokeDashoffset="0"
            transform={`rotate(${sl.rotation} ${cx} ${cy})`}
            style={{ strokeLinecap: "round" }}
          />
        ))}
        <text x={cx} y={cy - 7} textAnchor="middle" fontSize="10" fontWeight="bold" fill="white">KSh</text>
        <text x={cx} y={cy + 8} textAnchor="middle" fontSize="10" fill="#34d399">{fmt(total)}</text>
      </svg>
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        {slices.map((sl, i) => (
          <div key={i} className="flex items-center gap-2 min-w-0">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: sl.color }} />
            <span className="text-xs text-gray-400 flex-1 truncate">{sl.label}</span>
            <span className="text-xs font-bold text-white">
              {Math.round((sl.value / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   KPI CARD
================================================================ */

function KpiCard({
  label, value, fullValue, sub, spark, icon, color, trend, negative,
}: {
  label: string; value: string; fullValue: string; sub: string;
  spark?: React.ReactNode; icon: React.ReactNode; color: string;
  trend?: string; negative?: boolean;
}) {
  const c: PaletteEntry = KPI_PALETTE[color] ?? KPI_PALETTE["emerald"];

  return (
    <div
      title={fullValue}
      className={`rounded-2xl border ${c.bg} ${c.border} p-4 flex flex-col gap-3 hover:border-opacity-70 transition-all cursor-default`}
    >
      <div className="flex items-center justify-between">
        <div className={`p-2 rounded-xl ${c.iconCls}`}>{icon}</div>
        {spark}
      </div>
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</div>
        <div className={`text-lg sm:text-xl font-bold ${c.text} leading-tight`}>{value}</div>
        <div className="text-xs text-gray-600 mt-0.5">{sub}</div>
      </div>
      {trend && (
        <div className={`text-xs font-semibold px-2 py-1 rounded-lg self-start ${c.badge}`}>
          {negative ? "▼" : "▲"} {trend}
        </div>
      )}
    </div>
  );
}

/* ================================================================
   MAIN DASHBOARD COMPONENT
================================================================ */

export default function DashboardView({
  userName,
  isAdmin,
  selectedShopName,
  shops,
  stats,
  recentSales,
  recentExpenses,
  monthlyData,
  wallets,
}: Props) {
  const [chartView, setChartView] = useState<ChartView>("comparison");

  const salesSparkData  = monthlyData.map((m) => m.sales);
  const expSparkData    = monthlyData.map((m) => m.expenses);
  const profitSparkData = monthlyData.map((m) => m.profit);

  const donutSlices: DonutSlice[] = [
    { label: "Sales",    value: stats.sales.total.amount,    color: "#10b981" },
    { label: "Expenses", value: stats.expenses.total.amount, color: "#f43f5e" },
    { label: "Advances", value: stats.advances.amount,       color: "#f59e0b" },
  ].filter((s) => s.value > 0);

  const methodMap: Record<string, number> = {};
  recentSales.forEach((s) => {
    methodMap[s.method] = (methodMap[s.method] ?? 0) + s.amount;
  });
  const methodTotal   = Object.values(methodMap).reduce((a, b) => a + b, 0);
  const methodEntries = Object.entries(methodMap).sort((a, b) => b[1] - a[1]);

  const chartSummary = [
    { label: "Peak Sales",    value: `KSh ${Math.max(...monthlyData.map((m) => m.sales),    0).toLocaleString()}`, color: "text-emerald-400" },
    { label: "Peak Expenses", value: `KSh ${Math.max(...monthlyData.map((m) => m.expenses), 0).toLocaleString()}`, color: "text-rose-400"    },
    { label: "Best Profit",   value: `KSh ${Math.max(...monthlyData.map((m) => m.profit),   0).toLocaleString()}`, color: "text-amber-400"   },
    {
      label: "Avg Sales/Mo",
      value: `KSh ${Math.round(monthlyData.reduce((s, m) => s + m.sales, 0) / Math.max(monthlyData.length, 1)).toLocaleString()}`,
      color: "text-sky-400",
    },
  ];

  const quickLinks = [
    { label: "Make Sale",   href: "/sale/sold",  icon: <ShoppingCart size={14} />, grad: "from-emerald-600 to-emerald-700" },
    { label: "Add Expense", href: "/expense",    icon: <TrendingDown size={14} />, grad: "from-rose-600 to-rose-700"       },
    { label: "Buy Stock",   href: "/buy",        icon: <ShoppingBag  size={14} />, grad: "from-amber-600 to-amber-700"     },
    { label: "HR Advance",  href: "/hr/advance", icon: <Wallet       size={14} />, grad: "from-violet-600 to-violet-700"   },
    { label: "New Quote",   href: "/sale/quote", icon: <Receipt      size={14} />, grad: "from-sky-600 to-sky-700"         },
    { label: "Reports",     href: "/reports",    icon: <BarChart3    size={14} />, grad: "from-indigo-600 to-indigo-700"   },
  ];

  const navModules = [
    { href: "/inventory/products", label: "Inventory", emoji: "📦", hover: "hover:border-amber-700/50"   },
    { href: "/sale/sold",          label: "Sales",      emoji: "💰", hover: "hover:border-emerald-700/50" },
    { href: "/payments",           label: "Payments",   emoji: "💳", hover: "hover:border-sky-700/50"     },
    { href: "/expense",            label: "Expenses",   emoji: "🧾", hover: "hover:border-rose-700/50"    },
    { href: "/credit",             label: "Credit",     emoji: "🤝", hover: "hover:border-orange-700/50"  },
    { href: "/assets",             label: "Assets",     emoji: "🏷️", hover: "hover:border-teal-700/50"    },
    { href: "/hr/salary",          label: "HR",         emoji: "👥", hover: "hover:border-violet-700/50"  },
    { href: "/suppliers",          label: "Suppliers",  emoji: "🚚", hover: "hover:border-indigo-700/50"  },
    { href: "/buy",                label: "Purchases",  emoji: "🛒", hover: "hover:border-pink-700/50"    },
    { href: "/shop",               label: "Shops",      emoji: "🏪", hover: "hover:border-cyan-700/50"    },
    { href: "/wallet",             label: "Wallet",     emoji: "💼", hover: "hover:border-lime-700/50"    },
    { href: "/reports",            label: "Reports",    emoji: "📊", hover: "hover:border-fuchsia-700/50" },
  ];

  const chartOptions: { key: ChartView; label: string }[] = [
    { key: "comparison", label: "Both"     },
    { key: "sales",      label: "Sales"    },
    { key: "expenses",   label: "Expenses" },
    { key: "profit",     label: "Profit"   },
  ];

  const todayItems = [
    { label: "Sales Revenue", value: `KSh ${stats.sales.today.amount.toLocaleString()}`,    icon: <TrendingUp size={14} />, cls: "text-emerald-400", bg: "bg-emerald-900/30" },
    { label: "Expenses",      value: `KSh ${stats.expenses.today.amount.toLocaleString()}`, icon: <TrendingDown size={14} />, cls: "text-rose-400",  bg: "bg-rose-900/30"    },
    { label: "Payments",      value: `KSh ${stats.paymentsToday.amount.toLocaleString()}`,  icon: <CreditCard size={14} />,   cls: "text-sky-400",   bg: "bg-sky-900/30"     },
    { label: "Transactions",  value: stats.paymentsToday.count.toString(),                  icon: <Activity size={14} />,     cls: "text-amber-400", bg: "bg-amber-900/30"   },
  ];

  /* ── RENDER ──────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#0a0c10] text-white">

      {/* ── HERO ── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/40 via-[#0a0c10] to-gray-950 pointer-events-none" />
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-20 right-0 w-72 h-72 bg-sky-600/5 rounded-full blur-3xl pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.025] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)", backgroundSize: "24px 24px" }}
        />

        <div className="relative mx-auto max-w-screen-2xl px-4 pt-6 pb-8 md:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

            {/* Greeting */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  Live &middot;{" "}
                  {new Date().toLocaleDateString("en-KE", { weekday: "short", month: "short", day: "numeric" })}
                </span>
                {isAdmin && (
                  <span className="bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold px-3 py-1 rounded-full">
                    Admin
                  </span>
                )}
                {/* Selected shop badge */}
                {selectedShopName && (
                  <span className="inline-flex items-center gap-1.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold px-3 py-1 rounded-full">
                    <Store size={11} />
                    {selectedShopName}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                {getGreeting()},{" "}
                <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
                  {userName.split(" ")[0]}
                </span>{" "}
                👋
              </h1>

              <p className="text-sm text-gray-500 mt-1">
                {selectedShopName ? (
                  <>
                    <span className="text-sky-400 font-semibold">{selectedShopName}</span>
                    {" "}· {stats.totalStaff} staff · {stats.totalProducts} products
                  </>
                ) : (
                  <>
                    {shops.length} shop{shops.length !== 1 ? "s" : ""} · {stats.totalStaff} staff · {stats.totalProducts} products
                  </>
                )}
              </p>
            </div>

            {/* Balance card */}
            <div className="shrink-0">
              <div className="inline-flex flex-col items-start sm:items-end bg-gradient-to-br from-emerald-600/20 to-emerald-800/10 border border-emerald-600/20 rounded-2xl px-5 py-4">
                <span className="text-xs font-semibold text-emerald-400/70 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                  <Wallet size={11} /> {selectedShopName ? `${selectedShopName} Balance` : "Total Wallet Balance"}
                </span>
                <span className="text-2xl sm:text-3xl font-bold text-white">
                  KSh <AnimatedNumber value={stats.totalBalance} />
                </span>
                <span className="text-xs text-emerald-400/60 mt-1">
                  {stats.sales.today.count} sales today &middot; KSh {stats.sales.today.amount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Quick links */}
          <div className="flex flex-wrap gap-2 mt-5">
            {quickLinks.map((q) => (
              <Link
                key={q.href}
                href={q.href}
                className={`flex items-center gap-2 bg-gradient-to-r ${q.grad} text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg hover:opacity-90 hover:scale-105 transition-all active:scale-95`}
              >
                {q.icon}
                {q.label}
              </Link>
            ))}

            {/* Back to shops link — only shown when a specific shop is selected */}
            {selectedShopName && (
              <Link
                href="/shop"
                className="flex items-center gap-2 bg-gradient-to-r from-gray-600 to-gray-700 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg hover:opacity-90 hover:scale-105 transition-all active:scale-95"
              >
                <Store size={14} />
                All Shops
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ── PAGE BODY ── */}
      <div className="mx-auto max-w-screen-2xl px-4 pb-10 md:px-6 space-y-5">

        {/* ── KPI CARDS ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <KpiCard
            label="Total Revenue"
            value={`KSh ${fmt(stats.sales.total.amount)}`}
            fullValue={`KSh ${stats.sales.total.amount.toLocaleString()}`}
            sub={`${stats.sales.total.count} sales`}
            spark={<SparkLine data={salesSparkData} color="#10b981" />}
            icon={<TrendingUp size={16} />}
            color="emerald"
            trend={stats.sales.today.amount > 0 ? `+KSh ${fmt(stats.sales.today.amount)} today` : undefined}
          />
          <KpiCard
            label="Total Expenses"
            value={`KSh ${fmt(stats.expenses.total.amount)}`}
            fullValue={`KSh ${stats.expenses.total.amount.toLocaleString()}`}
            sub={`${stats.expenses.total.count} records`}
            spark={<SparkLine data={expSparkData} color="#f43f5e" />}
            icon={<TrendingDown size={16} />}
            color="rose"
            trend={stats.expenses.today.amount > 0 ? `-KSh ${fmt(stats.expenses.today.amount)} today` : undefined}
            negative={true}
          />
          <KpiCard
            label="Net Profit"
            value={`KSh ${fmt(Math.abs(stats.netProfit))}`}
            fullValue={`KSh ${stats.netProfit.toLocaleString()}`}
            sub={stats.netProfit >= 0 ? "Positive" : "Loss"}
            spark={<SparkLine data={profitSparkData} color={stats.netProfit >= 0 ? "#f59e0b" : "#f43f5e"} />}
            icon={<Star size={16} />}
            color={stats.netProfit >= 0 ? "amber" : "rose"}
            negative={stats.netProfit < 0}
          />
          <KpiCard
            label="Products"
            value={stats.totalProducts.toLocaleString()}
            fullValue={`${stats.totalProducts} SKUs`}
            sub="in inventory"
            icon={<Package size={16} />}
            color="sky"
          />
          <KpiCard
            label="Staff"
            value={stats.totalStaff.toLocaleString()}
            fullValue={`${stats.totalStaff} team members`}
            sub="team members"
            icon={<Users size={16} />}
            color="violet"
          />
          <KpiCard
            label="Credit Due"
            value={`KSh ${fmt(stats.creditDue)}`}
            fullValue={`KSh ${stats.creditDue.toLocaleString()}`}
            sub="outstanding"
            icon={<AlertCircle size={16} />}
            color="orange"
            negative={true}
          />
        </div>

        {/* ── SALES PERIOD ROW ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Today",      emoji: "⚡", count: stats.sales.today.count,  amount: stats.sales.today.amount  },
            { label: "This Week",  emoji: "📅", count: stats.sales.week.count,   amount: stats.sales.week.amount   },
            { label: "This Month", emoji: "🗓️", count: stats.sales.month.count,  amount: stats.sales.month.amount  },
            { label: "All Time",   emoji: "🏆", count: stats.sales.total.count,  amount: stats.sales.total.amount  },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-gray-900/80 border border-gray-800 p-4 hover:border-emerald-800/50 hover:bg-gray-900 transition-all">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-base leading-none">{s.emoji}</span>
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{s.label}</span>
              </div>
              <div className="text-lg sm:text-xl font-bold text-white leading-tight">
                KSh {s.amount.toLocaleString()}
              </div>
              <div className="flex items-center gap-1 mt-1.5">
                <ShoppingCart size={11} className="text-emerald-400" />
                <span className="text-xs text-emerald-400 font-semibold">{s.count} sales</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── CHART + SIDEBAR ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

          <div className="lg:col-span-2 rounded-2xl bg-gray-900/80 border border-gray-800 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Activity size={16} className="text-emerald-400" />
                  Performance — Last 12 Months
                  {selectedShopName && (
                    <span className="text-sky-400 font-normal text-xs">· {selectedShopName}</span>
                  )}
                </h2>
                <p className="text-xs text-gray-600 mt-0.5">Monthly breakdown</p>
              </div>
              <div className="flex gap-1 bg-gray-800 rounded-xl p-1 self-start sm:self-auto flex-wrap">
                {chartOptions.map((v) => {
                  const isActive = chartView === v.key;
                  const activeCls =
                    v.key === "expenses" ? "bg-rose-600 text-white" :
                    v.key === "profit"   ? "bg-amber-600 text-white" :
                    "bg-emerald-600 text-white";
                  return (
                    <button
                      key={v.key}
                      onClick={() => setChartView(v.key)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${isActive ? activeCls : "text-gray-500 hover:text-gray-300"}`}
                    >
                      {v.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <BarChart data={monthlyData} view={chartView} />

            <div className="mt-4 pt-4 border-t border-gray-800 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {chartSummary.map((item) => (
                <div key={item.label} className="bg-gray-800/60 rounded-xl p-2.5">
                  <div className="text-[10px] text-gray-500 mb-1">{item.label}</div>
                  <div className={`text-xs font-bold ${item.color}`}>{item.value}</div>
                </div>
              ))}
            </div>

            {chartView === "comparison" && (
              <div className="flex gap-5 mt-3 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-2 bg-emerald-500 rounded-sm" /> Sales
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-2 bg-rose-500 rounded-sm" /> Expenses
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-2xl bg-gray-900/80 border border-gray-800 p-5">
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <BarChart3 size={15} className="text-violet-400" /> Financial Mix
              </h2>
              <DonutChart slices={donutSlices} />
            </div>

            <div className="rounded-2xl bg-gray-900/80 border border-gray-800 p-5 flex-1">
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <Zap size={15} className="text-amber-400" /> Today&apos;s Activity
              </h2>
              <div className="space-y-2.5">
                {todayItems.map((item) => (
                  <div key={item.label} className={`flex items-center gap-3 rounded-xl p-3 ${item.bg}`}>
                    <div className={item.cls}>{item.icon}</div>
                    <div className="flex-1 text-xs text-gray-400">{item.label}</div>
                    <div className={`text-sm font-bold ${item.cls}`}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── WALLET + ADVANCES + PAYMENT METHODS ── */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">

          <div className="rounded-2xl bg-gray-900/80 border border-gray-700/80 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Wallet size={15} className="text-emerald-400" /> Wallets
              </h2>
              <Link href="/wallet" className="text-xs text-gray-500 hover:text-emerald-400 flex items-center gap-1 transition-colors">
                Manage <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="space-y-3 mb-4">
              {wallets.length === 0 && <p className="text-xs text-gray-600">No wallets configured</p>}
              {wallets.map((w) => {
                const pct = stats.totalBalance > 0 ? (w.balance / stats.totalBalance) * 100 : 0;
                return (
                  <div key={w.shopId} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400 font-semibold">{w.shopName}</span>
                      <span className="text-emerald-400 font-bold">KSh {w.balance.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-gray-800">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Total</span>
              <span className="text-xl font-bold text-white">KSh {stats.totalBalance.toLocaleString()}</span>
            </div>
          </div>

          <div className="rounded-2xl bg-gray-900/80 border border-gray-800 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Banknote size={15} className="text-violet-400" /> Staff Advances
              </h2>
              <Link href="/hr/advance" className="text-xs text-gray-500 hover:text-violet-400 flex items-center gap-1 transition-colors">
                View <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="flex flex-col gap-3">
              <div className="rounded-xl bg-violet-900/20 border border-violet-800/30 p-4 text-center">
                <div className="text-xs text-violet-300/60 uppercase tracking-wider mb-1">Total Advanced</div>
                <div className="text-2xl font-bold text-violet-300">KSh {stats.advances.amount.toLocaleString()}</div>
              </div>
              <div className="rounded-xl bg-gray-800/50 p-3 flex justify-between items-center">
                <span className="text-xs text-gray-400">Total Requests</span>
                <span className="text-sm font-bold text-white">{stats.advances.count}</span>
              </div>
              <div className="rounded-xl bg-gray-800/50 p-3 flex justify-between items-center">
                <span className="text-xs text-gray-400">Avg per Request</span>
                <span className="text-sm font-bold text-white">
                  KSh {stats.advances.count > 0 ? Math.round(stats.advances.amount / stats.advances.count).toLocaleString() : "0"}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-gray-900/80 border border-gray-800 p-5">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <ArrowRightLeft size={15} className="text-sky-400" /> Payment Methods
            </h2>
            {methodEntries.length === 0 ? (
              <div className="text-xs text-gray-600 text-center py-8">No recent sales data</div>
            ) : (
              <div className="space-y-3">
                {methodEntries.map(([method, amount]) => {
                  const pct = methodTotal > 0 ? Math.round((amount / methodTotal) * 100) : 0;
                  const barColor = METHOD_BAR_COLOR[method] ?? "#6b7280";
                  const badgeCls = METHOD_COLORS[method]  ?? "bg-gray-800 text-gray-300";
                  return (
                    <div key={method} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className={`capitalize font-semibold px-2 py-0.5 rounded-full ${badgeCls}`}>{method}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">KSh {amount.toLocaleString()}</span>
                          <span className="text-white font-bold w-8 text-right">{pct}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: barColor }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── SHOPS ── (hidden when a single shop is selected) */}
        {shops.length > 0 && !selectedShopName && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                <Building2 size={15} className="text-sky-400" />
                Your Shops
                <span className="text-xs bg-gray-800 text-gray-500 px-2 py-0.5 rounded-full">{shops.length}</span>
              </h2>
              <Link href="/shop" className="text-xs text-gray-500 hover:text-sky-400 flex items-center gap-1 transition-colors">
                Manage <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {shops.map((shop) => (
                <div key={shop.id} className="rounded-2xl bg-gray-900/80 border border-gray-800 p-4 hover:border-sky-800/50 hover:bg-gray-900 transition-all">
                  <div className="w-8 h-8 rounded-xl bg-sky-900/40 flex items-center justify-center mb-3">
                    <Building2 size={16} className="text-sky-400" />
                  </div>
                  <div className="text-sm font-bold text-white leading-tight truncate">{shop.name}</div>
                  <div className="text-xs text-gray-600 mt-0.5 truncate">{shop.location || "—"}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── RECENT ACTIVITY ── */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

          <div className="rounded-2xl bg-gray-900/80 border border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <ShoppingCart size={15} className="text-emerald-400" /> Recent Sales
              </h2>
              <Link href="/sale/sold" className="text-xs text-gray-500 hover:text-emerald-400 flex items-center gap-1 transition-colors">
                View all <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-gray-800/60">
              {recentSales.length === 0 ? (
                <div className="py-12 text-center text-gray-600 text-sm flex flex-col items-center gap-2">
                  <ShoppingCart size={28} className="opacity-20" />
                  No recent sales
                </div>
              ) : (
                recentSales.map((sale) => {
                  const methodCls = METHOD_COLORS[sale.method] ?? "bg-gray-800 text-gray-400";
                  return (
                    <div key={sale.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-800/30 transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                        <ShoppingCart size={15} className="text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{sale.productName}</div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1 flex-wrap">
                          <span>{sale.shop}</span>
                          <span className="text-gray-700">&middot;</span>
                          <span>{sale.time}</span>
                          <span className="text-gray-700">&middot;</span>
                          <span>{sale.totalItems} item{sale.totalItems !== 1 ? "s" : ""}</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 space-y-1">
                        <div className="text-sm font-bold text-emerald-400">KSh {sale.amount.toLocaleString()}</div>
                        <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${methodCls}`}>{sale.method}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-gray-900/80 border border-gray-800 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <TrendingDown size={15} className="text-rose-400" /> Recent Expenses
              </h2>
              <Link href="/expense" className="text-xs text-gray-500 hover:text-rose-400 flex items-center gap-1 transition-colors">
                View all <ArrowUpRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-gray-800/60">
              {recentExpenses.length === 0 ? (
                <div className="py-12 text-center text-gray-600 text-sm flex flex-col items-center gap-2">
                  <DollarSign size={28} className="opacity-20" />
                  No recent expenses
                </div>
              ) : (
                recentExpenses.map((exp) => (
                  <div key={exp.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-800/30 transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-rose-900/30 flex items-center justify-center flex-shrink-0">
                      <DollarSign size={15} className="text-rose-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-white truncate">{exp.description}</div>
                      <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                        <span>{exp.shop}</span>
                        <span className="text-gray-700">&middot;</span>
                        <span className="bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded text-xs">{exp.category}</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 space-y-1">
                      <div className="text-sm font-bold text-rose-400">KSh {exp.amount.toLocaleString()}</div>
                      <div className="text-xs text-gray-600">{exp.date}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── MODULE NAV GRID ── */}
        <div>
          <h2 className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-3">Quick Navigate</h2>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 lg:grid-cols-12">
            {navModules.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className={`rounded-2xl bg-gray-900/80 border border-gray-800 ${m.hover} p-3 flex flex-col items-center gap-1.5 hover:bg-gray-800/80 transition-all group`}
              >
                <span className="text-xl group-hover:scale-110 transition-transform duration-200 leading-none">{m.emoji}</span>
                <span className="text-xs font-semibold text-gray-500 group-hover:text-white transition-colors text-center leading-tight">{m.label}</span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}