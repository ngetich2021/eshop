"use client";

import { useEffect, useState, useTransition, useCallback, useRef } from "react";
import {
  Search, Plus, Loader2, MoreVertical, TrendingUp,
  Clock, CheckCircle, Users, ThumbsUp, ThumbsDown, BadgeCheck,
  Eye, Pencil, Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import AdvanceFormSideSheet from "./Advanceformsidesheet";
import { approveAdvanceAction, deleteAdvanceAction } from "./actions";

type Advance = {
  id: string; staffName: string; staffId: string; amount: number; date: string;
  reason: string | null; status: string; transactionCode: string | null;
  shop: string; shopId: string; baseSalary: number; createdAt: string;
};
type StaffOption = { id: string; fullName: string; baseSalary: number };
type ActiveShop  = { id: string; name: string; location: string };
type Props = {
  activeShop: ActiveShop; isStaff: boolean; isAdmin: boolean; isManager: boolean;
  currentStaff?: StaffOption | null;
  stats: { totalAdvances: number; totalAdvance: number; pendingAdvance: number; approvedCount: number };
  advances: Advance[];
};

const STATUS_CHIP: Record<string, string> = {
  paid:      "bg-emerald-50 text-emerald-700 border-emerald-200",
  approved:  "bg-blue-50 text-blue-700 border-blue-200",
  rejected:  "bg-red-50 text-red-700 border-red-200",
  requested: "bg-amber-50 text-amber-700 border-amber-200",
};

// ── Dropdown portal ──────────────────────────────────────────────────────────
type DDState = { id: string | null; top: number; left: number };

function useTableDropdown() {
  const [dd, setDd]       = useState<DDState>({ id: null, top: 0, left: 0 });
  const menuRef           = useRef<HTMLDivElement | null>(null);
  const close             = useCallback(() => setDd({ id: null, top: 0, left: 0 }), []);

  useEffect(() => {
    if (!dd.id) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dd.id, close]);

  const open = useCallback((id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (dd.id === id) { close(); return; }
    const r   = e.currentTarget.getBoundingClientRect();
    const dw  = 180, gap = 6;
    const dh  = menuRef.current?.offsetHeight ?? 160;
    let top   = r.bottom + gap;
    let left  = r.right - dw;
    if (top + dh > window.innerHeight - gap) top  = r.top - dh - gap;
    if (top < gap)                            top  = gap;
    if (left < gap)                           left = gap;
    if (left + dw > window.innerWidth - gap)  left = window.innerWidth - dw - gap;
    setDd({ id, top, left });
  }, [dd.id, close]);

  return { dd, open, close, menuRef };
}

// ── Main component ───────────────────────────────────────────────────────────
export default function AdvanceView({
  activeShop, isStaff, isAdmin, isManager, currentStaff, stats, advances,
}: Props) {
  const router = useRouter();
  const [search, setSearch]         = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [mode, setMode]             = useState<"add" | "edit" | "view">("add");
  const [selected, setSelected]     = useState<Advance | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [, startTransition]         = useTransition();
  const { dd, open, close, menuRef } = useTableDropdown();

  const canManage = isManager || isAdmin;

  const openModal     = (m: "add" | "edit" | "view", a?: Advance) => { setMode(m); setSelected(a); setShowForm(true); close(); };
  const closeModal    = () => { setShowForm(false); setSelected(undefined); };
  const handleSuccess = () => { closeModal(); router.refresh(); };

  const handleDelete = async (id: string) => {
    close();
    if (!confirm("Delete this advance request?")) return;
    setDeletingId(id);
    const res = await deleteAdvanceAction(id);
    setDeletingId(null);
    if (res.success) router.refresh(); else alert(res.error || "Delete failed");
  };

  const handleApprove = (id: string, status: "approved" | "rejected" | "paid") => {
    setApprovingId(id);
    startTransition(async () => {
      const res = await approveAdvanceAction(id, status);
      setApprovingId(null);
      if (res.success) router.refresh(); else alert(res.error || "Action failed");
    });
  };

  const filtered = advances.filter((a) =>
    `${a.staffName} ${a.status} ${a.reason ?? ""} ${a.shop}`.toLowerCase().includes(search.toLowerCase())
  );

  // find the advance the dropdown is open for
  const ddAdvance = dd.id ? advances.find((a) => a.id === dd.id) : null;

  return (
    <>
      <style>{`
        .adv-table .col-sticky{position:sticky;left:0;z-index:10;box-shadow:6px 0 18px -6px rgba(0,0,0,0.06);clip-path:inset(0px -30px 0px 0px);}
        .adv-table thead .col-sticky{z-index:20;}
        .adv-scroll-wrap{position:relative}
        .adv-scroll-wrap::after{content:'';position:absolute;top:0;right:0;bottom:0;width:48px;background:linear-gradient(to right,transparent,rgba(248,250,252,0.7));pointer-events:none;z-index:5;border-radius:0 16px 16px 0}
        @keyframes rowIn{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
        .adv-table tbody tr{animation:rowIn 0.18s ease both}
        @keyframes ddIn{from{opacity:0;transform:scale(0.95) translateY(-4px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .dd-menu{animation:ddIn 0.12s ease both;transform-origin:top right}
      `}</style>

      <div className="min-h-screen bg-slate-50/80 px-3 py-5 md:px-6">
        <div className="mx-auto max-w-screen-2xl space-y-5">

          {/* Approval banner */}
          {canManage && advances.filter((a) => a.status === "requested").length > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5">
              <Clock size={18} className="text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-800">
                  {advances.filter((a) => a.status === "requested").length} advance request(s) awaiting your approval
                </p>
                <p className="text-xs text-amber-600">Use the ⚡ quick-action buttons in each row</p>
              </div>
            </div>
          )}

          {/* STATS */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { icon: <Users size={18} className="text-blue-600" />,        label: "Total Advances", value: stats.totalAdvances,                           accent: "bg-blue-500" },
              { icon: <TrendingUp size={18} className="text-emerald-600" />, label: "Total Advance",  value: `KSh ${stats.totalAdvance.toLocaleString()}`,  accent: "bg-emerald-500" },
              { icon: <Clock size={18} className="text-amber-600" />,        label: "Pending",        value: `KSh ${stats.pendingAdvance.toLocaleString()}`, accent: "bg-amber-500" },
              { icon: <CheckCircle size={18} className="text-green-600" />,  label: "Approved",       value: stats.approvedCount,                           accent: "bg-green-500" },
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
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search advances…"
                className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs focus:border-blue-400 focus:outline-none shadow-sm transition" />
            </div>
            <button onClick={() => openModal("add")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm shrink-0 transition-colors">
              <Plus size={14} /> + Request
            </button>
          </div>

          {/* TABLE */}
          <div className="adv-scroll-wrap rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="adv-table w-full min-w-[860px] text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200">
                    <th className="col-sticky px-4 py-3.5 text-left" style={{ backgroundColor: "#f8fafc" }}>
                      <div className="flex items-center gap-3">
                        <span className="text-[0.68rem] font-bold uppercase tracking-widest text-gray-400 w-5">#</span>
                        <span className="text-[0.68rem] font-bold uppercase tracking-widest text-gray-400">{canManage ? "Staff" : "Amount"}</span>
                      </div>
                    </th>
                    {(canManage ? ["Amount","Status","Reason","Date","Actions"] : ["Status","Reason","Date","Actions"]).map((h) => (
                      <th key={h} className={`px-4 py-3.5 text-[0.68rem] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap ${h === "Actions" ? "text-center" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((a, i) => (
                    <tr key={a.id}
                      onClick={() => openModal("view", a)}
                      className="cursor-pointer bg-white hover:bg-slate-50 transition-colors duration-100"
                      style={{ animationDelay: `${i * 0.025}s` }}
                      onMouseEnter={(e) => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#f8fafc"; }}
                      onMouseLeave={(e) => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#ffffff"; }}
                    >
                      <td className="col-sticky px-4 py-3" style={{ backgroundColor: "#ffffff" }}>
                        <div className="flex items-center gap-3">
                          <span className="text-[0.7rem] font-bold text-gray-300 w-5 text-center tabular-nums shrink-0">{i + 1}</span>
                          {canManage
                            ? <p className="font-semibold text-gray-800 truncate max-w-[160px] text-[0.82rem]">{a.staffName}</p>
                            : <p className="font-bold text-gray-900 tabular-nums text-[0.82rem]">KSh {a.amount.toLocaleString()}</p>}
                        </div>
                      </td>
                      {canManage && <td className="px-4 py-3"><span className="tabular-nums text-[0.82rem] font-bold text-gray-800">KSh {a.amount.toLocaleString()}</span></td>}
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[0.68rem] font-bold capitalize ${STATUS_CHIP[a.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>{a.status}</span>
                      </td>
                      <td className="px-4 py-3 text-[0.78rem] text-gray-500 max-w-[160px] truncate">{a.reason ?? "—"}</td>
                      <td className="px-4 py-3"><span className="text-[0.73rem] text-gray-400 whitespace-nowrap">{a.date}</span></td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {canManage && a.status === "requested" && (
                            <>
                              <button onClick={() => handleApprove(a.id, "approved")} disabled={approvingId === a.id} title="Approve"
                                className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors">
                                {approvingId === a.id ? <Loader2 size={13} className="animate-spin" /> : <ThumbsUp size={13} />}
                              </button>
                              <button onClick={() => handleApprove(a.id, "rejected")} disabled={approvingId === a.id} title="Reject"
                                className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors">
                                <ThumbsDown size={13} />
                              </button>
                            </>
                          )}
                          {canManage && a.status === "approved" && (
                            <button onClick={() => handleApprove(a.id, "paid")} disabled={approvingId === a.id} title="Mark as Paid"
                              className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors">
                              {approvingId === a.id ? <Loader2 size={13} className="animate-spin" /> : <BadgeCheck size={13} />}
                            </button>
                          )}
                          <button onClick={(e) => open(a.id, e)}
                            className={`rounded-lg p-1.5 transition-colors ${dd.id === a.id ? "bg-gray-200 text-gray-700" : "hover:bg-gray-100 text-gray-400"}`}>
                            <MoreVertical size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={canManage ? 7 : 6} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-300">
                        <TrendingUp size={38} strokeWidth={1} />
                        <p className="text-sm font-semibold text-gray-400">No advance records found</p>
                      </div>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ROOT-LEVEL DROPDOWN PORTAL — never clipped by table overflow */}
      {dd.id && ddAdvance && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} className="dd-menu fixed z-[99999] w-[176px] bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 overflow-hidden"
          style={{ top: dd.top, left: dd.left }}>
          <div className="px-3 py-2 border-b border-gray-50 mb-1">
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400">Actions</p>
            <p className="text-xs font-semibold text-gray-700 truncate">{ddAdvance.staffName}</p>
          </div>
          <button onClick={() => openModal("view", ddAdvance)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Eye size={12} /></span> View Details
          </button>
          {canManage && (
            <button onClick={() => openModal("edit", ddAdvance)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><Pencil size={12} /></span> Edit
            </button>
          )}
          {canManage && ddAdvance.status === "requested" && (
            <>
              <button onClick={() => { close(); handleApprove(ddAdvance.id, "approved"); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><ThumbsUp size={12} /></span> Approve
              </button>
              <button onClick={() => { close(); handleApprove(ddAdvance.id, "rejected"); }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-50 text-red-500"><ThumbsDown size={12} /></span> Reject
              </button>
            </>
          )}
          {canManage && ddAdvance.status === "approved" && (
            <button onClick={() => { close(); handleApprove(ddAdvance.id, "paid"); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><BadgeCheck size={12} /></span> Mark Paid
            </button>
          )}
          <div className="my-1 border-t border-gray-100" />
          <button onClick={() => handleDelete(ddAdvance.id)} disabled={deletingId === ddAdvance.id}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-50 text-red-500">
              {deletingId === ddAdvance.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            </span> Delete
          </button>
        </div>,
        document.body
      )}

      {showForm && (
        <AdvanceFormSideSheet key={mode + (selected?.id || "new")} mode={mode} advanceToEdit={selected ?? null}
          shopId={activeShop.id} isManager={isManager} currentStaff={currentStaff}
          onSuccess={handleSuccess} onClose={closeModal} />
      )}
    </>
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