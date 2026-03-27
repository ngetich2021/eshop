// app/salary/_components/SalaryView.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Search, Loader2, MoreVertical, DollarSign, Clock, CheckCircle, Users, TrendingDown, RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteSalaryAction, updateSalaryStatusAction } from "./actions";

type Salary = {
  id: string;
  staffName: string;
  staffId: string;
  amount: number;          // gross base salary
  advances: number;        // advance deductions this month
  netPayable: number;      // amount to pay after deductions
  month: string;
  status: string;
  shop: string;
  shopId: string;
  date: string;
  isCurrentMonth: boolean;
};

type StaffOption = { id: string; fullName: string; baseSalary: number };
type ActiveShop = { id: string; name: string; location: string };

type Props = {
  activeShop: ActiveShop;
  isStaff: boolean;
  isAdmin: boolean;
  isManager: boolean;
  currentMonth: string;
  stats: {
    totalSalaries: number;
    totalAmount: number;
    pendingAmount: number;
    paidCount: number;
    totalDeductions: number;
  };
  salaries: Salary[];
  staffList: StaffOption[];
};

export default function SalaryView({
  activeShop,
  isManager,
  currentMonth,
  stats,
  salaries,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownTop, setDropdownTop] = useState(0);
  const [dropdownLeft, setDropdownLeft] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [monthFilter, setMonthFilter] = useState(currentMonth);

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
    let top = rect.bottom + gap, left = rect.right - dw;
    if (top + dh > window.innerHeight) top = rect.top - dh - gap;
    if (left < gap) left = gap;
    if (left + dw > window.innerWidth - gap) left = window.innerWidth - dw - gap;
    setDropdownTop(top); setDropdownLeft(left); setOpenDropdownId(id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this salary record?")) return;
    setDeletingId(id);
    const res = await deleteSalaryAction(id);
    setDeletingId(null);
    if (res.success) router.refresh();
    else alert(res.error || "Delete failed");
    setOpenDropdownId(null);
  };

  const handleMarkPaid = (id: string) => {
    if (!confirm("Mark this salary as paid?")) return;
    setPayingId(id);
    startTransition(async () => {
      const res = await updateSalaryStatusAction(id, "paid");
      setPayingId(null);
      if (res.success) router.refresh();
      else alert(res.error || "Update failed");
    });
  };

  // Get unique months for filter
  const allMonths = Array.from(new Set(salaries.map((s) => s.month))).sort().reverse();

  const filtered = salaries.filter((s) => {
    const matchSearch = `${s.staffName} ${s.status} ${s.shop} ${s.month}`
      .toLowerCase().includes(search.toLowerCase());
    const matchMonth = monthFilter === "all" || s.month === monthFilter;
    return matchSearch && matchMonth;
  });

  const statusColor = (status: string) =>
    status === "paid" ? "bg-emerald-100 text-emerald-700"
      : "bg-amber-100 text-amber-700";

  // Format month label e.g. "2026-03" → "Mar 2026"
  const formatMonth = (m: string) => {
    const [y, mo] = m.split("-");
    return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-KE", { month: "short", year: "numeric" });
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-screen-2xl space-y-6">

        {/* SHOP BANNER */}
        <div className="flex items-center justify-between rounded-xl border bg-white px-5 py-3 shadow-sm">
          <div>
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Active Shop</div>
            <div className="font-bold text-gray-900">{activeShop.name}</div>
          </div>
          <button
            onClick={() => router.refresh()}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 rounded-lg px-3 py-1.5 transition-colors"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard icon={<Users size={20} className="text-violet-600" />} label="Total Records" value={stats.totalSalaries} bg="bg-violet-50" />
          <StatCard icon={<DollarSign size={20} className="text-emerald-600" />} label="Gross Total" value={`KSh ${stats.totalAmount.toLocaleString()}`} bg="bg-emerald-50" />
          <StatCard icon={<TrendingDown size={20} className="text-red-500" />} label="Deductions" value={`KSh ${stats.totalDeductions.toLocaleString()}`} bg="bg-red-50" />
          <StatCard icon={<Clock size={20} className="text-amber-600" />} label="Pending (Net)" value={`KSh ${stats.pendingAmount.toLocaleString()}`} bg="bg-amber-50" />
          <StatCard icon={<CheckCircle size={20} className="text-blue-600" />} label="Paid" value={stats.paidCount} bg="bg-blue-50" />
        </div>

        {/* TOOLBAR */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search salaries..."
              className="w-full rounded-xl border border-gray-200 bg-white pl-10 py-2.5 text-sm shadow-sm focus:border-violet-400 outline-none"
            />
          </div>
          {/* Month filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setMonthFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${monthFilter === "all" ? "bg-violet-600 text-white border-violet-600" : "bg-white text-gray-600 border-gray-300"}`}
            >
              All Months
            </button>
            {allMonths.slice(0, 6).map((m) => (
              <button
                key={m}
                onClick={() => setMonthFilter(m)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${monthFilter === m ? "bg-violet-600 text-white border-violet-600" : "bg-white text-gray-600 border-gray-300 hover:border-violet-300"}`}
              >
                {formatMonth(m)}
              </button>
            ))}
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                {["S/NO", "Name", "Base Salary", "Advances", "Net Payable", "Month", "Status", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 last:text-center">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((s, i) => (
                <tr key={s.id} className="hover:bg-violet-50/30 transition-colors">
                  <td className="px-5 py-4 text-gray-400 text-xs">{String(i + 1).padStart(2, "0")}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold text-xs">
                        {s.staffName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-800">{s.staffName}</div>
                        {s.isCurrentMonth && (
                          <div className="text-xs text-violet-500 font-medium">Current month</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-700 font-semibold">KSh {s.amount.toLocaleString()}</td>
                  <td className="px-5 py-4">
                    {s.advances > 0 ? (
                      <span className="text-red-600 font-semibold">- KSh {s.advances.toLocaleString()}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 font-bold text-gray-900">KSh {s.netPayable.toLocaleString()}</td>
                  <td className="px-5 py-4 text-gray-600">{formatMonth(s.month)}</td>
                  <td className="px-5 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor(s.status)}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      {/* Pay button — manager only, pending only */}
                      {isManager && s.status === "pending" && (
                        <button
                          onClick={() => handleMarkPaid(s.id)}
                          disabled={payingId === s.id}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1"
                        >
                          {payingId === s.id ? <Loader2 size={12} className="animate-spin" /> : "✓ Pay"}
                        </button>
                      )}
                      <button
                        onClick={(e) => toggleDropdown(s.id, e)}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                      >
                        <MoreVertical size={18} className="text-gray-400" />
                      </button>
                    </div>
                    {openDropdownId === s.id && (
                      <div
                        className="fixed z-[10000] w-44 bg-white border border-gray-100 rounded-2xl shadow-xl py-1.5"
                        style={{ top: `${dropdownTop}px`, left: `${dropdownLeft}px` }}
                      >
                        {isManager && s.status === "pending" && (
                          <button
                            onClick={() => { setOpenDropdownId(null); handleMarkPaid(s.id); }}
                            className="block w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50 text-emerald-700 font-medium"
                          >
                            ✓ Mark as Paid
                          </button>
                        )}
                        <div className="my-1 border-t border-gray-100" />
                        <button
                          onClick={() => handleDelete(s.id)}
                          disabled={deletingId === s.id}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          {deletingId === s.id ? <Loader2 size={14} className="animate-spin" /> : "🗑️"} Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-24 text-center text-gray-400">
                    <DollarSign size={40} className="mx-auto mb-3 opacity-20" />
                    No salary records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, bg }: {
  icon: React.ReactNode; label: string; value: string | number; bg: string;
}) {
  return (
    <div className={`rounded-2xl border border-gray-100 ${bg} p-4 shadow-sm`}>
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-white rounded-xl shadow-sm">{icon}</div>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}