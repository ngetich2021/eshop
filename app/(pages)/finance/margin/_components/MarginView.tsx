// app/wallet/margins/_components/MarginView.tsx
"use client";

import { useState, useMemo } from "react";
import { TrendingUp, ShoppingCart, BarChart3, Calendar, Filter } from "lucide-react";

type SaleItemMargin = { date: string; profit: number; revenue: number; cost: number };
type ActiveShop = { id: string; name: string; location: string };
type Props = {
  activeShop: ActiveShop;
  isStaff: boolean;
  isAdmin: boolean;
  soldProfit: number;
  soldRevenue: number;
  soldCost: number;
  currentStockValue: number;
  currentStockCost: number;
  currentStockProfit: number;
  saleItems: SaleItemMargin[];
};
type Period = "day" | "week" | "month" | "year";
type FilterMode = "period" | "range" | "specific";

function groupByPeriod(items: SaleItemMargin[], period: Period) {
  const map: Record<string, { profit: number; revenue: number; cost: number }> = {};
  items.forEach((item) => {
    const d = new Date(item.date);
    let key: string;
    if (period === "day") {
      key = d.toISOString().split("T")[0];
    } else if (period === "week") {
      const start = new Date(d);
      start.setDate(d.getDate() - d.getDay());
      key = start.toISOString().split("T")[0];
    } else if (period === "month") {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    } else {
      key = `${d.getFullYear()}`;
    }
    if (!map[key]) map[key] = { profit: 0, revenue: 0, cost: 0 };
    map[key].profit  += item.profit;
    map[key].revenue += item.revenue;
    map[key].cost    += item.cost;
  });
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([key, val]) => ({ key, ...val }));
}

function formatPeriodLabel(key: string, period: Period): string {
  if (period === "day") {
    return new Date(key).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
  } else if (period === "week") {
    const start = new Date(key);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return `${start.toLocaleDateString("en-KE", { day: "numeric", month: "short" })} – ${end.toLocaleDateString("en-KE", { day: "numeric", month: "short" })}`;
  } else if (period === "month") {
    const [y, m] = key.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-KE", { month: "short", year: "numeric" });
  } else {
    return key;
  }
}

