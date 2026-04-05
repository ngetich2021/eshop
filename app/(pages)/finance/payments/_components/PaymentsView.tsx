// app/payments/_components/PaymentsView.tsx
"use client";

import { useState, useMemo } from "react";
import {
  Search, Store, MapPin, Wallet, CreditCard, ShoppingCart,
  TrendingDown, Calendar, ChevronDown, ArrowDownCircle,
  BadgeDollarSign, Clock, CheckCircle2, AlertCircle, Filter,
  BarChart2, ListFilter, Banknote,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

// One payment leg from a sale (1 row in the Sale Payments table)
export type SaleLeg = {
  id: string;
  method: string;
  amount: number;
};

// One sale with all its payment legs expanded
export type SaleRow = {
  saleId: string;
  products: string;
  totalAmount: number;
  date: string;
  shop: string;
  shopId: string;
  paymentMethod: string;
  isCreditSale: boolean;
  creditAmount: number;  // portion on credit (not yet paid)
  legs: SaleLeg[];       // actual cash/mpesa/bank/card legs
};

type CreditPayment = {
  id: string; amount: number; method: string; note: string | null;
  dueDate: string | null; paidAt: string; shop: string; shopId: string;
  creditTotal: number; creditTotalPaid: number;
};

type CreditSummary = {
  id: string; amount: number; totalPaid: number; due: number;
  status: string; dueDate: string | null; shop: string; date: string;
};

type StatPair = { count: number; amount: number };

export type MoneyEntry = {
  id: string;
  date: string;
  amount: number;
  method: string;
  type: "sale" | "credit_downpayment" | "credit_installment";
  description: string;
  shop: string;
};

type Props = {
  activeShop: { id: string; name: string; location: string };
  isStaff: boolean;
  isAdmin: boolean;
  stats: {
    today: StatPair; week: StatPair; month: StatPair; year: StatPair; total: StatPair;
  };
  methodTotals: Record<string, number>;
  saleRows: SaleRow[];
  creditPayments: CreditPayment[];
  creditSummaries: CreditSummary[];
  moneyEntries: MoneyEntry[];
  availableBalance: number;
  totalCreditReceived: number;
  totalCreditDownPayments: number;
  totalCreditInstallments: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const METHOD_STYLES: Record<string, string> = {
  cash:               "bg-green-50 text-green-700 border-green-200",
  mpesa:              "bg-emerald-50 text-emerald-700 border-emerald-200",
  bank:               "bg-blue-50 text-blue-700 border-blue-200",
  card:               "bg-purple-50 text-purple-700 border-purple-200",
  credit:             "bg-orange-50 text-orange-700 border-orange-200",
  credit_downpayment: "bg-amber-50 text-amber-700 border-amber-200",
};

const METHOD_EMOJI: Record<string, string> = {
  cash: "💵", mpesa: "📱", bank: "🏦", card: "💳",
  credit: "🤝", credit_downpayment: "⬇️",
};

const TYPE_CONFIG = {
  sale: {
    label: "Sale",
    icon: <ShoppingCart size={12} />,
    bg: "bg-indigo-50 text-indigo-700 border-indigo-200",
    dot: "bg-indigo-500",
  },
  credit_downpayment: {
    label: "Down Payment",
    icon: <ArrowDownCircle size={12} />,
    bg: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  credit_installment: {
    label: "Repayment",
    icon: <BadgeDollarSign size={12} />,
    bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
  },
} as const;

type Period = "today" | "week" | "month" | "year" | "custom";
const PERIODS: { key: Period; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week",  label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year",  label: "This Year" },
  { key: "custom", label: "Custom" },
];

type ActiveTab = "all" | "sales" | "credit" | "credit_records";

function isoToday() { return new Date().toISOString().split("T")[0]; }

function periodBounds(p: Period, customFrom: string, customTo: string) {
  const now = new Date();
  const t   = isoToday();
  switch (p) {
    case "today":  return { from: t, to: t };
    case "week": {
      const s = new Date(now);
      s.setDate(now.getDate() - now.getDay());
      return { from: s.toISOString().split("T")[0], to: t };
    }
    case "month":  return { from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`, to: t };
    case "year":   return { from: `${now.getFullYear()}-01-01`, to: t };
    case "custom": return { from: customFrom || t, to: customTo || t };
  }
}

function inRange(date: string, from: string, to: string) { return date >= from && date <= to; }
function fmt(n: number) { return `KES ${n.toLocaleString()}`; }

// ─── Date Range Picker ────────────────────────────────────────────────────────
function DatePicker({ period, customFrom, customTo, onPeriod, onFrom, onTo }: {
  period: Period; customFrom: string; customTo: string;
  onPeriod: (p: Period) => void; onFrom: (s: string) => void; onTo: (s: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = PERIODS.find(p => p.key === period)?.label ?? "Period";
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:border-indigo-400 transition-colors">
        <Calendar size={14} className="text-indigo-500" />
        <span>{label}</span>
        {period === "custom" && customFrom && (
          <span className="text-gray-400 text-xs hidden sm:inline">{customFrom} → {customTo}</span>
        )}
        <ChevronDown size={13} className={`transition-transform text-gray-400 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 w-72">
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400 mb-3">Select Period</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {PERIODS.filter(p => p.key !== "custom").map(p => (
              <button key={p.key} onClick={() => { onPeriod(p.key); setOpen(false); }}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${period === p.key ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {p.label}
              </button>
            ))}
          </div>
          <div className="border-t border-gray-100 pt-3 space-y-2">
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400">Custom Range</p>
            <div className="flex gap-2 items-center">
              <input type="date" value={customFrom} onChange={e => { onFrom(e.target.value); onPeriod("custom"); }}
                className="flex-1 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg px-2 py-1.5 text-xs" />
              <span className="text-gray-400 text-xs">→</span>
              <input type="date" value={customTo} min={customFrom} onChange={e => { onTo(e.target.value); onPeriod("custom"); }}
                className="flex-1 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg px-2 py-1.5 text-xs" />
            </div>
            <button onClick={() => setOpen(false)}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-xl text-xs font-semibold">Apply</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PaymentsView({
  activeShop, isStaff, isAdmin, stats, methodTotals,
  saleRows, creditPayments, creditSummaries, moneyEntries,
  availableBalance, totalCreditReceived, totalCreditDownPayments, totalCreditInstallments,
}: Props) {
  const [search, setSearch]         = useState("");
  const [filterMethod, setFilterMethod] = useState("all");
  const [activeTab, setActiveTab]   = useState<ActiveTab>("all");
  const [period, setPeriod]         = useState<Period>("month");
  const [customFrom, setCustomFrom] = useState(isoToday());
  const [customTo, setCustomTo]     = useState(isoToday());
  const [typeFilter, setTypeFilter] = useState<"all" | MoneyEntry["type"]>("all");

  const { from, to } = periodBounds(period, customFrom, customTo);

  // ── Filtered sets ─────────────────────────────────────────────────────────
  const filteredEntries = useMemo(() =>
    moneyEntries.filter(e => {
      const dateOk   = inRange(e.date, from, to);
      const typeOk   = typeFilter === "all" || e.type === typeFilter;
      const searchOk = !search || `${e.description} ${e.method} ${e.shop}`.toLowerCase().includes(search.toLowerCase());
      return dateOk && typeOk && searchOk;
    }),
  [moneyEntries, from, to, typeFilter, search]);

  // Sale rows expanded into individual leg rows for the Sales tab
  // Each leg becomes its own visible row; the sale metadata (products, date, shop) is shared.
  type LegRow = {
    rowKey: string;
    saleId: string;
    legIndex: number;       // 0-based index within this sale's legs
    totalLegs: number;      // how many legs this sale has
    products: string;
    date: string;
    shop: string;
    isCreditSale: boolean;
    creditAmount: number;
    totalAmount: number;
    method: string;
    amount: number;
  };

  const filteredLegRows = useMemo(() => {
    const rows: LegRow[] = [];
    for (const sr of saleRows) {
      if (!inRange(sr.date, from, to)) continue;
      const searchStr = `${sr.products} ${sr.shop} ${sr.paymentMethod}`.toLowerCase();
      if (search && !searchStr.includes(search.toLowerCase())) continue;

      sr.legs.forEach((leg, idx) => {
        if (filterMethod !== "all" && leg.method !== filterMethod) return;
        rows.push({
          rowKey: `${sr.saleId}-leg-${idx}`,
          saleId: sr.saleId,
          legIndex: idx,
          totalLegs: sr.legs.length,
          products: sr.products,
          date: sr.date,
          shop: sr.shop,
          isCreditSale: sr.isCreditSale,
          creditAmount: sr.creditAmount,
          totalAmount: sr.totalAmount,
          method: leg.method,
          amount: leg.amount,
        });
      });
    }
    return rows;
  }, [saleRows, from, to, search, filterMethod]);

  const filteredCreditPayments = useMemo(() =>
    creditPayments.filter(cp => {
      const dateOk   = inRange(cp.paidAt, from, to);
      const searchOk = !search || `${cp.method} ${cp.shop} ${cp.note ?? ""}`.toLowerCase().includes(search.toLowerCase());
      return dateOk && searchOk;
    }),
  [creditPayments, from, to, search]);

  const filteredCreditSummaries = useMemo(() =>
    creditSummaries.filter(c => inRange(c.date, from, to)),
  [creditSummaries, from, to]);

  // ── Period totals ─────────────────────────────────────────────────────────
  const periodTotals = useMemo(() => {
    const sales    = filteredEntries.filter(e => e.type === "sale").reduce((s, e) => s + e.amount, 0);
    const downPay  = filteredEntries.filter(e => e.type === "credit_downpayment").reduce((s, e) => s + e.amount, 0);
    const install  = filteredEntries.filter(e => e.type === "credit_installment").reduce((s, e) => s + e.amount, 0);
    return { sales, downPay, install, total: sales + downPay + install };
  }, [filteredEntries]);

  const allMethods = Array.from(new Set(saleRows.flatMap(sr => sr.legs.map(l => l.method))));
  const totalCreditCollected = creditSummaries.reduce((s, c) => s + c.totalPaid, 0);
  const totalCreditDue       = creditSummaries.reduce((s, c) => s + c.due, 0);
  const totalCreditAmount    = creditSummaries.reduce((s, c) => s + c.amount, 0);

  const tabs = [
    { key: "all"            as ActiveTab, label: "All Money In",    icon: <BadgeDollarSign size={14} />, count: filteredEntries.length,         color: "indigo" },
    { key: "sales"          as ActiveTab, label: "Sale Payments",   icon: <ShoppingCart size={14} />,    count: filteredLegRows.length,          color: "violet" },
    { key: "credit"         as ActiveTab, label: "Credit Payments", icon: <CreditCard size={14} />,      count: filteredCreditPayments.length,   color: "orange" },
    { key: "credit_records" as ActiveTab, label: "Credit Records",  icon: <BarChart2 size={14} />,       count: filteredCreditSummaries.length,  color: "rose" },
  ];

  return (
    <>
      <style>{`
        .pay-table .col-sticky{position:sticky;left:0;z-index:10;box-shadow:4px 0 12px -4px rgba(0,0,0,0.06);clip-path:inset(0px -30px 0px 0px);}
        .pay-table thead .col-sticky{z-index:20;}
        @keyframes rowIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        .pay-table tbody tr{animation:rowIn 0.18s ease both}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .fade-up{animation:fadeUp 0.25s ease both}
        /* Sale group separator — first leg of a new sale gets a slightly stronger top border */
        .sale-group-start td { border-top: 2px solid #e2e8f0 !important; }
        /* Leg continuation rows — slightly indented product cell */
        .leg-continuation .product-cell { padding-left: 2.5rem !important; }
      `}</style>

      <div className="min-h-screen bg-slate-50 px-3 py-5 md:px-6">
        <div className="mx-auto max-w-screen-2xl space-y-5">

          {/* SHOP BANNER */}
          <div className="flex items-center gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-violet-50 px-5 py-3.5 shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-md">
              <Store size={17} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.6rem] font-bold uppercase tracking-widest text-indigo-400">Active Shop</p>
              <p className="font-bold text-indigo-900 truncate">{activeShop.name}</p>
            </div>
            {activeShop.location && (
              <div className="flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs text-gray-500 shadow-sm border border-gray-100 shrink-0">
                <MapPin size={11} /> {activeShop.location}
              </div>
            )}
            {isStaff && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200 shrink-0">Staff</span>}
            {isAdmin && <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700 border border-purple-200 shrink-0">Admin</span>}
          </div>

          {/* FILTER BAR */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white rounded-2xl border border-gray-200 px-4 py-3 shadow-sm">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-indigo-400" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Filter by Period</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {PERIODS.filter(p => p.key !== "custom").map(p => (
                <button key={p.key} onClick={() => setPeriod(p.key)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${period === p.key ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                  {p.label}
                </button>
              ))}
              <DatePicker period={period} customFrom={customFrom} customTo={customTo}
                onPeriod={setPeriod} onFrom={setCustomFrom} onTo={setCustomTo} />
            </div>
          </div>

          {/* PERIOD SUMMARY CARDS */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 fade-up">
            {[
              { label: "Sales Revenue",  value: periodTotals.sales,   bg: "bg-indigo-600",  icon: <ShoppingCart size={18} className="text-white" /> },
              { label: "Down Payments",  value: periodTotals.downPay, bg: "bg-amber-500",   icon: <ArrowDownCircle size={18} className="text-white" /> },
              { label: "Installments",   value: periodTotals.install, bg: "bg-emerald-600", icon: <BadgeDollarSign size={18} className="text-white" /> },
              { label: "Total Received", value: periodTotals.total,   bg: "bg-violet-600",  icon: <Wallet size={18} className="text-white" /> },
            ].map(c => (
              <div key={c.label} className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 p-4 shadow-sm">
                <div className={`absolute inset-0 opacity-[0.04] ${c.bg}`} />
                <div className="flex items-center gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow ${c.bg}`}>{c.icon}</div>
                  <div className="min-w-0">
                    <p className="text-[0.62rem] font-bold uppercase tracking-widest text-gray-400 truncate">{c.label}</p>
                    <p className="text-lg font-black tabular-nums text-gray-900">{fmt(c.value)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* BALANCE + CREDIT OVERVIEW */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative overflow-hidden rounded-2xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-5 shadow-sm">
              <div className="absolute top-0 left-0 right-0 h-1 bg-green-500 rounded-t-2xl" />
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-600 shadow"><Wallet size={19} className="text-white" /></div>
                <div>
                  <p className="text-[0.62rem] font-bold uppercase tracking-widest text-green-600">Available Balance</p>
                  <p className="text-2xl font-black tabular-nums text-green-900">{fmt(availableBalance)}</p>
                </div>
              </div>
              <div className="space-y-1 pt-2 border-t border-green-200">
                <div className="flex justify-between text-xs text-green-700"><span>Credit received</span><span className="font-bold">{fmt(totalCreditReceived)}</span></div>
                {totalCreditDownPayments > 0 && <div className="flex justify-between text-xs text-green-600 pl-3"><span>↳ Down payments</span><span>{fmt(totalCreditDownPayments)}</span></div>}
                {totalCreditInstallments > 0 && <div className="flex justify-between text-xs text-green-600 pl-3"><span>↳ Installments</span><span>{fmt(totalCreditInstallments)}</span></div>}
              </div>
            </div>

            {[
              {
                icon: <CreditCard size={19} className="text-white" />, bg: "bg-orange-500",
                border: "border-orange-200", from: "from-orange-50", to: "to-amber-50", accent: "bg-orange-500",
                label: "Credit Collected", labelColor: "text-orange-600",
                value: fmt(totalCreditCollected), sub: `of ${fmt(totalCreditAmount)} total`,
              },
              {
                icon: <TrendingDown size={19} className="text-white" />, bg: "bg-red-500",
                border: "border-red-200", from: "from-red-50", to: "to-rose-50", accent: "bg-red-500",
                label: "Outstanding Credit", labelColor: "text-red-600",
                value: fmt(totalCreditDue), sub: `${creditSummaries.filter(c => c.status !== "paid").length} unpaid`,
              },
              {
                icon: <CheckCircle2 size={19} className="text-white" />, bg: "bg-blue-500",
                border: "border-blue-200", from: "from-blue-50", to: "to-indigo-50", accent: "bg-blue-500",
                label: "Installments Received", labelColor: "text-blue-600",
                value: `${creditPayments.length} payments`, sub: fmt(totalCreditInstallments),
              },
            ].map(c => (
              <div key={c.label} className={`relative overflow-hidden rounded-2xl border ${c.border} bg-gradient-to-br ${c.from} ${c.to} p-5 shadow-sm`}>
                <div className={`absolute top-0 left-0 right-0 h-1 ${c.accent} rounded-t-2xl`} />
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${c.bg} shadow`}>{c.icon}</div>
                  <div>
                    <p className={`text-[0.62rem] font-bold uppercase tracking-widest ${c.labelColor}`}>{c.label}</p>
                    <p className="text-2xl font-black tabular-nums text-gray-900">{c.value}</p>
                    <p className={`text-xs ${c.labelColor} opacity-70 mt-0.5`}>{c.sub}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* PERIOD STATS BAR */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: "Today",      ...stats.today },
              { label: "This Week",  ...stats.week  },
              { label: "This Month", ...stats.month },
              { label: "This Year",  ...stats.year  },
              { label: "All Time",   ...stats.total },
            ].map(s => (
              <div key={s.label} className="relative overflow-hidden rounded-xl border border-gray-200 bg-white px-4 pt-4 pb-3 shadow-sm text-center">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-xl" />
                <p className="text-[0.62rem] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className="mt-1 text-xl font-black text-gray-900">{s.count}</p>
                <p className="text-xs text-green-700 font-semibold">{fmt(s.amount)}</p>
              </div>
            ))}
          </div>

          {/* TABS */}
          <div className="flex border-b border-gray-200 gap-1 overflow-x-auto">
            {tabs.map(t => {
              const colorMap: Record<string, string> = {
                indigo: "border-indigo-600 text-indigo-700",
                violet: "border-violet-600 text-violet-700",
                orange: "border-orange-500 text-orange-600",
                rose:   "border-rose-500 text-rose-600",
              };
              const badgeMap: Record<string, string> = {
                indigo: "bg-indigo-100 text-indigo-700",
                violet: "bg-violet-100 text-violet-700",
                orange: "bg-orange-100 text-orange-700",
                rose:   "bg-rose-100 text-rose-700",
              };
              const active = activeTab === t.key;
              return (
                <button key={t.key} onClick={() => setActiveTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-xs font-bold whitespace-nowrap border-b-2 -mb-px transition-colors ${active ? colorMap[t.color] : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                  {t.icon} {t.label}
                  <span className={`ml-1 text-[0.65rem] rounded-full px-2 py-0.5 ${active ? badgeMap[t.color] : "bg-gray-100 text-gray-500"}`}>{t.count}</span>
                </button>
              );
            })}
          </div>

          {/* SEARCH + FILTER ROW */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by product, method, shop…"
                className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs focus:border-indigo-400 focus:outline-none shadow-sm transition" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {activeTab === "all" && (
                <>
                  <ListFilter size={13} className="text-gray-400" />
                  {(["all", "sale", "credit_downpayment", "credit_installment"] as const).map(t => (
                    <button key={t} onClick={() => setTypeFilter(t)}
                      className={`px-3 py-1.5 rounded-lg text-[0.7rem] font-bold border transition-all ${typeFilter === t ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"}`}>
                      {t === "all" ? "All Types" : TYPE_CONFIG[t].label}
                    </button>
                  ))}
                </>
              )}
              {activeTab === "sales" && (
                <>
                  {["all", ...allMethods].map(m => (
                    <button key={m} onClick={() => setFilterMethod(m)}
                      className={`px-3 py-1.5 rounded-lg text-[0.7rem] font-bold border capitalize transition-all ${filterMethod === m ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"}`}>
                      {m === "all" ? "All Methods" : m}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

          {/* ══ TAB: ALL MONEY IN ══ */}
          {activeTab === "all" && (
            <div className="fade-up space-y-3">
              {filteredEntries.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {(["sale", "credit_downpayment", "credit_installment"] as const).map(t => {
                    const cfg = TYPE_CONFIG[t];
                    const total = filteredEntries.filter(e => e.type === t).reduce((s, e) => s + e.amount, 0);
                    const count = filteredEntries.filter(e => e.type === t).length;
                    return (
                      <div key={t} className={`rounded-xl border px-4 py-3 ${cfg.bg}`}>
                        <div className="flex items-center gap-1.5 mb-1">{cfg.icon}<span className="text-[0.65rem] font-bold uppercase tracking-wider">{cfg.label}</span></div>
                        <p className="text-lg font-black tabular-nums">{fmt(total)}</p>
                        <p className="text-[0.65rem] opacity-70">{count} entries</p>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-50 to-violet-50 px-5 py-3 border-b flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-700 flex items-center gap-2"><BadgeDollarSign size={14} /> All Money Received</h3>
                  <span className="text-xs text-indigo-600 bg-indigo-100 px-2.5 py-0.5 rounded-full font-semibold">{fmt(filteredEntries.reduce((s, e) => s + e.amount, 0))} total</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="pay-table w-full min-w-[720px] text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-200">
                        <th className="col-sticky px-4 py-3 text-left" style={{ backgroundColor: "#f8fafc" }}>
                          <div className="flex items-center gap-3">
                            <span className="text-[0.68rem] font-bold uppercase tracking-widest text-gray-400 w-5">#</span>
                            <span className="text-[0.68rem] font-bold uppercase tracking-widest text-gray-400">Description</span>
                          </div>
                        </th>
                        {["Amount", "Type", "Method", "Date", "Shop"].map(h => (
                          <th key={h} className="px-4 py-3 text-[0.68rem] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredEntries.map((e, i) => {
                        const cfg = TYPE_CONFIG[e.type];
                        return (
                          <tr key={e.id} className="bg-white hover:bg-slate-50 transition-colors"
                            style={{ animationDelay: `${Math.min(i * 0.02, 0.4)}s` }}>
                            <td className="col-sticky px-4 py-3" style={{ backgroundColor: "inherit" }}>
                              <div className="flex items-center gap-3">
                                <span className="text-[0.7rem] font-bold text-gray-300 w-5 text-center tabular-nums shrink-0">{i + 1}</span>
                                <div className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                                <p className="font-semibold text-gray-800 truncate max-w-[200px] text-[0.8rem]">{e.description || "—"}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3"><span className="tabular-nums text-[0.82rem] font-black text-gray-900">{fmt(e.amount)}</span></td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.68rem] font-bold ${cfg.bg}`}>{cfg.icon} {cfg.label}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[0.68rem] font-bold capitalize ${METHOD_STYLES[e.method] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
                                {METHOD_EMOJI[e.method] ?? "💰"} {e.method}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[0.73rem] text-gray-400 whitespace-nowrap">{e.date}</td>
                            <td className="px-4 py-3 text-[0.76rem] text-gray-600">{e.shop}</td>
                          </tr>
                        );
                      })}
                      {filteredEntries.length === 0 && (
                        <tr><td colSpan={6} className="py-20 text-center">
                          <Clock size={32} className="mx-auto text-gray-200 mb-2" />
                          <p className="text-gray-400 text-sm">No records in this period</p>
                        </td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══ TAB: SALE PAYMENTS ══ */}
          {activeTab === "sales" && (
            <div className="fade-up space-y-4">
              {/* Method breakdown chips */}
              {Object.keys(methodTotals).length > 0 && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                  {Object.entries(methodTotals).map(([method, amount]) => (
                    <div key={method} className="relative overflow-hidden rounded-xl border border-gray-200 bg-white px-4 pt-4 pb-3 shadow-sm text-center">
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-400 rounded-t-xl" />
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[0.68rem] font-bold capitalize border mb-1 ${METHOD_STYLES[method] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
                        {METHOD_EMOJI[method] ?? "💰"} {method}
                      </span>
                      <p className="text-lg font-black tabular-nums text-gray-900">{fmt(amount)}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                {/* Legend */}
                <div className="bg-gradient-to-r from-violet-50 to-indigo-50 px-5 py-3 border-b flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-violet-700 flex items-center gap-2"><Banknote size={14} /> Sale Payment Legs</h3>
                    <span className="text-[0.65rem] text-gray-500 bg-white/80 px-2 py-0.5 rounded-full border border-gray-200">Each row = one payment method used in a sale</span>
                  </div>
                  <span className="text-xs text-violet-600 bg-violet-100 px-2.5 py-0.5 rounded-full font-semibold">
                    {filteredLegRows.length} payment legs
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="pay-table w-full min-w-[760px] text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-200">
                        <th className="col-sticky px-4 py-3.5 text-left" style={{ backgroundColor: "#f8fafc" }}>
                          <div className="flex items-center gap-3">
                            <span className="text-[0.68rem] font-bold uppercase tracking-widest text-gray-400 w-5">#</span>
                            <span className="text-[0.68rem] font-bold uppercase tracking-widest text-gray-400">Product(s)</span>
                          </div>
                        </th>
                        {["Amount Paid", "Method", "Credit Balance", "Date", "Shop"].map(h => (
                          <th key={h} className="px-4 py-3.5 text-[0.68rem] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredLegRows.map((row, i) => {
                        const isFirst = row.legIndex === 0;
                        // Determine row styling: first leg of each sale gets darker separator
                        return (
                          <tr key={row.rowKey}
                            className={`bg-white hover:bg-slate-50 transition-colors ${isFirst && i > 0 ? "sale-group-start" : ""} ${!isFirst ? "leg-continuation" : ""}`}
                            style={{ animationDelay: `${Math.min(i * 0.02, 0.4)}s` }}>

                            {/* Product column — only show on first leg; continuation legs show indent + "↳" */}
                            <td className="col-sticky px-4 py-3 product-cell" style={{ backgroundColor: "inherit" }}>
                              <div className="flex items-center gap-3">
                                <span className="text-[0.7rem] font-bold text-gray-300 w-5 text-center tabular-nums shrink-0">{i + 1}</span>
                                {isFirst ? (
                                  <p className="font-semibold text-gray-800 truncate max-w-[200px] text-[0.8rem]">{row.products}</p>
                                ) : (
                                  <p className="text-[0.75rem] text-gray-400 truncate max-w-[200px] flex items-center gap-1">
                                    <span className="text-gray-300">↳</span>
                                    <span className="italic">{row.products}</span>
                                  </p>
                                )}
                              </div>
                            </td>

                            {/* Amount for THIS LEG ONLY */}
                            <td className="px-4 py-3">
                              <span className="tabular-nums text-[0.88rem] font-black text-gray-900">{fmt(row.amount)}</span>
                              {row.totalLegs > 1 && isFirst && (
                                <p className="text-[0.62rem] text-gray-400 mt-0.5">of {fmt(row.totalAmount)} total</p>
                              )}
                            </td>

                            {/* Method for this leg */}
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.72rem] font-bold capitalize ${METHOD_STYLES[row.method] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
                                {METHOD_EMOJI[row.method] ?? "💰"} {row.method}
                              </span>
                            </td>

                            {/* Credit balance — show only on first leg if it's a credit sale */}
                            <td className="px-4 py-3">
                              {isFirst && row.isCreditSale && row.creditAmount > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-orange-200 bg-orange-50 px-2.5 py-0.5 text-[0.68rem] font-bold text-orange-700">
                                  🤝 {fmt(row.creditAmount)} credit
                                </span>
                              ) : (
                                <span className="text-gray-300 text-xs">—</span>
                              )}
                            </td>

                            <td className="px-4 py-3 text-[0.73rem] text-gray-400 whitespace-nowrap">{row.date}</td>
                            <td className="px-4 py-3 text-[0.76rem] text-gray-600">{row.shop}</td>
                          </tr>
                        );
                      })}
                      {filteredLegRows.length === 0 && (
                        <tr><td colSpan={6} className="py-20 text-center text-gray-400 text-sm">No sale payments in this period</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══ TAB: CREDIT PAYMENTS ══ */}
          {activeTab === "credit" && (
            <div className="fade-up rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-5 py-3 border-b flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-widest text-orange-700 flex items-center gap-2"><CreditCard size={13} /> Credit Payment Transactions</h3>
                <span className="text-xs text-orange-600 bg-orange-100 px-2.5 py-0.5 rounded-full font-semibold">{fmt(filteredCreditPayments.reduce((s, cp) => s + cp.amount, 0))}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="pay-table w-full min-w-[760px] text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-200">
                      <th className="col-sticky px-4 py-3.5 text-left" style={{ backgroundColor: "#f8fafc" }}>
                        <div className="flex items-center gap-3">
                          <span className="text-[0.68rem] font-bold uppercase tracking-widest text-gray-400 w-5">#</span>
                          <span className="text-[0.68rem] font-bold uppercase tracking-widest text-gray-400">Amount Received</span>
                        </div>
                      </th>
                      {["Collected / Total", "Method", "Note", "Date Received", "Shop"].map(h => (
                        <th key={h} className="px-4 py-3.5 text-[0.68rem] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCreditPayments.map((cp, i) => {
                      const pct = Math.min(100, Math.round((cp.creditTotalPaid / cp.creditTotal) * 100));
                      return (
                        <tr key={cp.id} className="bg-white hover:bg-slate-50 transition-colors"
                          style={{ animationDelay: `${Math.min(i * 0.02, 0.4)}s` }}>
                          <td className="col-sticky px-4 py-3" style={{ backgroundColor: "inherit" }}>
                            <div className="flex items-center gap-3">
                              <span className="text-[0.7rem] font-bold text-gray-300 w-5 text-center tabular-nums shrink-0">{i + 1}</span>
                              <span className="font-black text-emerald-700 tabular-nums text-[0.82rem]">{fmt(cp.amount)}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-[0.8rem] text-gray-800 font-semibold tabular-nums">
                              {fmt(cp.creditTotalPaid)} <span className="text-gray-400 font-normal">/ {fmt(cp.creditTotal)}</span>
                            </div>
                            <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                              <div className={`h-full rounded-full ${pct >= 100 ? "bg-green-500" : "bg-orange-400"}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[0.65rem] text-gray-400">{pct}% collected</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.68rem] font-bold capitalize ${METHOD_STYLES[cp.method] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
                              {METHOD_EMOJI[cp.method] ?? "💰"} {cp.method}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[0.76rem] text-gray-500 max-w-[160px] truncate">{cp.note ?? "—"}</td>
                          <td className="px-4 py-3 text-[0.73rem] text-gray-400 whitespace-nowrap">{cp.paidAt}</td>
                          <td className="px-4 py-3 text-[0.76rem] text-gray-600">{cp.shop}</td>
                        </tr>
                      );
                    })}
                    {filteredCreditPayments.length === 0 && (
                      <tr><td colSpan={6} className="py-16 text-center text-gray-400 text-sm">No credit payments in this period</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══ TAB: CREDIT RECORDS ══ */}
          {activeTab === "credit_records" && (
            <div className="fade-up space-y-3">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total Credit",  value: filteredCreditSummaries.reduce((s, c) => s + c.amount, 0),    color: "text-gray-900", bg: "bg-white border-gray-200" },
                  { label: "Collected",     value: filteredCreditSummaries.reduce((s, c) => s + c.totalPaid, 0), color: "text-green-700", bg: "bg-green-50 border-green-200" },
                  { label: "Outstanding",   value: filteredCreditSummaries.reduce((s, c) => s + c.due, 0),       color: "text-red-700",   bg: "bg-red-50 border-red-200" },
                ].map(t => (
                  <div key={t.label} className={`rounded-xl border ${t.bg} px-4 py-3 shadow-sm`}>
                    <p className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400 mb-1">{t.label}</p>
                    <p className={`text-xl font-black tabular-nums ${t.color}`}>{fmt(t.value)}</p>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-rose-50 to-orange-50 px-5 py-3 border-b">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-rose-700 flex items-center gap-2"><AlertCircle size={13} /> Credit Records — Collection Progress</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="pay-table w-full min-w-[760px] text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-200">
                        <th className="col-sticky px-4 py-3.5 text-left" style={{ backgroundColor: "#f8fafc" }}>
                          <div className="flex items-center gap-3">
                            <span className="text-[0.68rem] font-bold uppercase tracking-widest text-gray-400 w-5">#</span>
                            <span className="text-[0.68rem] font-bold uppercase tracking-widest text-gray-400">Total Credit</span>
                          </div>
                        </th>
                        {["Collected", "Remaining", "Progress", "Status", "Due Date", "Date"].map(h => (
                          <th key={h} className="px-4 py-3.5 text-[0.68rem] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredCreditSummaries.map((c, i) => {
                        const pct = Math.min(100, Math.round((c.totalPaid / c.amount) * 100));
                        return (
                          <tr key={c.id} className="bg-white hover:bg-slate-50 transition-colors"
                            style={{ animationDelay: `${Math.min(i * 0.02, 0.4)}s` }}>
                            <td className="col-sticky px-4 py-3" style={{ backgroundColor: "inherit" }}>
                              <div className="flex items-center gap-3">
                                <span className="text-[0.7rem] font-bold text-gray-300 w-5 text-center tabular-nums shrink-0">{i + 1}</span>
                                <span className="tabular-nums text-[0.82rem] font-black text-gray-900">{fmt(c.amount)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-green-700 font-black text-[0.82rem] tabular-nums">{fmt(c.totalPaid)}</td>
                            <td className="px-4 py-3 text-red-600 font-black text-[0.82rem] tabular-nums">{fmt(c.due)}</td>
                            <td className="px-4 py-3 min-w-[140px]">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full ${pct >= 100 ? "bg-green-500" : pct > 0 ? "bg-orange-400" : "bg-gray-300"}`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-xs text-gray-500 shrink-0 tabular-nums">{pct}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.68rem] font-bold ${
                                c.status === "paid"    ? "bg-green-50 text-green-700 border-green-200" :
                                c.status === "partial" ? "bg-blue-50 text-blue-700 border-blue-200"   :
                                                         "bg-amber-50 text-amber-700 border-amber-200"
                              }`}>
                                {c.status === "paid" ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                {c.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[0.73rem] text-gray-400">{c.dueDate ?? "—"}</td>
                            <td className="px-4 py-3 text-[0.73rem] text-gray-400">{c.date}</td>
                          </tr>
                        );
                      })}
                      {filteredCreditSummaries.length === 0 && (
                        <tr><td colSpan={7} className="py-16 text-center text-gray-400 text-sm">No credit records in this period</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}