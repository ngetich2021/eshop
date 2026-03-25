// app/payments/_components/PaymentsView.tsx
"use client";

import { useState } from "react";
import { Search } from "lucide-react";

type Payment = {
  id: string;
  amount: number;
  method: string;
  products: string;
  shop: string;
  shopId: string;
  date: string;
};

type StatPair = { count: number; amount: number };

type Props = {
  stats: { today: StatPair; week: StatPair; month: StatPair; year: StatPair; total: StatPair };
  methodTotals: Record<string, number>;
  payments: Payment[];
};

const METHOD_STYLES: Record<string, string> = {
  cash:   "bg-green-100 text-green-700",
  mpesa:  "bg-emerald-100 text-emerald-700",
  bank:   "bg-blue-100 text-blue-700",
  card:   "bg-purple-100 text-purple-700",
  credit: "bg-orange-100 text-orange-700",
};

export default function PaymentsView({ stats, methodTotals, payments }: Props) {
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("all");

  const filtered = payments.filter((p) => {
    const matchSearch = `${p.method} ${p.shop} ${p.products}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchMethod = filterMethod === "all" || p.method === filterMethod;
    return matchSearch && matchMethod;
  });

  const allMethods = Array.from(new Set(payments.map((p) => p.method)));

  return (
    <div className="min-h-screen bg-gray-50/80 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-screen-2xl space-y-6">

        {/* PERIOD STATS */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Today", ...stats.today },
            { label: "This Week", ...stats.week },
            { label: "This Month", ...stats.month },
            { label: "This Year", ...stats.year },
            { label: "Total", ...stats.total },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border bg-white p-3 shadow-sm text-center">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{s.label}</div>
              <div className="mt-1 text-xl font-bold text-gray-900">{s.count}</div>
              <div className="text-xs text-green-700 font-semibold">KSh {s.amount.toLocaleString()}</div>
            </div>
          ))}
        </div>

        {/* METHOD BREAKDOWN */}
        {Object.keys(methodTotals).length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Object.entries(methodTotals).map(([method, amount]) => (
              <div key={method} className="rounded-lg border bg-white p-3 shadow-sm text-center">
                <div className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize mb-1 ${METHOD_STYLES[method] ?? "bg-gray-100 text-gray-700"}`}>
                  {method}
                </div>
                <div className="text-lg font-bold text-gray-900">KSh {amount.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}

        {/* TOOLBAR */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search payments..."
              className="w-full rounded-lg border border-gray-300 pl-10 py-2.5 text-sm focus:border-blue-500 outline-none"
            />
          </div>
          {/* METHOD FILTER */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterMethod("all")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                filterMethod === "all"
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
              }`}
            >
              All
            </button>
            {allMethods.map((m) => (
              <button
                key={m}
                onClick={() => setFilterMethod(m)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border capitalize transition-all ${
                  filterMethod === m
                    ? "bg-gray-800 text-white border-gray-800"
                    : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto rounded-xl border bg-white shadow">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["S/NO", "product(s)", "amount", "method", "date", "shop"].map((h) => (
                  <th key={h} className="px-6 py-3.5 text-left font-semibold text-gray-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p, i) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-all">
                  <td className="px-6 py-4">{i + 1}</td>
                  <td className="px-6 py-4 max-w-[220px] truncate font-medium text-gray-800">
                    {p.products || "—"}
                  </td>
                  <td className="px-6 py-4 font-semibold">KSh {p.amount.toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${METHOD_STYLES[p.method] ?? "bg-gray-100 text-gray-700"}`}>
                      {p.method}
                    </span>
                  </td>
                  <td className="px-6 py-4">{p.date}</td>
                  <td className="px-6 py-4">{p.shop}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-gray-500">No payments found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}