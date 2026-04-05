// app/reports/_components/ReportsView.tsx
"use client";

import { useState, useRef, useMemo } from "react";
import {
  TrendingUp, TrendingDown, ShoppingCart, CreditCard,
  DollarSign, Package, Truck, BarChart3, Building2,
  Wallet, ArrowUpDown, Star, Printer, Calendar, ChevronDown,
  Users, FileText, RefreshCw,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Summary = {
  sales: { count: number; amount: number };
  quotes: { count: number; amount: number };
  payments: { count: number; amount: number };
  expenses: { count: number; amount: number };
  credits: { count: number; amount: number; paid: number };
  advances: { count: number; amount: number };
  salaries: { count: number; amount: number };
  payrolls: { count: number; salary: number; payable: number };
  buys: { count: number; amount: number; fare: number };
  adjustments: { count: number };
  assets: { count: number; amount: number };
  suppliers: number;
  staff: number;
  products: number;
  margins: { count: number; amount: number };
  transactions: { count: number; amount: number };
};

type MonthlyData = { month: string; label: string; sales: number; expenses: number; profit: number };
type ActiveShop = { id: string; name: string; location: string };

export type DateRange = {
  preset: "today" | "week" | "month" | "year" | "custom";
  from: string;
  to: string;
};

type Props = {
  summary: Summary;
  monthlyData: MonthlyData[];
  activeShop: ActiveShop;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
};

type ReportType =
  | "overview" | "sales" | "payments" | "adjustments"
  | "stock" | "expenses" | "purchases" | "salaries" | "advance";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => `KSh ${n.toLocaleString()}`;

const PRESETS: { key: DateRange["preset"]; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week",  label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "year",  label: "This Year" },
  { key: "custom", label: "Custom Range" },
];

function presetToDates(preset: DateRange["preset"]): { from: string; to: string } {
  const now = new Date();
  const t = now.toISOString().split("T")[0];
  switch (preset) {
    case "today": return { from: t, to: t };
    case "week": {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      return { from: start.toISOString().split("T")[0], to: t };
    }
    case "month": return { from: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`, to: t };
    case "year":  return { from: `${now.getFullYear()}-01-01`, to: t };
    default:      return { from: t, to: t };
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  icon, label, value, sub, trend, color,
}: {
  icon: React.ReactNode; label: string; value: string;
  sub?: string; trend?: { pct: number };
  color: "emerald" | "rose" | "sky" | "violet" | "amber" | "teal";
}) {
  const palettes: Record<string, { bg: string; icon: string; val: string }> = {
    emerald: { bg: "bg-emerald-950/50 border-emerald-800/30", icon: "bg-emerald-900/60 text-emerald-400", val: "text-emerald-300" },
    rose:    { bg: "bg-rose-950/50 border-rose-800/30",       icon: "bg-rose-900/60 text-rose-400",       val: "text-rose-300" },
    sky:     { bg: "bg-sky-950/50 border-sky-800/30",         icon: "bg-sky-900/60 text-sky-400",         val: "text-sky-300" },
    violet:  { bg: "bg-violet-950/50 border-violet-800/30",   icon: "bg-violet-900/60 text-violet-400",   val: "text-violet-300" },
    amber:   { bg: "bg-amber-950/50 border-amber-800/30",     icon: "bg-amber-900/60 text-amber-400",     val: "text-amber-300" },
    teal:    { bg: "bg-teal-950/50 border-teal-800/30",       icon: "bg-teal-900/60 text-teal-400",       val: "text-teal-300" },
  };
  const p = palettes[color];
  return (
    <div className={`rounded-2xl border p-5 ${p.bg}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${p.icon}`}>{icon}</div>
        {trend && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${trend.pct >= 0 ? "bg-emerald-900/50 text-emerald-400" : "bg-rose-900/50 text-rose-400"}`}>
            {trend.pct >= 0 ? "↑" : "↓"} {Math.abs(trend.pct)}%
          </span>
        )}
      </div>
      <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1">{label}</p>
      <p className={`text-2xl font-black ${p.val}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </div>
  );
}

// Animated bar chart
function BarChart({
  data, keys, height = 200,
}: {
  data: { label: string; [k: string]: number | string }[];
  keys: { key: string; label: string; color: string }[];
  height?: number;
}) {
  const max = Math.max(...data.flatMap(d => keys.map(k => Number(d[k.key]) || 0)), 1);
  return (
    <div className="w-full overflow-x-auto">
      <div className="flex items-end gap-1.5 pb-6 min-w-max px-2" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex flex-col items-center gap-1 flex-1 min-w-[48px]">
            <div className="flex items-end gap-0.5 w-full" style={{ height: height - 40 }}>
              {keys.map(k => {
                const val = Number(d[k.key]) || 0;
                const pct = Math.round((val / max) * 100);
                return (
                  <div key={k.key} className="relative group flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t-lg min-h-[3px] transition-all duration-500 ${k.color}`}
                      style={{ height: `${pct}%` }}
                    />
                    <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 border border-gray-700 text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 transition-opacity">
                      <span className="font-semibold">{k.label}:</span> KSh {val.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
            <span className="text-[0.6rem] text-gray-500 text-center">{d.label}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-1 flex-wrap px-2">
        {keys.map(k => (
          <div key={k.key} className="flex items-center gap-1.5 text-xs text-gray-400">
            <div className={`w-3 h-3 rounded ${k.color}`} /> {k.label}
          </div>
        ))}
      </div>
    </div>
  );
}

