// app/salary/_components/SalaryView.tsx
"use client";

import { useEffect, useState, useTransition, useCallback, useRef } from "react";
import { Search, Loader2, MoreVertical, DollarSign, Clock, CheckCircle, Users, TrendingDown, RefreshCw, Eye, Trash2, BadgeCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { deleteSalaryAction, updateSalaryStatusAction } from "./actions";

type Salary = {
  id: string; staffName: string; staffId: string; amount: number; advances: number;
  netPayable: number; month: string; status: string; shop: string; shopId: string;
  date: string; isCurrentMonth: boolean;
};
type StaffOption = { id: string; fullName: string; baseSalary: number };
type ActiveShop  = { id: string; name: string; location: string };
type Props = {
  activeShop: ActiveShop; isStaff: boolean; isAdmin: boolean; isManager: boolean;
  currentMonth: string;
  stats: { totalSalaries: number; totalAmount: number; pendingAmount: number; paidCount: number; totalDeductions: number };
  salaries: Salary[]; staffList: StaffOption[];
};

type DDState = { id: string | null; top: number; left: number };
function usePortalDropdown() {
  const [dd, setDd] = useState<DDState>({ id: null, top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement | null>(null);
  const close = useCallback(() => setDd({ id: null, top: 0, left: 0 }), []);
  useEffect(() => {
    if (!dd.id) return;
    const h = (e: MouseEvent) => { if (menuRef.current?.contains(e.target as Node)) return; close(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [dd.id, close]);
  const open = useCallback((id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (dd.id === id) { close(); return; }
    const r = e.currentTarget.getBoundingClientRect();
    const dw = 180, gap = 6, dh = menuRef.current?.offsetHeight ?? 160;
    let top = r.bottom + gap, left = r.right - dw;
    if (top + dh > window.innerHeight - gap) top = r.top - dh - gap;
    if (top < gap) top = gap;
    if (left < gap) left = gap;
    if (left + dw > window.innerWidth - gap) left = window.innerWidth - dw - gap;
    setDd({ id, top, left });
  }, [dd.id, close]);
  return { dd, open, close, menuRef };
}

export default function SalaryView({ activeShop, isManager, currentMonth, stats, salaries }: Props) {
  const router = useRouter();
  const [search, setSearch]         = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [payingId, setPayingId]     = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState(currentMonth);
  const [, startTransition]         = useTransition();
  const { dd, open, close, menuRef } = usePortalDropdown();

  const handleDelete = async (id: string) => {
    close();
    if (!confirm("Delete this salary record?")) return;
    setDeletingId(id);
    const res = await deleteSalaryAction(id);
    setDeletingId(null);
    if (res.success) router.refresh(); else alert(res.error || "Delete failed");
  };

  const handleMarkPaid = (id: string) => {
    close();
    if (!confirm("Mark this salary as paid?")) return;
    setPayingId(id);
    startTransition(async () => {
      const res = await updateSalaryStatusAction(id, "paid");
      setPayingId(null);
      if (res.success) router.refresh(); else alert(res.error || "Update failed");
    });
  };

  const allMonths   = Array.from(new Set(salaries.map((s) => s.month))).sort().reverse();
  const formatMonth = (m: string) => {
    const [y, mo] = m.split("-");
    return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-KE", { month: "short", year: "numeric" });
  };

  const filtered = salaries.filter((s) => {
    const matchSearch = `${s.staffName} ${s.status} ${s.shop} ${s.month}`.toLowerCase().includes(search.toLowerCase());
    const matchMonth  = monthFilter === "all" || s.month === monthFilter;
    return matchSearch && matchMonth;
  });

  const ddSalary = dd.id ? salaries.find((s) => s.id === dd.id) : null;

  return (
    <>
      <style>{`
        .sal-table .col-sticky{position:sticky;left:0;z-index:10;box-shadow:6px 0 18px -6px rgba(0,0,0,0.06);clip-path:inset(0px -30px 0px 0px);}
        .sal-table thead .col-sticky{z-index:20;}
        .sal-scroll-wrap{position:relative}
        .sal-scroll-wrap::after{content:'';position:absolute;top:0;right:0;bottom:0;width:48px;background:linear-gradient(to right,transparent,rgba(248,250,252,0.7));pointer-events:none;z-index:5;border-radius:0 16px 16px 0}
        @keyframes rowIn{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
        .sal-table tbody tr{animation:rowIn 0.18s ease both}
        @keyframes ddIn{from{opacity:0;transform:scale(0.95) translateY(-4px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .dd-menu{animation:ddIn 0.12s ease both;transform-origin:top right}
      `}</style>

      <div className="min-h-screen bg-slate-50/80 px-3 py-5 md:px-6">
        <div className="mx-auto max-w-screen-2xl space-y-5">

          {/* SHOP BANNER */}
          <div className="flex items-center justify-between rounded-xl border bg-white px-5 py-3 shadow-sm">
            <div>
              <div className="text-[0.63rem] font-bold uppercase tracking-widest text-gray-400">Active Shop</div>
              <div className="font-bold text-gray-900">{activeShop.name}</div>
            </div>
            <button onClick={() => router.refresh()}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 rounded-lg px-3 py-1.5 transition-colors">
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {[
              { icon: <Users size={18} className="text-violet-600" />,      label: "Total Records", value: stats.totalSalaries,                             accent: "bg-violet-500" },
              { icon: <DollarSign size={18} className="text-emerald-600" />, label: "Gross Total",   value: `KSh ${stats.totalAmount.toLocaleString()}`,     accent: "bg-emerald-500" },
              { icon: <TrendingDown size={18} className="text-red-500" />,   label: "Deductions",    value: `KSh ${stats.totalDeductions.toLocaleString()}`,  accent: "bg-red-500" },
              { icon: <Clock size={18} className="text-amber-600" />,        label: "Pending (Net)", value: `KSh ${stats.pendingAmount.toLocaleString()}`,    accent: "bg-amber-500" },
              { icon: <CheckCircle size={18} className="text-blue-600" />,   label: "Paid",          value: stats.paidCount,                                  accent: "bg-blue-500" },
            ].map((s) => (
              <div key={s.label} className="relative overflow-hidden rounded-xl border border-gray-100 bg-white px-4 pt-4 pb-3 shadow-sm">
                <div className={`absolute top-0 left-0 right-0 h-0.5 ${s.accent}`} />
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="p-1.5 bg-gray-50 rounded-lg">{s.icon}</div>
                  <p className="text-[0.63rem] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                </div>
                <p className="text-2xl font-black tabular-nums text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          {/* TOOLBAR */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search salaries…"
                className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs focus:border-violet-400 focus:outline-none shadow-sm transition" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setMonthFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${monthFilter === "all" ? "bg-violet-600 text-white border-violet-600" : "bg-white text-gray-600 border-gray-300 hover:border-violet-300"}`}>All Months</button>
              {allMonths.slice(0, 6).map((m) => (
                <button key={m} onClick={() => setMonthFilter(m)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${monthFilter === m ? "bg-violet-600 text-white border-violet-600" : "bg-white text-gray-600 border-gray-300 hover:border-violet-300"}`}>
                  {formatMonth(m)}
                </button>
              ))}
            </div>
          </div>

          {/* TABLE */}
          <div className="sal-scroll-wrap rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="sal-table w-full min-w-[860px] text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200">
                    <th className="col-sticky px-4 py-3.5 text-left" style={{ backgroundColor: "#f8fafc" }}>
                      <div className="flex items-center gap-3">
                        <span className="text-[0.68rem] font-bold uppercase tracking-widest text-gray-400 w-5">#</span>
                        <span className="text-[0.68rem] font-bold uppercase tracking-widest text-gray-400">Name</span>
                      </div>
                    </th>
                    {["Base Salary","Advances","Net Payable","Month","Status","Actions"].map((h) => (
                      <th key={h} className={`px-4 py-3.5 text-[0.68rem] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap ${h === "Actions" ? "text-center" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((s, i) => (
                    <tr key={s.id}
                      className="bg-white hover:bg-slate-50 transition-colors duration-100"
                      style={{ animationDelay: `${i * 0.025}s` }}
                      onMouseEnter={(e) => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#f8fafc"; }}
                      onMouseLeave={(e) => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#ffffff"; }}
                    >
                      <td className="col-sticky px-4 py-3" style={{ backgroundColor: "#ffffff" }}>
                        <div className="flex items-center gap-3">
                          <span className="text-[0.7rem] font-bold text-gray-300 w-5 text-center tabular-nums shrink-0">{i + 1}</span>
                          <div className="w-8 h-8 shrink-0 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-black text-xs">{s.staffName.charAt(0)}</div>
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-800 truncate max-w-[130px] text-[0.82rem]">{s.staffName}</p>
                            {s.isCurrentMonth && <p className="text-[0.63rem] text-violet-500 font-semibold">Current month</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className="tabular-nums text-[0.82rem] font-bold text-gray-700">KSh {s.amount.toLocaleString()}</span></td>
                      <td className="px-4 py-3">
                        {s.advances > 0
                          ? <span className="tabular-nums text-[0.82rem] font-bold text-red-600">- KSh {s.advances.toLocaleString()}</span>
                          : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3"><span className="tabular-nums text-[0.82rem] font-black text-gray-900">KSh {s.netPayable.toLocaleString()}</span></td>
                      <td className="px-4 py-3 text-[0.78rem] text-gray-600">{formatMonth(s.month)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[0.68rem] font-bold capitalize ${s.status === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{s.status}</span>
                      </td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {isManager && s.status === "pending" && (
                            <button onClick={() => handleMarkPaid(s.id)} disabled={payingId === s.id}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1">
                              {payingId === s.id ? <Loader2 size={11} className="animate-spin" /> : "✓ Pay"}
                            </button>
                          )}
                          <button onClick={(e) => open(s.id, e)}
                            className={`rounded-lg p-1.5 transition-colors ${dd.id === s.id ? "bg-gray-200 text-gray-700" : "hover:bg-gray-100 text-gray-400"}`}>
                            <MoreVertical size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-300"><DollarSign size={38} strokeWidth={1} /><p className="text-sm font-semibold text-gray-400">No salary records found</p></div>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* PORTAL DROPDOWN */}
      {dd.id && ddSalary && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} className="dd-menu fixed z-[99999] w-[176px] bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 overflow-hidden"
          style={{ top: dd.top, left: dd.left }}>
          <div className="px-3 py-2 border-b border-gray-50 mb-1">
            <p className="text-[0.63rem] font-bold uppercase tracking-widest text-gray-400">Salary</p>
            <p className="text-xs font-semibold text-gray-700 truncate">{ddSalary.staffName}</p>
            <p className="text-[0.63rem] text-gray-400">{formatMonth(ddSalary.month)}</p>
          </div>
          <button onClick={() => { /* view is inline — no side sheet for salary view */ close(); }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Eye size={12} /></span> View Row
          </button>
          {isManager && ddSalary.status === "pending" && (
            <button onClick={() => handleMarkPaid(ddSalary.id)} disabled={payingId === ddSalary.id}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors disabled:opacity-50">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                {payingId === ddSalary.id ? <Loader2 size={12} className="animate-spin" /> : <BadgeCheck size={12} />}
              </span> Mark as Paid
            </button>
          )}
          <div className="my-1 border-t border-gray-100" />
          <button onClick={() => handleDelete(ddSalary.id)} disabled={deletingId === ddSalary.id}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-50 text-red-500">
              {deletingId === ddSalary.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            </span> Delete
          </button>
        </div>,
        document.body
      )}
    </>
  );
}