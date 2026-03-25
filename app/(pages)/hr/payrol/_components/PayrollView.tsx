"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Loader2, MoreVertical, TrendingUp, AlertCircle, Banknote, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import PayrollFormSideSheet from "./PayrollFormSideSheet";
import { deletePayrollAction } from "./actions";


type Payroll = {
  id: string; staffName: string; staffId: string; salary: number;
  payable: number; status: string; shop: string; shopId: string; date: string;
};
type StaffOption = { id: string; fullName: string };
type ShopOption = { id: string; name: string };
type Props = {
  stats: { totalPayrolls: number; totalDue: number; totalSalary: number; totalPayable: number };
  payrolls: Payroll[]; staffList: StaffOption[]; shops: ShopOption[];
};

export default function PayrollView({ stats, payrolls, staffList, shops }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "view">("add");
  const [selected, setSelected] = useState<Payroll | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownTop, setDropdownTop] = useState(0);
  const [dropdownLeft, setDropdownLeft] = useState(0);

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
    const gap = 8, dw = 160, dh = 120;
    let top = rect.bottom + gap, left = rect.right - dw;
    if (top + dh > window.innerHeight) top = rect.top - dh - gap;
    if (left < gap) left = gap;
    if (left + dw > window.innerWidth - gap) left = window.innerWidth - dw - gap;
    setDropdownTop(top); setDropdownLeft(left); setOpenDropdownId(id);
  };

  const openModal = (m: "add" | "edit" | "view", p?: Payroll) => {
    setMode(m); setSelected(p); setShowForm(true); setOpenDropdownId(null);
  };
  const closeModal = () => { setShowForm(false); setSelected(undefined); };
  const handleSuccess = () => { closeModal(); router.refresh(); };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this payroll record?")) return;
    setDeletingId(id);
    const res = await deletePayrollAction(id);
    setDeletingId(null);
    if (res.success) router.refresh();
    else alert(res.error || "Delete failed");
    setOpenDropdownId(null);
  };

  const filtered = payrolls.filter((p) =>
    `${p.staffName} ${p.status} ${p.shop}`.toLowerCase().includes(search.toLowerCase())
  );

  const statusColor = (status: string) =>
    status === "paid" ? "bg-emerald-100 text-emerald-700" :
    status === "partial" ? "bg-blue-100 text-blue-700" :
    "bg-amber-100 text-amber-700";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-screen-2xl space-y-6">

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={<Users size={20} className="text-indigo-600" />} label="Total Records" value={stats.totalPayrolls} bg="bg-indigo-50" />
          <StatCard icon={<Banknote size={20} className="text-emerald-600" />} label="Total Salary" value={`KSh ${stats.totalSalary.toLocaleString()}`} bg="bg-emerald-50" />
          <StatCard icon={<TrendingUp size={20} className="text-sky-600" />} label="Total Payable" value={`KSh ${stats.totalPayable.toLocaleString()}`} bg="bg-sky-50" />
          <StatCard icon={<AlertCircle size={20} className="text-rose-600" />} label="Pending Due" value={`KSh ${stats.totalDue.toLocaleString()}`} bg="bg-rose-50" />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search payroll..."
              className="w-full rounded-xl border border-gray-200 bg-white pl-10 py-2.5 text-sm shadow-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none" />
          </div>
          <button onClick={() => openModal("add")}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm transition-colors">
            <Plus size={16} /> Add Payroll
          </button>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                {["S/NO", "Full Name", "Salary", "Payable", "Status", "Date", "Shop", "Actions"].map((h) => (
                  <th key={h} className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 last:text-center">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((p, i) => (
                <tr key={p.id} onClick={() => openModal("view", p)}
                  className="cursor-pointer hover:bg-indigo-50/40 transition-colors">
                  <td className="px-5 py-4 text-gray-400 text-xs">{String(i + 1).padStart(2, "0")}</td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                        {p.staffName.charAt(0)}
                      </div>
                      <span className="font-semibold text-gray-800">{p.staffName}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-semibold text-gray-700">KSh {p.salary.toLocaleString()}</td>
                  <td className="px-5 py-4 font-bold text-indigo-700">KSh {p.payable.toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor(p.status)}`}>{p.status}</span>
                  </td>
                  <td className="px-5 py-4 text-gray-500 text-xs">{p.date}</td>
                  <td className="px-5 py-4 text-gray-600">{p.shop}</td>
                  <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => toggleDropdown(p.id, e)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                      <MoreVertical size={18} className="text-gray-400" />
                    </button>
                    {openDropdownId === p.id && (
                      <div className="fixed z-[10000] w-44 bg-white border border-gray-100 rounded-2xl shadow-xl py-1.5"
                        style={{ top: `${dropdownTop}px`, left: `${dropdownLeft}px` }}>
                        <button onClick={() => { setOpenDropdownId(null); openModal("view", p); }}
                          className="block w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700">👁️ View</button>
                        <button onClick={() => { setOpenDropdownId(null); openModal("edit", p); }}
                          className="block w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700">✏️ Edit</button>
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

      {showForm && (
        <PayrollFormSideSheet
          key={mode + (selected?.id || "new")}
          mode={mode} payrollToEdit={selected ?? null}
          staffList={staffList} shops={shops}
          onSuccess={handleSuccess} onClose={closeModal}
        />
      )}
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