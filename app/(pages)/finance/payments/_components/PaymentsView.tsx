// app/payments/_components/PaymentsView.tsx
"use client";

import { useState } from "react";
import { Search, Store, MapPin, Wallet, CreditCard, ShoppingCart, TrendingDown } from "lucide-react";

type Payment = {
  id: string;
  amount: number;
  method: string;
  products: string;
  shop: string;
  shopId: string;
  date: string;
};

type CreditPayment = {
  id: string;
  amount: number;
  method: string;
  note: string | null;
  paidAt: string;
  shop: string;
  shopId: string;
  creditTotal: number;
  creditTotalPaid: number;
};

type CreditSummary = {
  id: string;
  amount: number;
  totalPaid: number;
  due: number;
  status: string;
  dueDate: string | null;
  shop: string;
  date: string;
};

type StatPair = { count: number; amount: number };

type Props = {
  activeShop: { id: string; name: string; location: string };
  isStaff: boolean;
  isAdmin: boolean;
  stats: { today: StatPair; week: StatPair; month: StatPair; year: StatPair; total: StatPair };
  methodTotals: Record<string, number>;
  payments: Payment[];
  creditPayments: CreditPayment[];
  creditSummaries: CreditSummary[];
  availableBalance: number;
  totalCreditReceived: number;
  totalCreditDownPayments: number;
  totalCreditInstallments: number;
};

const METHOD_STYLES: Record<string, string> = {
  cash: "bg-green-100 text-green-700",
  mpesa: "bg-emerald-100 text-emerald-700",
  bank: "bg-blue-100 text-blue-700",
  card: "bg-purple-100 text-purple-700",
  credit: "bg-orange-100 text-orange-700",
  credit_downpayment: "bg-amber-100 text-amber-700",
};

