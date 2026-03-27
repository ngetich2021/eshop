// app/payroll/_components/PayrollView.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import { Search, Loader2, MoreVertical, TrendingUp, AlertCircle, Banknote, Users, TrendingDown, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { updatePayrollStatusAction, deletePayrollAction } from "./actions";

type Payroll = {
  id: string;
  staffName: string;
  staffId: string;
  salary: number;
  payable: number;
  advances: number;
  status: string;
  shop: string;
  shopId: string;
  date: string;
  isCurrentMonth: boolean;
};

type StaffOption = { id: string; fullName: string };
type ActiveShop = { id: string; name: string; location: string };

type Props = {
  activeShop: ActiveShop;
  isManager: boolean;
  currentMonth: string;
  stats: { totalPayrolls: number; totalDue: number; totalSalary: number; totalPayable: number; totalDeductions: number };
  payrolls: Payroll[];
  staffList: StaffOption[];
};

export default function PayrollView({ activeShop, isManager, currentMonth, stats, payrolls }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownTop, setDropdownTop] = useState(0);
  const [dropdownLeft, setDropdownLeft] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [filterMonth, setFilterMonth] = useState(currentMonth);

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
    if (!confirm("Delete this payroll record?")) return;
    setDeletingId(id);
    const res = await deletePayrollAction(id);
    setDeletingId(null);
    if (res.success) router.refresh();
    else alert(res.error || "Delete failed");
    setOpenDropdownId(null);
  };

  const handleMarkPaid = (id: string) => {
    if (!confirm("Mark this payroll as paid?")) return;
    setPayingId(id);
    startTransition(async () => {
      const res = await updatePayrollStatusAction(id, "paid");
      setPayingId(null);
      if (res.success) router.refresh();
      else alert(res.error || "Failed");
    });
  };

  const allMonths = Array.from(new Set(payrolls.map((p) => p.date.substring(0, 7)))).sort().reverse();
  const formatMonth = (m: string) => {
    const [y, mo] = m.split("-");
    return new Date(Number(y), Number(mo) - 1, 1).toLocaleDateString("en-KE", { month: "short", year: "numeric" });
  };

  const filtered = payrolls.filter((p) => {
    const matchSearch = `${p.staffName} ${p.status} ${p.shop}`.toLowerCase().includes(search.toLowerCase());
    const matchMonth = filterMonth === "all" || p.date.startsWith(filterMonth);
    return matchSearch && matchMonth;
  });

  const statusColor = (status: string) =>
    status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-screen-2xl space-y-6">

        {/* SHOP BANNER */}
        <div className="flex items-center justify-between rounded-xl border bg-white px-5 py-3 shadow-sm">
          <div>
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">Active Shop</div>
            <div className="font-bold text-gray-900">{activeShop.name}</div>
            <div className="text-xs text-gray-400">{activeShop.location}</div>
          </div>
          <button
            onClick={() => router.refresh()}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-3 py-1.5"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <StatCard icon={<Users size={20} className="text-indigo-600" />} label="Records" value={stats.totalPayrolls} bg="bg-indigo-50" />
          <StatCard icon={<Banknote size={20} className="text-emerald-600" />} label="Total Salary" value={`KSh ${stats.totalSalary.toLocaleString()}`} bg="bg-emerald-50" />
          <StatCard icon={<TrendingDown size={20} className="text-red-500" />} label="Deductions" value={`KSh ${stats.totalDeductions.toLocaleString()}`} bg="bg-red-50" />
          <StatCard icon={<TrendingUp size={20} className="text-sky-600" />} label="Net Payable" value={`KSh ${stats.totalPayable.toLocaleString()}`} bg="bg-sky-50" />
          <StatCard icon={<AlertCircle size={20} className="text-rose-600" />} label="Pending Due" value={`KSh ${stats.totalDue.toLocaleString()}`} bg="bg-rose-50" />
        </div>

        {/* TOOLBAR */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search payroll..."
              className="w-full rounded-xl border border-gray-200 bg-white pl-10 py-2.5 text-sm shadow-sm focus:border-indigo-400 outline-none" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setFilterMonth("all")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${filterMonth === "all" ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300"}`}
            >All</button>
            {allMonths.slice(0, 6).map((m) => (
              <button key={m} onClick={() => setFilterMonth(m)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${filterMonth === m ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-300"}`}
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
                {["S/NO", "Full Name", "Base Salary", "Advances", "Net Payable", "Status", "Date", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 last:text-center">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p, i) => (
                <tr key={p.id} className="hover:bg-indigo-50/40 transition-colors">
                  <td className="px-5 py-4 text-gray-400 text-xs">{String(i + 1).padStart(2, "0")}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                        {p.staffName.charAt(0)}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-800">{p.staffName}</span>
                        {p.isCurrentMonth && <div className="text-xs text-indigo-500 font-medium">Current month</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-gray-700 font-semibold">KSh {p.salary.toLocaleString()}</td>
                  <td className="px-5 py-4">
                    {p.advances > 0
                      ? <span className="text-red-600 font-semibold">- KSh {p.advances.toLocaleString()}</span>
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-5 py-4 font-bold text-indigo-700">KSh {p.payable.toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor(p.status)}`}>{p.status}</span>
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-xs">{p.date}</td>
                  <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      {isManager && p.status === "pending" && (
                        <button
                          onClick={() => handleMarkPaid(p.id)}
                          disabled={payingId === p.id}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg flex items-center gap-1"
                        >
                          {payingId === p.id ? <Loader2 size={12} className="animate-spin" /> : "✓ Pay"}
                        </button>
                      )}
                      <button onClick={(e) => toggleDropdown(p.id, e)} className="p-2 hover:bg-gray-100 rounded-xl">
                        <MoreVertical size={18} className="text-gray-400" />
                      </button>
                    </div>
                    {openDropdownId === p.id && (
                      <div className="fixed z-[10000] w-44 bg-white border border-gray-100 rounded-2xl shadow-xl py-1.5"
                        style={{ top: `${dropdownTop}px`, left: `${dropdownLeft}px` }}>
                        {isManager && p.status === "pending" && (
                          <button onClick={() => { setOpenDropdownId(null); handleMarkPaid(p.id); }}
                            className="block w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50 text-emerald-700 font-medium">
                            ✓ Mark as Paid
                          </button>
                        )}
                        <div className="my-1 border-t border-gray-100" />
                        <button onClick={() => handleDelete(p.id)} disabled={deletingId === p.id}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                          {deletingId === p.id ? <Loader2 size={14} className="animate-spin" /> : "🗑️"} Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-24 text-center text-gray-400">
                  <Banknote size={40} className="mx-auto mb-3 opacity-20" />
                  No payroll records found
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, bg }: { icon: React.ReactNode; label: string; value: string | number; bg: string }) {
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