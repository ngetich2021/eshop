// app/staff/advance/_components/AdvanceView.tsx
"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Search, Plus, Loader2, MoreVertical, TrendingUp,
  Clock, CheckCircle, Users, ThumbsUp, ThumbsDown, BadgeCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import AdvanceFormSideSheet from "./Advanceformsidesheet";
import { approveAdvanceAction, deleteAdvanceAction } from "./actions";

type Advance = {
  id: string;
  staffName: string;
  staffId: string;
  amount: number;
  date: string;
  reason: string | null;
  status: string;
  transactionCode: string | null;
  shop: string;
  shopId: string;
  baseSalary: number;
  createdAt: string;
};

type StaffOption = { id: string; fullName: string; baseSalary: number };
type ActiveShop = { id: string; name: string; location: string };

type Props = {
  activeShop: ActiveShop;
  isStaff: boolean;
  isAdmin: boolean;
  isManager: boolean;
  currentStaff?: StaffOption | null;
  stats: {
    totalAdvances: number;
    totalAdvance: number;
    pendingAdvance: number;
    approvedCount: number;
  };
  advances: Advance[];
  staffList: StaffOption[];
};

export default function AdvanceView({
  activeShop,
  isStaff,
  isAdmin,
  isManager,
  currentStaff,
  stats,
  advances,
  staffList,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "view">("add");
  const [selected, setSelected] = useState<Advance | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownTop, setDropdownTop] = useState(0);
  const [dropdownLeft, setDropdownLeft] = useState(0);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canManage = isManager || isAdmin;

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
    const gap = 8, dw = 160, dh = 160;
    let top = rect.bottom + gap, left = rect.right - dw;
    if (top + dh > window.innerHeight) top = rect.top - dh - gap;
    if (left < gap) left = gap;
    if (left + dw > window.innerWidth - gap) left = window.innerWidth - dw - gap;
    setDropdownTop(top); setDropdownLeft(left); setOpenDropdownId(id);
  };

  const openModal = (m: "add" | "edit" | "view", a?: Advance) => {
    setMode(m); setSelected(a); setShowForm(true); setOpenDropdownId(null);
  };
  const closeModal = () => { setShowForm(false); setSelected(undefined); };
  const handleSuccess = () => { closeModal(); router.refresh(); };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this advance request?")) return;
    setDeletingId(id);
    const res = await deleteAdvanceAction(id);
    setDeletingId(null);
    if (res.success) router.refresh();
    else alert(res.error || "Delete failed");
    setOpenDropdownId(null);
  };

  const handleApprove = (id: string, status: "approved" | "rejected" | "paid") => {
    setApprovingId(id);
    startTransition(async () => {
      const res = await approveAdvanceAction(id, status);
      setApprovingId(null);
      if (res.success) router.refresh();
      else alert(res.error || "Action failed");
      setOpenDropdownId(null);
    });
  };

  const filtered = advances.filter((a) =>
    `${a.staffName} ${a.status} ${a.reason ?? ""} ${a.shop}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const statusColor = (status: string) =>
    status === "paid" ? "bg-emerald-100 text-emerald-700"
      : status === "approved" ? "bg-blue-100 text-blue-700"
      : status === "rejected" ? "bg-red-100 text-red-700"
      : "bg-amber-100 text-amber-700";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-screen-2xl space-y-6">

        {/* Manager approval queue banner */}
        {canManage && advances.filter((a) => a.status === "requested").length > 0 && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5">
            <Clock size={20} className="text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {advances.filter((a) => a.status === "requested").length} advance request(s) awaiting your approval
              </p>
              <p className="text-xs text-amber-600">Use the ⚡ quick-approve buttons in the table below</p>
            </div>
          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon={<Users size={20} className="text-blue-600" />} label="Total Advances" value={stats.totalAdvances} bg="bg-blue-50" />
          <StatCard icon={<TrendingUp size={20} className="text-emerald-600" />} label="Total Advance" value={`KSh ${stats.totalAdvance.toLocaleString()}`} bg="bg-emerald-50" />
          <StatCard icon={<Clock size={20} className="text-amber-600" />} label="Pending" value={`KSh ${stats.pendingAdvance.toLocaleString()}`} bg="bg-amber-50" />
          <StatCard icon={<CheckCircle size={20} className="text-green-600" />} label="Approved" value={stats.approvedCount} bg="bg-green-50" />
        </div>

        {/* TOOLBAR */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search advances..."
              className="w-full rounded-xl border border-gray-200 bg-white pl-10 py-2.5 text-sm shadow-sm focus:border-blue-400 outline-none"
            />
          </div>
          <button
            onClick={() => openModal("add")}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm"
          >
            <Plus size={16} /> + Request
          </button>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                {(canManage
                  ? ["S/NO", "Staff", "Amount", "Status", "Reason", "Date", "Actions"]
                  : ["S/NO", "Amount", "Status", "Reason", "Date", "Actions"]
                ).map((h) => (
                  <th key={h} className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wider text-gray-500 last:text-center">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((a, i) => (
                <tr
                  key={a.id}
                  onClick={() => openModal("view", a)}
                  className="cursor-pointer hover:bg-blue-50/30 transition-colors"
                >
                  <td className="px-5 py-4 text-gray-400 text-xs">{String(i + 1).padStart(2, "0")}</td>
                  {canManage && (
                    <td className="px-5 py-4 font-semibold text-gray-700">{a.staffName}</td>
                  )}
                  <td className="px-5 py-4 font-bold text-gray-900">KSh {a.amount.toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor(a.status)}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-600 max-w-[180px] truncate">{a.reason ?? "—"}</td>
                  <td className="px-5 py-4 text-gray-500 text-xs">{a.date}</td>
                  <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1">
                      {/* Manager quick-approve buttons */}
                      {canManage && a.status === "requested" && (
                        <>
                          <button
                            onClick={() => handleApprove(a.id, "approved")}
                            disabled={approvingId === a.id}
                            title="Approve"
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors"
                          >
                            {approvingId === a.id ? <Loader2 size={14} className="animate-spin" /> : <ThumbsUp size={14} />}
                          </button>
                          <button
                            onClick={() => handleApprove(a.id, "rejected")}
                            disabled={approvingId === a.id}
                            title="Reject"
                            className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors"
                          >
                            <ThumbsDown size={14} />
                          </button>
                        </>
                      )}
                      {canManage && a.status === "approved" && (
                        <button
                          onClick={() => handleApprove(a.id, "paid")}
                          disabled={approvingId === a.id}
                          title="Mark as Paid"
                          className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                        >
                          {approvingId === a.id ? <Loader2 size={14} className="animate-spin" /> : <BadgeCheck size={14} />}
                        </button>
                      )}
                      <button
                        onClick={(e) => toggleDropdown(a.id, e)}
                        className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                      >
                        <MoreVertical size={18} className="text-gray-400" />
                      </button>
                    </div>
                    {openDropdownId === a.id && (
                      <div
                        className="fixed z-[10000] w-44 bg-white border border-gray-100 rounded-2xl shadow-xl py-1.5"
                        style={{ top: `${dropdownTop}px`, left: `${dropdownLeft}px` }}
                      >
                        <button onClick={() => { setOpenDropdownId(null); openModal("view", a); }} className="block w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700">👁️ View</button>
                        {canManage && (
                          <button onClick={() => { setOpenDropdownId(null); openModal("edit", a); }} className="block w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700">✏️ Edit</button>
                        )}
                        <div className="my-1 border-t border-gray-100" />
                        <button
                          onClick={() => handleDelete(a.id)}
                          disabled={deletingId === a.id}
                          className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          {deletingId === a.id ? <Loader2 size={14} className="animate-spin" /> : "🗑️"} Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 7 : 6} className="py-24 text-center text-gray-400">
                    <TrendingUp size={40} className="mx-auto mb-3 opacity-20" />
                    No advance records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <AdvanceFormSideSheet
          key={mode + (selected?.id || "new")}
          mode={mode}
          advanceToEdit={selected ?? null}
          staffList={staffList}
          shopId={activeShop.id}
          isStaff={isStaff}
          currentStaff={currentStaff}
          onSuccess={handleSuccess}
          onClose={closeModal}
        />
      )}
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