export default function MarginView({
  activeShop,
  soldProfit, soldRevenue, soldCost,
  currentStockValue, currentStockCost, currentStockProfit,
  saleItems,
}: Props) {
  const [period, setPeriod]         = useState<Period>("month");
  const [filterMode, setFilterMode] = useState<FilterMode>("period");

  const today = new Date().toISOString().split("T")[0];
  const [rangeFrom, setRangeFrom]   = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0]; });
  const [rangeTo, setRangeTo]       = useState(today);
  const [specificDate, setSpecificDate] = useState(today);

  const filteredItems = useMemo(() => {
    if (filterMode === "range")    return saleItems.filter((i) => i.date >= rangeFrom && i.date <= rangeTo);
    if (filterMode === "specific") return saleItems.filter((i) => i.date === specificDate);
    return saleItems;
  }, [saleItems, filterMode, rangeFrom, rangeTo, specificDate]);

  const effectivePeriod: Period = filterMode !== "period" ? "day" : period;
  const grouped   = groupByPeriod(filteredItems, effectivePeriod);
  const maxProfit = Math.max(...grouped.map((g) => g.profit), 1);

  const filteredTotals = grouped.reduce(
    (acc, g) => ({ profit: acc.profit + g.profit, revenue: acc.revenue + g.revenue, cost: acc.cost + g.cost }),
    { profit: 0, revenue: 0, cost: 0 }
  );

  const marginPercent      = soldRevenue > 0 ? ((soldProfit / soldRevenue) * 100).toFixed(1) : "0.0";
  const filteredMarginPct  = filteredTotals.revenue > 0 ? ((filteredTotals.profit / filteredTotals.revenue) * 100).toFixed(1) : "0.0";
  const stockMarginPercent = currentStockValue > 0 ? ((currentStockProfit / currentStockValue) * 100).toFixed(1) : "0.0";

  const periods: { key: Period; label: string }[] = [
    { key: "day", label: "Daily" }, { key: "week", label: "Weekly" },
    { key: "month", label: "Monthly" }, { key: "year", label: "Yearly" },
  ];

  return (
    <>
      {/* ── shared table styles (same pattern as BuyView) ── */}
      <style>{`
        .margin-table .col-sticky { position:sticky;left:0;z-index:10;box-shadow:6px 0 18px -6px rgba(0,0,0,0.06);clip-path:inset(0px -30px 0px 0px); }
        .margin-table thead .col-sticky { z-index:20; }
        .margin-scroll-wrap { position:relative }
        .margin-scroll-wrap::after { content:'';position:absolute;top:0;right:0;bottom:0;width:48px;background:linear-gradient(to right,transparent,rgba(248,250,252,0.7));pointer-events:none;z-index:5;border-radius:0 16px 16px 0 }
        @keyframes rowIn { from{opacity:0;transform:translateX(-5px)} to{opacity:1;transform:translateX(0)} }
        .margin-table tbody tr { animation:rowIn 0.2s ease both }
      `}</style>

      <div className="min-h-screen bg-gray-50/80 px-4 py-6 md:px-6">
        <div className="mx-auto max-w-screen-2xl space-y-6">

          {/* HEADER */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 size={24} className="text-violet-600" /> Margin Analytics
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {activeShop.name} — profit & margin data from sales and current stock
            </p>
          </div>

          {/* ── FILTER CONTROLS */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-violet-500" />
              <span className="text-sm font-bold text-gray-700">Filter Data</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: "period"   as FilterMode, label: "📅 By Period" },
                { key: "range"    as FilterMode, label: "📆 Date Range" },
                { key: "specific" as FilterMode, label: "🎯 Specific Date" },
              ].map((m) => (
                <button key={m.key} onClick={() => setFilterMode(m.key)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    filterMode === m.key ? "bg-violet-600 text-white shadow" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>
                  {m.label}
                </button>
              ))}
            </div>

            {filterMode === "period" && (
              <div className="flex gap-2 flex-wrap">
                {periods.map((p) => (
                  <button key={p.key} onClick={() => setPeriod(p.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      period === p.key ? "bg-violet-100 text-violet-700 border border-violet-300" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}>
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {filterMode === "range" && (
              <div className="flex items-center gap-3 flex-wrap">
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">From</label>
                  <input type="date" value={rangeFrom} onChange={(e) => setRangeFrom(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-400" />
                </div>
                <div className="text-gray-400 mt-5">→</div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">To</label>
                  <input type="date" value={rangeTo} onChange={(e) => setRangeTo(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-400" />
                </div>
                <div className="flex flex-col gap-1 mt-4">
                  <span className="text-xs text-gray-400">Quick:</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {[
                      { label: "Today",      fn: () => { setRangeFrom(today); setRangeTo(today); } },
                      { label: "This week",  fn: () => { const d = new Date(); const s = new Date(d); s.setDate(d.getDate() - d.getDay()); setRangeFrom(s.toISOString().split("T")[0]); setRangeTo(today); } },
                      { label: "This month", fn: () => { const d = new Date(); const s = new Date(d.getFullYear(), d.getMonth(), 1); setRangeFrom(s.toISOString().split("T")[0]); setRangeTo(today); } },
                      { label: "This year",  fn: () => { const d = new Date(); setRangeFrom(`${d.getFullYear()}-01-01`); setRangeTo(today); } },
                    ].map((q) => (
                      <button key={q.label} onClick={q.fn}
                        className="px-2 py-1 text-xs bg-violet-50 text-violet-700 hover:bg-violet-100 rounded-lg border border-violet-200">
                        {q.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {filterMode === "specific" && (
              <div className="flex items-center gap-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Date</label>
                  <input type="date" value={specificDate} onChange={(e) => setSpecificDate(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-400" />
                </div>
                <div className="mt-5 text-sm text-gray-500">
                  Showing data for:{" "}
                  <span className="font-semibold text-gray-700">
                    {new Date(specificDate).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })}
                  </span>
                </div>
              </div>
            )}

            {filterMode !== "period" && (
              <div className="grid grid-cols-3 gap-3 bg-violet-50 rounded-xl p-3 mt-2">
                <div className="text-center">
                  <div className="text-xs text-gray-500">Revenue (filtered)</div>
                  <div className="font-bold text-blue-700">KSh {filteredTotals.revenue.toLocaleString()}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Profit (filtered)</div>
                  <div className={`font-bold ${filteredTotals.profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    KSh {filteredTotals.profit.toLocaleString()}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Margin %</div>
                  <div className="font-bold text-violet-700">{filteredMarginPct}%</div>
                </div>
              </div>
            )}
          </div>

          {/* ── SOLD STOCK METRICS */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">📦 All-Time Sold Stock Performance</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MetricCard icon={<TrendingUp size={18} className="text-emerald-600" />} bg="from-emerald-50 to-green-50" border="border-emerald-200" iconBg="bg-emerald-100" labelColor="text-emerald-600" label="Total Sales Profit" value={`KSh ${soldProfit.toLocaleString()}`} sub={`Revenue: KSh ${soldRevenue.toLocaleString()} | Cost: KSh ${soldCost.toLocaleString()}`} />
              <MetricCard icon={<ShoppingCart size={18} className="text-blue-600" />} bg="from-blue-50 to-cyan-50" border="border-blue-200" iconBg="bg-blue-100" labelColor="text-blue-600" label="Total Revenue (Sold)" value={`KSh ${soldRevenue.toLocaleString()}`} sub={`${grouped.length} ${effectivePeriod} periods shown`} />
              <MetricCard icon={<BarChart3 size={18} className="text-violet-600" />} bg="from-violet-50 to-purple-50" border="border-violet-200" iconBg="bg-violet-100" labelColor="text-violet-600" label="Sales Margin %" value={`${marginPercent}%`} sub="Profit ÷ Revenue × 100 (all time)" />
            </div>
          </div>

          {/* ── CURRENT STOCK */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">🏪 Current Stock (Present Value)</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <MetricCard icon={<ShoppingCart size={18} className="text-amber-600" />} bg="from-amber-50 to-yellow-50" border="border-amber-200" iconBg="bg-amber-100" labelColor="text-amber-600" label="Stock Selling Value" value={`KSh ${currentStockValue.toLocaleString()}`} sub="If all current stock is sold" />
              <MetricCard icon={<TrendingUp size={18} className="text-rose-600" />} bg="from-rose-50 to-pink-50" border="border-rose-200" iconBg="bg-rose-100" labelColor="text-rose-600" label="Stock Cost Value" value={`KSh ${currentStockCost.toLocaleString()}`} sub="Total buying cost of current stock" />
              <MetricCard icon={<BarChart3 size={18} className="text-teal-600" />} bg="from-teal-50 to-cyan-50" border="border-teal-200" iconBg="bg-teal-100" labelColor="text-teal-600" label="Potential Stock Profit" value={`KSh ${currentStockProfit.toLocaleString()}`} sub={`${stockMarginPercent}% margin on current stock`} />
            </div>
          </div>

          {/* ── CHART */}
          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Calendar size={18} className="text-violet-500" />
                Profit Over Time
                {filterMode !== "period" && (
                  <span className="text-xs font-normal text-gray-400 ml-2">
                    ({filterMode === "specific" ? specificDate : `${rangeFrom} → ${rangeTo}`})
                  </span>
                )}
              </h2>
            </div>
            {grouped.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <BarChart3 size={40} className="mx-auto mb-3 opacity-20" />
                No sales data for selected period
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="flex items-end gap-3 h-48 min-w-max pb-2">
                  {grouped.map((g) => (
                    <div key={g.key} className="flex flex-col items-center gap-1 min-w-[80px]">
                      <div className="flex items-end gap-1 h-40">
                        <div style={{ height: `${Math.round((g.revenue / maxProfit) * 100)}%` }}
                          className="w-5 bg-blue-400 rounded-t-lg min-h-[2px]"
                          title={`Revenue: KSh ${g.revenue.toLocaleString()}`} />
                        <div style={{ height: `${Math.round((Math.abs(g.profit) / maxProfit) * 100)}%` }}
                          className={`w-5 rounded-t-lg min-h-[2px] ${g.profit >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
                          title={`Profit: KSh ${g.profit.toLocaleString()}`} />
                      </div>
                      <span className="text-xs text-gray-400 text-center leading-tight">{formatPeriodLabel(g.key, effectivePeriod)}</span>
                      <span className={`text-xs font-semibold ${g.profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                        KSh {g.profit.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-6 mt-4">
                  <div className="flex items-center gap-2 text-xs text-gray-500"><div className="w-3 h-3 bg-blue-400 rounded" /> Revenue</div>
                  <div className="flex items-center gap-2 text-xs text-gray-500"><div className="w-3 h-3 bg-emerald-500 rounded" /> Profit</div>
                </div>
              </div>
            )}
          </div>

          {/* ── TABLE — BuyView-style */}
          {grouped.length > 0 && (
            <div className="margin-scroll-wrap rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="margin-table w-full min-w-[640px] text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-200">
                      {/* sticky Period column */}
                      <th className="col-sticky px-4 py-3.5 text-left" style={{ backgroundColor: "#f8fafc" }}>
                        <div className="flex items-center gap-3">
                          <span className="text-[0.7rem] font-bold uppercase tracking-widest text-gray-400 w-5">#</span>
                          <span className="text-[0.7rem] font-bold uppercase tracking-widest text-gray-400">Period</span>
                        </div>
                      </th>
                      {["Revenue", "Cost", "Profit", "Margin %"].map((h) => (
                        <th key={h} className="px-4 py-3.5 text-[0.7rem] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {grouped.map((g, i) => {
                      const mp = g.revenue > 0 ? ((g.profit / g.revenue) * 100).toFixed(1) : "0.0";
                      const chipStyle = Number(mp) >= 20
                        ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                        : Number(mp) >= 10
                        ? "bg-amber-50 text-amber-700 border-amber-100"
                        : "bg-red-50 text-red-700 border-red-100";
                      return (
                        <tr key={g.key}
                          className="bg-white hover:bg-slate-50 transition-colors duration-100"
                          style={{ animationDelay: `${i * 0.025}s` }}
                          onMouseEnter={(e) => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#f8fafc"; }}
                          onMouseLeave={(e) => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#ffffff"; }}
                        >
                          {/* sticky first cell */}
                          <td className="col-sticky px-4 py-3" style={{ backgroundColor: "#ffffff" }}>
                            <div className="flex items-center gap-3">
                              <span className="text-[0.72rem] font-bold text-gray-300 w-5 text-center tabular-nums shrink-0">{i + 1}</span>
                              <span className="font-semibold text-gray-800 text-[0.82rem] whitespace-nowrap">
                                {formatPeriodLabel(g.key, effectivePeriod)}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="tabular-nums text-[0.82rem] font-bold text-blue-700">KSh {g.revenue.toLocaleString()}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="tabular-nums text-[0.78rem] text-gray-600">KSh {g.cost.toLocaleString()}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`tabular-nums text-[0.82rem] font-bold ${g.profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                              KSh {g.profit.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[0.7rem] font-bold ${chipStyle}`}>{mp}%</span>
                          </td>
                        </tr>
                      );
                    })}
                    {/* Totals row — not animated, always visible */}
                    <tr className="bg-slate-50 border-t-2 border-gray-200"
                      onMouseEnter={(e) => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#f1f5f9"; }}
                      onMouseLeave={(e) => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#f8fafc"; }}
                    >
                      <td className="col-sticky px-4 py-3.5 font-black text-gray-800 text-[0.82rem]" style={{ backgroundColor: "#f8fafc" }}>
                        <div className="flex items-center gap-3">
                          <span className="w-5 shrink-0" />
                          TOTAL
                        </div>
                      </td>
                      <td className="px-4 py-3.5 tabular-nums font-black text-blue-700 text-[0.82rem]">KSh {filteredTotals.revenue.toLocaleString()}</td>
                      <td className="px-4 py-3.5 tabular-nums font-bold text-gray-600 text-[0.78rem]">KSh {filteredTotals.cost.toLocaleString()}</td>
                      <td className={`px-4 py-3.5 tabular-nums font-black text-[0.82rem] ${filteredTotals.profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                        KSh {filteredTotals.profit.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-block rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-[0.7rem] font-black text-violet-700">
                          {filteredMarginPct}%
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

function MetricCard({ icon, bg, border, iconBg, labelColor, label, value, sub }: {
  icon: React.ReactNode; bg: string; border: string; iconBg: string;
  labelColor: string; label: string; value: string; sub: string;
}) {
  return (
    <div className={`rounded-xl border ${border} bg-gradient-to-br ${bg} p-5 shadow-sm`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`p-2 ${iconBg} rounded-xl`}>{icon}</div>
        <span className={`text-xs font-semibold uppercase tracking-wider ${labelColor}`}>{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}