// Donut chart (pure SVG) — fixed: no mutable variable reassignment during render
function DonutChart({ slices, size = 120 }: {
  slices: { label: string; value: number; color: string }[];
  size?: number;
}) {
  const total = slices.reduce((s, sl) => s + sl.value, 0) || 1;
  const r = size / 2 - 16;
  const cx = size / 2;
  const cy = size / 2;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // Build arcs using reduce to avoid mutating a variable after render
  const { arcs } = slices.reduce<{
    arcs: { label: string; value: number; color: string; d: string; pct: number }[];
    cumulative: number;
  }>(
    (acc, sl) => {
      const pct = sl.value / total;
      const angle = pct * 360;
      const start = acc.cumulative;
      const end = start + angle;
      const x1 = cx + r * Math.cos(toRad(start));
      const y1 = cy + r * Math.sin(toRad(start));
      const x2 = cx + r * Math.cos(toRad(end));
      const y2 = cy + r * Math.sin(toRad(end));
      const largeArc = angle > 180 ? 1 : 0;
      return {
        arcs: [
          ...acc.arcs,
          {
            ...sl,
            d: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`,
            pct: Math.round(pct * 100),
          },
        ],
        cumulative: end,
      };
    },
    { arcs: [], cumulative: -90 } // start from top
  );

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r - 6} fill="#111827" />
      {arcs.map((arc, i) => (
        <path key={i} d={arc.d} fill={arc.color} stroke="#111827" strokeWidth={2}>
          <title>{arc.label}: {arc.pct}%</title>
        </path>
      ))}
      <circle cx={cx} cy={cy} r={r - 12} fill="#111827" />
    </svg>
  );
}

// Horizontal bar (progress-style)
function HBar({ label, value, max, color = "bg-emerald-500" }: {
  label: string; value: number; max: number; color?: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-300 font-semibold">KSh {value.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Date range picker UI
function DateRangePicker({ range, onChange }: { range: DateRange; onChange: (r: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  const [localFrom, setLocalFrom] = useState(range.from);
  const [localTo, setLocalTo] = useState(range.to);

  const applyCustom = () => {
    onChange({ preset: "custom", from: localFrom, to: localTo });
    setOpen(false);
  };

  const label = PRESETS.find(p => p.key === range.preset)?.label ?? "Custom Range";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
      >
        <Calendar size={15} className="text-emerald-400" />
        <span>{label}</span>
        {range.preset !== "today" && (
          <span className="text-gray-500 text-xs hidden sm:inline">
            {range.from} → {range.to}
          </span>
        )}
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl p-4 w-72">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Select Period</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {PRESETS.filter(p => p.key !== "custom").map(p => (
              <button
                key={p.key}
                onClick={() => {
                  const dates = presetToDates(p.key);
                  onChange({ preset: p.key, ...dates });
                  setOpen(false);
                }}
                className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all ${
                  range.preset === p.key
                    ? "bg-emerald-600 text-white"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="border-t border-gray-800 pt-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500">Custom Range</p>
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={localFrom}
                onChange={e => setLocalFrom(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-2 py-1.5 text-xs"
              />
              <span className="text-gray-600">→</span>
              <input
                type="date"
                value={localTo}
                min={localFrom}
                onChange={e => setLocalTo(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-2 py-1.5 text-xs"
              />
            </div>
            <button
              onClick={applyCustom}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-sm font-semibold transition-colors"
            >
              Apply Range
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReportsView({ summary, monthlyData, activeShop, dateRange, onDateRangeChange }: Props) {
  const [activeReport, setActiveReport] = useState<ReportType>("overview");
  const printRef = useRef<HTMLDivElement>(null);

  const profit    = summary.sales.amount - summary.expenses.amount;
  const creditDue = summary.credits.amount - summary.credits.paid;

  const filteredMonthly = useMemo(() => {
    const from = new Date(dateRange.from + "T00:00:00");
    const to   = new Date(dateRange.to   + "T23:59:59");
    return monthlyData.filter(m => {
      const d = new Date(m.month + "-01");
      return d >= new Date(from.getFullYear(), from.getMonth(), 1) &&
             d <= new Date(to.getFullYear(),   to.getMonth(),   1);
    });
  }, [monthlyData, dateRange]);

  const displayMonthly = filteredMonthly.length > 0 ? filteredMonthly : monthlyData;

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Report — ${activeReport} — ${activeShop.name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Georgia', serif; padding: 32px; color: #111; background: #fff; }
        h1 { font-size: 22px; margin-bottom: 4px; }
        h2 { font-size: 16px; margin: 20px 0 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
        .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; }
        .card-label { font-size: 10px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.06em; }
        .card-value { font-size: 20px; font-weight: bold; margin-top: 4px; }
        .card-sub { font-size: 11px; color: #9ca3af; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { text-align: left; padding: 8px 12px; background: #f9fafb; border-bottom: 2px solid #e5e7eb; font-size: 10px; text-transform: uppercase; }
        td { padding: 7px 12px; border-bottom: 1px solid #f3f4f6; }
        .pos { color: #059669; font-weight: bold; }
        .neg { color: #dc2626; font-weight: bold; }
        .meta { font-size: 11px; color: #9ca3af; margin-bottom: 20px; }
      </style></head><body>${content}</body></html>
    `);
    win.document.close(); win.focus(); win.print(); win.close();
  };

  const reportTypes: { key: ReportType; label: string; icon: React.ReactNode }[] = [
    { key: "overview",    label: "Overview",    icon: <BarChart3 size={14} /> },
    { key: "sales",       label: "Sales",       icon: <ShoppingCart size={14} /> },
    { key: "payments",    label: "Payments",    icon: <CreditCard size={14} /> },
    { key: "expenses",    label: "Expenses",    icon: <TrendingDown size={14} /> },
    { key: "purchases",   label: "Purchases",   icon: <Truck size={14} /> },
    { key: "salaries",    label: "Salaries",    icon: <DollarSign size={14} /> },
    { key: "advance",     label: "Advances",    icon: <Wallet size={14} /> },
    { key: "adjustments", label: "Adjustments", icon: <ArrowUpDown size={14} /> },
    { key: "stock",       label: "Stock",       icon: <Package size={14} /> },
  ];

  const revenueSlices = [
    { label: "Sales",    value: summary.sales.amount,    color: "#10b981" },
    { label: "Payments", value: summary.payments.amount, color: "#0ea5e9" },
    { label: "Quotes",   value: summary.quotes.amount,   color: "#8b5cf6" },
  ].filter(s => s.value > 0);

  const costSlices = [
    { label: "Expenses",  value: summary.expenses.amount, color: "#f43f5e" },
    { label: "Purchases", value: summary.buys.amount,     color: "#f97316" },
    { label: "Salaries",  value: summary.salaries.amount, color: "#a78bfa" },
    { label: "Advances",  value: summary.advances.amount, color: "#fb923c" },
  ].filter(s => s.value > 0);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ── TOP BAR ── */}
      <div className="sticky top-0 z-30 border-b border-gray-800/80 bg-gray-950/95 backdrop-blur px-4 py-3 md:px-6">
        <div className="mx-auto max-w-screen-2xl flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight text-white flex items-center gap-2.5">
              <BarChart3 size={22} className="text-emerald-400" />
              Analytics & Reports
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">{activeShop.name} · {activeShop.location}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <DateRangePicker range={dateRange} onChange={onDateRangeChange} />
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-emerald-700 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            >
              <Printer size={14} /> Print
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-2xl px-4 py-6 md:px-6 space-y-6">
        {/* ── REPORT TYPE TABS ── */}
        <div className="flex flex-wrap gap-1.5">
          {reportTypes.map(r => (
            <button
              key={r.key}
              onClick={() => setActiveReport(r.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                activeReport === r.key
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/30"
                  : "bg-gray-800/80 text-gray-400 hover:bg-gray-700 hover:text-white"
              }`}
            >
              {r.icon} {r.label}
            </button>
          ))}
        </div>

        <div ref={printRef}>
          {/* ── PRINT HEADER ── */}
          <div className="hidden print:block mb-6">
            <h1 className="text-xl font-bold">{activeShop.name} — {activeReport.charAt(0).toUpperCase() + activeReport.slice(1)} Report</h1>
            <p className="text-sm text-gray-500">
              Period: {dateRange.from} to {dateRange.to} · Generated: {new Date().toLocaleDateString("en-KE", { dateStyle: "full" })}
            </p>
            <hr className="mt-3 border-gray-300" />
          </div>

          {/* ══ OVERVIEW ══ */}
          {activeReport === "overview" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <KpiCard icon={<TrendingUp size={20} />}   label="Total Revenue" value={fmt(summary.sales.amount)}    sub={`${summary.sales.count} transactions`}  color="emerald" />
                <KpiCard icon={<TrendingDown size={20} />} label="Total Expenses" value={fmt(summary.expenses.amount)} sub={`${summary.expenses.count} records`}     color="rose" />
                <KpiCard icon={<Star size={20} />}         label="Net Profit"    value={fmt(profit)}                   sub={profit >= 0 ? "Positive margin" : "Loss"} color={profit >= 0 ? "emerald" : "rose"} />
                <KpiCard icon={<Building2 size={20} />}    label="Asset Value"   value={fmt(summary.assets.amount)}   sub={`${summary.assets.count} assets`}         color="sky" />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Credits Due", val: fmt(creditDue),              sub: `${summary.credits.count} open credits`, color: "text-amber-400" },
                  { label: "Staff",       val: summary.staff.toString(),    sub: "team members",                          color: "text-sky-400" },
                  { label: "Products",    val: summary.products.toString(), sub: "SKUs tracked",                          color: "text-violet-400" },
                  { label: "Suppliers",   val: summary.suppliers.toString(), sub: "active suppliers",                     color: "text-orange-400" },
                ].map(k => (
                  <div key={k.label} className="rounded-2xl bg-gray-900 border border-gray-800 p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-1">{k.label}</p>
                    <p className={`text-2xl font-black ${k.color}`}>{k.val}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{k.sub}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp size={16} className="text-emerald-400" /> Sales vs Expenses vs Profit
                  </h2>
                  <span className="text-xs text-gray-500">{displayMonthly.length} months shown</span>
                </div>
                <BarChart
                  data={displayMonthly.map(m => ({ label: m.label, sales: m.sales, expenses: m.expenses, profit: Math.max(0, m.profit) }))}
                  keys={[
                    { key: "sales",    label: "Sales",    color: "bg-emerald-500" },
                    { key: "expenses", label: "Expenses", color: "bg-rose-500" },
                    { key: "profit",   label: "Profit",   color: "bg-sky-500" },
                  ]}
                  height={220}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5">
                  <h3 className="text-sm font-bold text-white mb-4">Revenue Sources</h3>
                  <div className="flex items-center gap-6">
                    <DonutChart slices={revenueSlices} size={130} />
                    <div className="flex-1 space-y-2.5">
                      {revenueSlices.map(s => (
                        <div key={s.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full inline-block" style={{ background: s.color }} />
                              {s.label}
                            </span>
                            <span className="text-gray-300 font-semibold">KSh {s.value.toLocaleString()}</span>
                          </div>
                          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.round(s.value / (revenueSlices.reduce((a, b) => a + b.value, 0) || 1) * 100)}%`,
                                background: s.color,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5">
                  <h3 className="text-sm font-bold text-white mb-4">Cost Breakdown</h3>
                  <div className="flex items-center gap-6">
                    <DonutChart slices={costSlices} size={130} />
                    <div className="flex-1 space-y-2.5">
                      {costSlices.map(s => (
                        <div key={s.label}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-gray-400 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full inline-block" style={{ background: s.color }} />
                              {s.label}
                            </span>
                            <span className="text-gray-300 font-semibold">KSh {s.value.toLocaleString()}</span>
                          </div>
                          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.round(s.value / (costSlices.reduce((a, b) => a + b.value, 0) || 1) * 100)}%`,
                                background: s.color,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5 space-y-4">
                  <h3 className="text-sm font-bold text-white">Revenue Channels</h3>
                  <HBar label="Sales Revenue"     value={summary.sales.amount}    max={summary.sales.amount + summary.payments.amount} color="bg-emerald-500" />
                  <HBar label="Payments Received" value={summary.payments.amount} max={summary.sales.amount + summary.payments.amount} color="bg-sky-500" />
                  <HBar label="Quote Pipeline"    value={summary.quotes.amount}   max={summary.sales.amount + summary.payments.amount} color="bg-violet-500" />
                  <HBar label="Profit Margins"    value={summary.margins.amount}  max={summary.sales.amount + summary.payments.amount} color="bg-amber-500" />
                </div>
                <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5 space-y-4">
                  <h3 className="text-sm font-bold text-white">Cost Channels</h3>
                  <HBar label="Operating Expenses" value={summary.expenses.amount} max={summary.buys.amount + summary.expenses.amount + summary.salaries.amount} color="bg-rose-500" />
                  <HBar label="Purchases (COGS)"   value={summary.buys.amount}     max={summary.buys.amount + summary.expenses.amount + summary.salaries.amount} color="bg-orange-500" />
                  <HBar label="Salaries"           value={summary.salaries.amount} max={summary.buys.amount + summary.expenses.amount + summary.salaries.amount} color="bg-pink-500" />
                  <HBar label="Staff Advances"     value={summary.advances.amount} max={summary.buys.amount + summary.expenses.amount + summary.salaries.amount} color="bg-fuchsia-500" />
                </div>
              </div>

              <div className="rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-2">
                  <FileText size={16} className="text-gray-500" />
                  <h2 className="text-sm font-bold text-white">Full Modules Summary</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-800/60">
                      <tr>
                        {["Module", "Count", "Amount / Value", "Notes"].map(h => (
                          <th key={h} className="px-5 py-3 text-left text-[0.68rem] font-bold uppercase tracking-widest text-gray-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {[
                        { m: "💰 Sales",        count: summary.sales.count,        amt: fmt(summary.sales.amount),        note: "Total revenue" },
                        { m: "📋 Quotes",       count: summary.quotes.count,       amt: fmt(summary.quotes.amount),       note: "Pending conversions" },
                        { m: "💳 Payments",     count: summary.payments.count,     amt: fmt(summary.payments.amount),     note: "Received" },
                        { m: "🧾 Expenses",     count: summary.expenses.count,     amt: fmt(summary.expenses.amount),     note: "Operating costs" },
                        { m: "🤝 Credits",      count: summary.credits.count,      amt: `${fmt(creditDue)} due`,          note: `Paid: ${fmt(summary.credits.paid)}` },
                        { m: "💸 Advances",     count: summary.advances.count,     amt: fmt(summary.advances.amount),     note: "Staff advances" },
                        { m: "👔 Salaries",     count: summary.salaries.count,     amt: fmt(summary.salaries.amount),     note: "Paid out" },
                        { m: "📊 Payroll",      count: summary.payrolls.count,     amt: fmt(summary.payrolls.payable),    note: `Gross: ${fmt(summary.payrolls.salary)}` },
                        { m: "🛒 Purchases",    count: summary.buys.count,         amt: fmt(summary.buys.amount),         note: `Fare: ${fmt(summary.buys.fare)}` },
                        { m: "📦 Assets",       count: summary.assets.count,       amt: fmt(summary.assets.amount),       note: "Asset value" },
                        { m: "🔄 Adjustments",  count: summary.adjustments.count,  amt: "—",                              note: "Stock adjustments" },
                        { m: "🏪 Suppliers",    count: summary.suppliers,          amt: "—",                              note: "Active" },
                        { m: "👥 Staff",        count: summary.staff,              amt: "—",                              note: "Team members" },
                        { m: "📱 Products",     count: summary.products,           amt: "—",                              note: "SKUs" },
                        { m: "📈 Margins",      count: summary.margins.count,      amt: fmt(summary.margins.amount),      note: "Profit margins" },
                        { m: "💼 Transactions", count: summary.transactions.count, amt: fmt(summary.transactions.amount), note: "Wallet" },
                      ].map(row => (
                        <tr key={row.m} className="hover:bg-gray-800/40 transition-colors">
                          <td className="px-5 py-3 font-semibold text-white text-sm">{row.m}</td>
                          <td className="px-5 py-3 text-gray-400 tabular-nums">{row.count.toLocaleString()}</td>
                          <td className="px-5 py-3 text-emerald-400 font-semibold">{row.amt}</td>
                          <td className="px-5 py-3 text-gray-600 text-xs">{row.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ══ SALES ══ */}
          {activeReport === "sales" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <KpiCard icon={<ShoppingCart size={20} />} label="Total Sales"     value={summary.sales.count.toLocaleString()} sub="transactions" color="emerald" />
                <KpiCard icon={<TrendingUp size={20} />}   label="Revenue"         value={fmt(summary.sales.amount)}            sub="gross revenue" color="sky" />
                <KpiCard icon={<Star size={20} />}         label="Avg Transaction" value={summary.sales.count > 0 ? fmt(Math.round(summary.sales.amount / summary.sales.count)) : "KSh 0"} sub="per sale" color="violet" />
              </div>
              <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5">
                <h3 className="text-sm font-bold text-white mb-4">Monthly Sales Trend</h3>
                <BarChart
                  data={displayMonthly.map(m => ({ label: m.label, sales: m.sales }))}
                  keys={[{ key: "sales", label: "Sales", color: "bg-emerald-500" }]}
                  height={200}
                />
              </div>
              <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5 space-y-3">
                <h3 className="text-sm font-bold text-white">Sales Performance</h3>
                {displayMonthly.map(m => (
                  <HBar key={m.month} label={m.label} value={m.sales} max={Math.max(...displayMonthly.map(x => x.sales), 1)} color="bg-emerald-500" />
                ))}
              </div>
            </div>
          )}

          {/* ══ PAYMENTS ══ */}
          {activeReport === "payments" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <KpiCard icon={<CreditCard size={20} />} label="Total Payments" value={summary.payments.count.toLocaleString()} sub="received"   color="sky" />
                <KpiCard icon={<DollarSign size={20} />} label="Amount"         value={fmt(summary.payments.amount)}            sub="collected"  color="emerald" />
                <KpiCard icon={<Star size={20} />}       label="Avg Payment"    value={summary.payments.count > 0 ? fmt(Math.round(summary.payments.amount / summary.payments.count)) : "KSh 0"} sub="per payment" color="violet" />
              </div>
              <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5">
                <h3 className="text-sm font-bold text-white mb-3">Credit Status</h3>
                <div className="space-y-3">
                  <HBar label="Collected"   value={summary.credits.paid}          max={summary.credits.amount} color="bg-emerald-500" />
                  <HBar label="Outstanding" value={Math.max(0, creditDue)}        max={summary.credits.amount} color="bg-rose-500" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { l: "Total Credit", v: fmt(summary.credits.amount), c: "text-white" },
                    { l: "Collected",    v: fmt(summary.credits.paid),   c: "text-emerald-400" },
                    { l: "Outstanding",  v: fmt(creditDue),              c: "text-rose-400" },
                  ].map(x => (
                    <div key={x.l} className="rounded-xl bg-gray-800 p-3 text-center">
                      <p className="text-xs text-gray-500 mb-1">{x.l}</p>
                      <p className={`text-sm font-bold ${x.c}`}>{x.v}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ EXPENSES ══ */}
          {activeReport === "expenses" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <KpiCard icon={<TrendingDown size={20} />} label="Expense Records" value={summary.expenses.count.toLocaleString()} sub="entries"     color="rose" />
                <KpiCard icon={<DollarSign size={20} />}   label="Total Spent"     value={fmt(summary.expenses.amount)}            sub="operational" color="amber" />
                <KpiCard icon={<Star size={20} />}         label="Avg Expense"     value={summary.expenses.count > 0 ? fmt(Math.round(summary.expenses.amount / summary.expenses.count)) : "KSh 0"} sub="per entry" color="violet" />
              </div>
              <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5">
                <h3 className="text-sm font-bold text-white mb-4">Monthly Expense Trend</h3>
                <BarChart
                  data={displayMonthly.map(m => ({ label: m.label, expenses: m.expenses }))}
                  keys={[{ key: "expenses", label: "Expenses", color: "bg-rose-500" }]}
                  height={200}
                />
              </div>
            </div>
          )}

          {/* ══ PURCHASES ══ */}
          {activeReport === "purchases" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <KpiCard icon={<Truck size={20} />}      label="Purchase Orders" value={summary.buys.count.toLocaleString()}  sub="orders"           color="amber" />
                <KpiCard icon={<DollarSign size={20} />} label="Stock Cost"      value={fmt(summary.buys.amount)}             sub="goods purchased"  color="emerald" />
                <KpiCard icon={<Package size={20} />}    label="Transport Cost"  value={fmt(summary.buys.fare)}               sub="freight & delivery" color="sky" />
              </div>
              <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5 space-y-3">
                <h3 className="text-sm font-bold text-white">Purchase Breakdown</h3>
                <HBar label="Goods Cost"     value={summary.buys.amount} max={summary.buys.amount + summary.buys.fare} color="bg-amber-500" />
                <HBar label="Transport Cost" value={summary.buys.fare}   max={summary.buys.amount + summary.buys.fare} color="bg-orange-500" />
              </div>
            </div>
          )}

          {/* ══ SALARIES ══ */}
          {activeReport === "salaries" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <KpiCard icon={<Users size={20} />}      label="Staff"          value={summary.staff.toLocaleString()}        sub="employees"                                      color="violet" />
                <KpiCard icon={<DollarSign size={20} />} label="Total Salaries" value={fmt(summary.salaries.amount)}          sub="paid out"                                       color="emerald" />
                <KpiCard icon={<RefreshCw size={20} />}  label="Payroll Net"    value={fmt(summary.payrolls.payable)}         sub={`Gross: ${fmt(summary.payrolls.salary)}`}       color="sky" />
              </div>
              <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5 space-y-3">
                <h3 className="text-sm font-bold text-white">Payroll Overview</h3>
                <HBar label="Gross Salary" value={summary.payrolls.salary}  max={summary.payrolls.salary} color="bg-violet-500" />
                <HBar label="Net Payable"  value={summary.payrolls.payable} max={summary.payrolls.salary} color="bg-emerald-500" />
                <HBar label="Advances"     value={summary.advances.amount}  max={summary.payrolls.salary} color="bg-rose-500" />
              </div>
            </div>
          )}

          {/* ══ ADVANCES ══ */}
          {activeReport === "advance" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <KpiCard icon={<Wallet size={20} />}     label="Advance Requests" value={summary.advances.count.toLocaleString()} sub="total requests" color="amber" />
                <KpiCard icon={<DollarSign size={20} />} label="Total Advanced"   value={fmt(summary.advances.amount)}            sub="staff advances" color="rose" />
                <KpiCard icon={<Star size={20} />}       label="Avg Advance"      value={summary.advances.count > 0 ? fmt(Math.round(summary.advances.amount / summary.advances.count)) : "KSh 0"} sub="per request" color="violet" />
              </div>
            </div>
          )}

          {/* ══ ADJUSTMENTS ══ */}
          {activeReport === "adjustments" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <KpiCard icon={<ArrowUpDown size={20} />} label="Adjustments" value={summary.adjustments.count.toLocaleString()} sub="stock changes" color="sky" />
                <KpiCard icon={<Package size={20} />}     label="Products"    value={summary.products.toLocaleString()}           sub="tracked SKUs"  color="violet" />
                <KpiCard icon={<Users size={20} />}       label="Staff"       value={summary.staff.toLocaleString()}              sub="team members"  color="emerald" />
              </div>
            </div>
          )}

          {/* ══ STOCK ══ */}
          {activeReport === "stock" && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <KpiCard icon={<Package size={20} />}   label="Products"  value={summary.products.toLocaleString()}   sub="active SKUs"       color="teal" />
                <KpiCard icon={<Truck size={20} />}     label="Suppliers" value={summary.suppliers.toLocaleString()}  sub="active suppliers"  color="amber" />
                <KpiCard icon={<Building2 size={20} />} label="Assets"    value={fmt(summary.assets.amount)}          sub={`${summary.assets.count} items`} color="sky" />
              </div>
              <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5 space-y-3">
                <h3 className="text-sm font-bold text-white">Inventory Health</h3>
                <HBar label="Asset Value"    value={summary.assets.amount} max={summary.assets.amount + summary.buys.amount} color="bg-sky-500" />
                <HBar label="Purchase Value" value={summary.buys.amount}   max={summary.assets.amount + summary.buys.amount} color="bg-amber-500" />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}