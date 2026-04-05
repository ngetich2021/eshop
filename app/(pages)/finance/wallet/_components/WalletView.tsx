// app/wallet/_components/WalletView.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import {
  Loader2,
  ArrowDownCircle,
  ArrowUpCircle,
  ArrowRightLeft,
  Store,
  MapPin,
  Wallet as WalletIcon,
} from "lucide-react";
import { walletTransactionAction } from "./actions";

type ActionResult = { success: boolean; error?: string };
type ActiveShop = { id: string; name: string; location: string };
type Transaction = {
  id: string;
  type: string;
  amount: number;
  source: string;
  authorizeId: string;
  shop: string;
  shopId: string;
  date: string;
  byName?: string;
};

type Props = {
  activeShop: ActiveShop;
  isStaff: boolean;
  isAdmin: boolean;
  wallet: { id: string; balance: number; shopId: string };
  availableBalance: number;
  stats: {
    totalBalance: number;
    totalDeposits: number;
    totalWithdrawn: number;
    totalTransferred: number;
  };
  transactions: Transaction[];
  currentUserName: string;
};

export default function WalletView({
  activeShop,
  isStaff,
  isAdmin,
  availableBalance,
  stats,
  transactions,
  currentUserName,
}: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw" | "transfer">("deposit");

  // ── dropdown state (mirrors BuyView pattern)
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownTop, setDropdownTop]       = useState(0);
  const [dropdownLeft, setDropdownLeft]     = useState(0);

  useEffect(() => {
    if (!openDropdownId) return;
    const close = () => setOpenDropdownId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openDropdownId]);

  const toggleDropdown = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (openDropdownId === id) { setOpenDropdownId(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const gap = 8, dw = 160, dh = 100;
    let top  = rect.bottom + gap;
    let left = rect.right - dw;
    if (top + dh > window.innerHeight) top  = rect.top - dh - gap;
    if (left < gap)                    left = gap;
    if (left + dw > window.innerWidth - gap) left = window.innerWidth - dw - gap;
    setDropdownTop(top); setDropdownLeft(left); setOpenDropdownId(id);
  };

  const [state, submitAction, isPending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      formData.set("name", activeTab);
      formData.set("shopId", activeShop.id);
      const res = await walletTransactionAction(prev, formData);
      if (res.success) router.refresh();
      return res;
    },
    { success: false }
  );

  const getSourcePlaceholder = () => {
    switch (activeTab) {
      case "deposit":  return "e.g. Sales, Cash from supplier, Investment";
      case "transfer": return "e.g. Moving to savings, Shop transfer";
      case "withdraw": return "e.g. Restock, Expenses, Owner withdrawal";
      default:         return "";
    }
  };

  const TYPE_CHIP: Record<string, string> = {
    deposit:  "bg-green-50 text-green-700 border-green-100",
    withdraw: "bg-red-50 text-red-700 border-red-100",
    transfer: "bg-blue-50 text-blue-700 border-blue-100",
  };

  return (
    <>
      {/* ── shared table styles (same pattern as BuyView) ── */}
      <style>{`
        .wallet-table .col-sticky { position:sticky;left:0;z-index:10;box-shadow:6px 0 18px -6px rgba(0,0,0,0.06);clip-path:inset(0px -30px 0px 0px); }
        .wallet-table thead .col-sticky { z-index:20; }
        .wallet-scroll-wrap { position:relative }
        .wallet-scroll-wrap::after { content:'';position:absolute;top:0;right:0;bottom:0;width:48px;background:linear-gradient(to right,transparent,rgba(248,250,252,0.7));pointer-events:none;z-index:5;border-radius:0 16px 16px 0 }
        @keyframes rowIn { from{opacity:0;transform:translateX(-5px)} to{opacity:1;transform:translateX(0)} }
        .wallet-table tbody tr { animation:rowIn 0.2s ease both }
      `}</style>

      <div className="min-h-screen bg-gray-50/80 px-4 py-6 md:px-6">
        <div className="mx-auto max-w-screen-2xl space-y-6">

          {/* ── Active Shop Banner */}
          <div className="flex items-center gap-4 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 px-5 py-3.5 shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 shadow">
              <Store size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-indigo-400">Active Shop</p>
              <p className="font-bold text-indigo-900 truncate">{activeShop.name}</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs text-gray-500 shadow-sm shrink-0">
              <MapPin size={11} />{activeShop.location}
            </div>
            {isStaff && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200 shrink-0">Staff View</span>}
            {isAdmin && <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 border border-purple-200 shrink-0">Admin View</span>}
          </div>

          {/* ── Balance Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600 shadow"><WalletIcon size={20} className="text-white" /></div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-green-600">Wallet Balance</p>
                  <p className="text-2xl font-bold text-green-900">KSh {stats.totalBalance.toLocaleString()}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-green-700">Withdraw from here</p>
            </div>
            <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 shadow"><ArrowRightLeft size={20} className="text-white" /></div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-blue-600">Available (from sales)</p>
                  <p className="text-2xl font-bold text-blue-900">KSh {availableBalance.toLocaleString()}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-blue-700">Transfer from here</p>
            </div>
          </div>

          {/* ── Summary Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Total Deposited",   value: `KSh ${stats.totalDeposits.toLocaleString()}`,   color: "text-green-700" },
              { label: "Total Withdrawn",   value: `KSh ${stats.totalWithdrawn.toLocaleString()}`,  color: "text-red-600"   },
              { label: "Total Transferred", value: `KSh ${stats.totalTransferred.toLocaleString()}`, color: "text-blue-600"  },
              { label: "All Transactions",  value: transactions.length,                              color: "text-gray-800"  },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border bg-white p-3 shadow-sm text-center">
                <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{s.label}</div>
                <div className={`mt-1 text-lg font-bold ${s.color}`}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ── Transaction Form */}
            <div className="rounded-xl border bg-white shadow-sm p-6 space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">New Transaction</h2>
                <p className="text-xs text-gray-500 mt-1">Choose transaction type and enter details below</p>
              </div>
              <div className="flex gap-2">
                {(["deposit", "withdraw", "transfer"] as const).map((tab) => (
                  <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                      activeTab === tab ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}>
                    {tab}
                  </button>
                ))}
              </div>
              <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
                {activeTab === "deposit"  && <><span className="font-semibold">Deposit:</span> Add external funds to {activeShop.name} wallet.</>}
                {activeTab === "transfer" && <><span className="font-semibold">Transfer:</span> Move available funds (from sales) to wallet. Available: KSh {availableBalance.toLocaleString()}</>}
                {activeTab === "withdraw" && <><span className="font-semibold">Withdraw:</span> Take money from {activeShop.name} wallet. Available: KSh {stats.totalBalance.toLocaleString()}</>}
              </div>
              {state?.error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl text-center text-sm font-medium">{state.error}</div>
              )}
              <form action={submitAction} className="space-y-4">
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-gray-700">Amount (KSh):</label>
                  <input name="amount" type="number" required placeholder="0"
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block mb-1.5 text-sm font-medium text-gray-700">
                    {activeTab === "deposit" ? "Source (where from):" : "Reason / Details:"}
                  </label>
                  <input name="sourceOfMoney" type="text" required placeholder={getSourcePlaceholder()}
                    className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <button type="submit" disabled={isPending}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-3 font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors">
                  {isPending ? <Loader2 size={20} className="animate-spin" />
                    : activeTab === "deposit"  ? <><ArrowDownCircle size={18} /> Deposit</>
                    : activeTab === "withdraw" ? <><ArrowUpCircle size={18} /> Withdraw</>
                    :                            <><ArrowRightLeft size={18} /> Transfer</>}
                </button>
              </form>
            </div>

            {/* ── Transactions Table — BuyView-style */}
            <div className="wallet-scroll-wrap rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b font-semibold text-gray-700">Recent Transactions</div>
              <div className="overflow-x-auto overflow-y-auto max-h-[500px]">
                <table className="wallet-table w-full min-w-[640px] text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-200">
                      {/* sticky S/NO + Type column */}
                      <th className="col-sticky px-4 py-3.5 text-left" style={{ backgroundColor: "#f8fafc" }}>
                        <div className="flex items-center gap-3">
                          <span className="text-[0.7rem] font-bold uppercase tracking-widest text-gray-400 w-5">#</span>
                          <span className="text-[0.7rem] font-bold uppercase tracking-widest text-gray-400">Type</span>
                        </div>
                      </th>
                      {["Amount", "Source", "By", "Date"].map((h) => (
                        <th key={h} className="px-4 py-3.5 text-[0.7rem] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap text-left">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {transactions.map((t, i) => {
                      const chipStyle = TYPE_CHIP[t.type] ?? "bg-gray-100 text-gray-600 border-gray-200";
                      return (
                        <tr key={t.id}
                          className="bg-white hover:bg-slate-50 transition-colors duration-100"
                          style={{ animationDelay: `${i * 0.025}s` }}
                          onMouseEnter={(e) => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#f8fafc"; }}
                          onMouseLeave={(e) => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#ffffff"; }}
                        >
                          {/* sticky first cell */}
                          <td className="col-sticky px-4 py-3" style={{ backgroundColor: "#ffffff" }}>
                            <div className="flex items-center gap-3">
                              <span className="text-[0.72rem] font-bold text-gray-300 w-5 text-center tabular-nums shrink-0">{i + 1}</span>
                              <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[0.7rem] font-bold capitalize ${chipStyle}`}>{t.type}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="tabular-nums text-[0.82rem] font-bold text-gray-800">KSh {t.amount.toLocaleString()}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[0.78rem] text-gray-600">{t.source}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[0.78rem] text-gray-500 font-medium">{t.byName ?? "unknown"}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[0.75rem] text-gray-400 whitespace-nowrap">{t.date}</span>
                          </td>
                        </tr>
                      );
                    })}
                    {transactions.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-24 text-center">
                          <div className="flex flex-col items-center gap-3 text-gray-300">
                            <WalletIcon size={40} strokeWidth={1} />
                            <p className="text-sm font-semibold text-gray-400">No transactions yet</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}