export default function PaymentsView({
  activeShop,
  isStaff,
  isAdmin,
  stats,
  methodTotals,
  payments,
  creditPayments,
  creditSummaries,
  availableBalance,
  totalCreditReceived,
  totalCreditDownPayments,
  totalCreditInstallments,
}: Props) {
  const [search, setSearch] = useState("");
  const [filterMethod, setFilterMethod] = useState("all");
  const [activeTab, setActiveTab] = useState<"sales" | "credit">("sales");

  const filteredSales = payments.filter((p) => {
    const matchSearch = `${p.method} ${p.shop} ${p.products}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchMethod = filterMethod === "all" || p.method === filterMethod;
    return matchSearch && matchMethod;
  });

  const allMethods = Array.from(new Set(payments.map((p) => p.method)));

  const filteredCreditPayments = creditPayments.filter((cp) =>
    `${cp.method} ${cp.shop} ${cp.note ?? ""}`.toLowerCase().includes(search.toLowerCase())
  );

  const totalCreditCollected = creditSummaries.reduce((s, c) => s + c.totalPaid, 0);
  const totalCreditDue = creditSummaries.reduce((s, c) => s + c.due, 0);
  const totalCreditAmount = creditSummaries.reduce((s, c) => s + c.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50/80 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-screen-2xl space-y-6">

        {/* ── Active Shop Banner ──────────────────────────────────────────── */}
        <div className="flex items-center gap-4 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 px-5 py-3.5 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 shadow">
            <Store size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-400">Active Shop</p>
            <p className="font-bold text-indigo-900 truncate">{activeShop.name}</p>
          </div>
          {activeShop.location && (
            <div className="flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs text-gray-500 shadow-sm shrink-0">
              <MapPin size={11} /> {activeShop.location}
            </div>
          )}
          {isStaff && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200 shrink-0">
              Staff View
            </span>
          )}
          {isAdmin && (
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 border border-purple-200 shrink-0">
              Admin View
            </span>
          )}
        </div>

        {/* ── Balance + Credit Cards ───────────────────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* Available Balance */}
          <div className="rounded-lg border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-5 shadow-sm lg:col-span-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600 shadow">
                <Wallet size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-green-600">Available Balance</p>
                <p className="text-2xl font-bold text-green-900">KES {availableBalance.toLocaleString()}</p>
              </div>
            </div>
            {/* Balance breakdown */}
            <div className="mt-3 pt-3 border-t border-green-200 space-y-1">
              <div className="flex justify-between text-xs text-green-700">
                <span>Direct sales</span>
                <span className="font-semibold">
                  KES {payments.reduce((s, p) => s + p.amount, 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-xs text-green-700">
                <span>Credit received</span>
                <span className="font-semibold">KES {totalCreditReceived.toLocaleString()}</span>
              </div>
              {totalCreditDownPayments > 0 && (
                <div className="flex justify-between text-xs text-green-600 pl-3">
                  <span>↳ Down payments</span>
                  <span>KES {totalCreditDownPayments.toLocaleString()}</span>
                </div>
              )}
              {totalCreditInstallments > 0 && (
                <div className="flex justify-between text-xs text-green-600 pl-3">
                  <span>↳ Installments</span>
                  <span>KES {totalCreditInstallments.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Credit Collected */}
          <div className="rounded-lg border border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500 shadow">
                <CreditCard size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-orange-600">Credit Collected</p>
                <p className="text-2xl font-bold text-orange-900">KES {totalCreditCollected.toLocaleString()}</p>
                <p className="text-xs text-orange-500">of KES {totalCreditAmount.toLocaleString()} total</p>
              </div>
            </div>
          </div>

          {/* Outstanding Credit */}
          <div className="rounded-lg border border-red-200 bg-gradient-to-br from-red-50 to-rose-50 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500 shadow">
                <TrendingDown size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-red-600">Outstanding Credit</p>
                <p className="text-2xl font-bold text-red-900">KES {totalCreditDue.toLocaleString()}</p>
                <p className="text-xs text-red-400">{creditSummaries.filter((c) => c.status !== "paid").length} unpaid credits</p>
              </div>
            </div>
          </div>

          {/* Credit installments count */}
          <div className="rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500 shadow">
                <CreditCard size={20} className="text-white" />
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Installments Received</p>
                <p className="text-2xl font-bold text-blue-900">{creditPayments.length}</p>
                <p className="text-xs text-blue-500">KES {totalCreditInstallments.toLocaleString()} total</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Period stats ────────────────────────────────────────────────── */}
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
              <div className="text-xs text-green-700 font-semibold">KES {s.amount.toLocaleString()}</div>
            </div>
          ))}
        </div>

        {/* ── TABS ────────────────────────────────────────────────────────── */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab("sales")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === "sales"
                ? "border-indigo-600 text-indigo-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <ShoppingCart size={15} /> Sale Payments
            <span className="ml-1 bg-gray-100 text-gray-600 text-xs rounded-full px-2 py-0.5">
              {payments.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("credit")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === "credit"
                ? "border-orange-500 text-orange-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <CreditCard size={15} /> Credit Payments
            <span className="ml-1 bg-orange-100 text-orange-600 text-xs rounded-full px-2 py-0.5">
              {creditPayments.length}
            </span>
          </button>
        </div>

        {/* ── SEARCH + FILTER TOOLBAR ─────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeTab === "sales" ? "Search payments..." : "Search credit payments..."}
              className="w-full rounded-lg border border-gray-300 pl-10 py-2.5 text-sm focus:border-blue-500 outline-none"
            />
          </div>

          {activeTab === "sales" && (
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
          )}
        </div>

        {/* ── Method breakdown (sales tab only) ───────────────────────────── */}
        {activeTab === "sales" && Object.keys(methodTotals).length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {Object.entries(methodTotals).map(([method, amount]) => (
              <div key={method} className="rounded-lg border bg-white p-3 shadow-sm text-center">
                <div
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold capitalize mb-1 ${
                    METHOD_STYLES[method] ?? "bg-gray-100 text-gray-700"
                  }`}
                >
                  {method}
                </div>
                <div className="text-lg font-bold text-gray-900">KES {amount.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── SALE PAYMENTS TABLE ──────────────────────────────────────────── */}
        {activeTab === "sales" && (
          <div className="overflow-x-auto rounded-xl border bg-white shadow">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["S/NO", "Product(s)", "Amount", "Method", "Date", "Shop"].map((h) => (
                    <th key={h} className="px-6 py-3.5 text-left font-semibold text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredSales.map((p, i) => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-all">
                    <td className="px-6 py-4">{i + 1}</td>
                    <td className="px-6 py-4 max-w-[220px] truncate font-medium text-gray-800">
                      {p.products || "—"}
                    </td>
                    <td className="px-6 py-4 font-semibold">KES {p.amount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${
                          METHOD_STYLES[p.method] ?? "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {p.method}
                      </span>
                    </td>
                    <td className="px-6 py-4">{p.date}</td>
                    <td className="px-6 py-4">{p.shop}</td>
                  </tr>
                ))}
                {filteredSales.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-20 text-center text-gray-500">
                      No payments found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ── CREDIT PAYMENTS TAB ──────────────────────────────────────────── */}
        {activeTab === "credit" && (
          <div className="space-y-4">
            {/* Credit summaries */}
            <div className="rounded-xl border bg-white shadow overflow-hidden">
              <div className="bg-orange-50 px-5 py-3 border-b">
                <h3 className="text-sm font-semibold text-orange-800">
                  All Credit Records — Collection Progress
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {["S/NO", "Total Credit", "Collected", "Remaining", "Progress", "Status", "Due Date", "Date"].map(
                        (h) => (
                          <th key={h} className="px-5 py-3 text-left font-semibold text-gray-700">
                            {h}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {creditSummaries.map((c, i) => {
                      const pct = Math.min(100, Math.round((c.totalPaid / c.amount) * 100));
                      return (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-5 py-3">{i + 1}</td>
                          <td className="px-5 py-3 font-semibold">KES {c.amount.toLocaleString()}</td>
                          <td className="px-5 py-3 text-green-700 font-medium">KES {c.totalPaid.toLocaleString()}</td>
                          <td className="px-5 py-3 text-red-600 font-medium">KES {c.due.toLocaleString()}</td>
                          <td className="px-5 py-3 min-w-[160px]">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${pct >= 100 ? "bg-green-500" : pct > 0 ? "bg-orange-400" : "bg-gray-300"}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-500 shrink-0">{pct}%</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {c.totalPaid.toLocaleString()} / {c.amount.toLocaleString()}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                c.status === "paid"
                                  ? "bg-green-100 text-green-700"
                                  : c.status === "partial"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-yellow-100 text-yellow-700"
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-500">{c.dueDate ?? "—"}</td>
                          <td className="px-5 py-3 text-gray-500">{c.date}</td>
                        </tr>
                      );
                    })}
                    {creditSummaries.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-16 text-center text-gray-500">No credit records found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Individual credit payment transactions */}
            <div className="rounded-xl border bg-white shadow overflow-hidden">
              <div className="bg-orange-50 px-5 py-3 border-b flex items-center justify-between">
                <h3 className="text-sm font-semibold text-orange-800">
                  Credit Payment Transactions
                </h3>
                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full">
                  KES {totalCreditInstallments.toLocaleString()} in installments
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px] text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {["S/NO", "Amount Received", "Received / Total", "Method", "Note", "Date Received", "Shop"].map((h) => (
                        <th key={h} className="px-5 py-3 text-left font-semibold text-gray-700">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredCreditPayments.map((cp, i) => (
                      <tr key={cp.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3">{i + 1}</td>
                        <td className="px-5 py-3 font-semibold text-green-700">
                          KES {cp.amount.toLocaleString()}
                        </td>
                        <td className="px-5 py-3">
                          <div className="font-semibold text-gray-800">
                            KES {cp.creditTotalPaid.toLocaleString()}{" "}
                            <span className="text-gray-400 font-normal">/</span>{" "}
                            <span className="text-gray-500">KES {cp.creditTotal.toLocaleString()}</span>
                          </div>
                          <div className="w-full h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${cp.creditTotalPaid >= cp.creditTotal ? "bg-green-500" : "bg-orange-400"}`}
                              style={{ width: `${Math.min(100, Math.round((cp.creditTotalPaid / cp.creditTotal) * 100))}%` }}
                            />
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${METHOD_STYLES[cp.method] ?? "bg-gray-100 text-gray-700"}`}>
                            {cp.method}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-gray-500 max-w-[160px] truncate">{cp.note ?? "—"}</td>
                        <td className="px-5 py-3">{cp.paidAt}</td>
                        <td className="px-5 py-3">{cp.shop}</td>
                      </tr>
                    ))}
                    {filteredCreditPayments.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-16 text-center text-gray-500">No credit payments recorded yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}