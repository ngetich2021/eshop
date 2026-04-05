// app/expense/_components/ExpenseView.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, Plus, Loader2, MoreVertical, Wallet, Package, Eye, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { deleteExpenseAction } from "./actions";
import ExpenseFormSideSheet from "./ExpenseFormSideSheet";

type Expense   = { id: string; description: string; amount: number; category: string | null; paidById: string; paidByName: string; shop: string; shopId: string; date: string };
type ActiveShop = { id: string; name: string; location: string };
type StatPair  = { count: number; amount: number };
type Props     = {
  activeShop: ActiveShop; isStaff: boolean; isAdmin: boolean;
  walletBalance: number; currentUserName: string;
  stats: { today: StatPair; week: StatPair; month: StatPair; year: StatPair; total: StatPair };
  expenses: Expense[];
};

type DDState = { id: string | null; top: number; left: number };

function usePortalDropdown() {
  const [dd, setDd] = useState<DDState>({ id: null, top: 0, left: 0 });
  const menuRef     = useRef<HTMLDivElement | null>(null);
  const close       = useCallback(() => setDd({ id: null, top: 0, left: 0 }), []);

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
    if (top < gap)   top  = gap;
    if (left < gap)  left = gap;
    if (left + dw > window.innerWidth - gap) left = window.innerWidth - dw - gap;
    setDd({ id, top, left });
  }, [dd.id, close]);

  return { dd, open, close, menuRef };
}

export default function ExpenseView({ activeShop, walletBalance, currentUserName, stats, expenses }: Props) {
  const router = useRouter();
  const [search, setSearch]         = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [mode, setMode]             = useState<"add" | "edit" | "view">("add");
  const [selected, setSelected]     = useState<Expense | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { dd, open, close, menuRef } = usePortalDropdown();

  const openModal     = (m: "add" | "edit" | "view", e?: Expense) => { setMode(m); setSelected(e); setShowForm(true); close(); };
  const closeModal    = () => { setShowForm(false); setSelected(undefined); };
  const handleSuccess = () => { closeModal(); router.refresh(); };

  const handleDelete = async (id: string) => {
    close();
    if (!confirm("Delete this expense?")) return;
    setDeletingId(id);
    const res = await deleteExpenseAction(id);
    setDeletingId(null);
    if (res.success) router.refresh(); else alert(res.error || "Delete failed");
  };

  const filtered = expenses.filter((e) =>
    `${e.description} ${e.category ?? ""} ${e.shop} ${e.paidByName}`.toLowerCase().includes(search.toLowerCase())
  );

  const ddExpense = dd.id ? expenses.find((e) => e.id === dd.id) : null;

  return (
    <>
      <style>{`
        .exp-table .col-sticky{position:sticky;left:0;z-index:10;box-shadow:6px 0 18px -6px rgba(0,0,0,0.06);clip-path:inset(0px -30px 0px 0px);}
        .exp-table thead .col-sticky{z-index:20;}
        .exp-scroll-wrap{position:relative}
        .exp-scroll-wrap::after{content:'';position:absolute;top:0;right:0;bottom:0;width:48px;background:linear-gradient(to right,transparent,rgba(248,250,252,0.7));pointer-events:none;z-index:5;border-radius:0 16px 16px 0}
        @keyframes rowIn{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
        .exp-table tbody tr{animation:rowIn 0.18s ease both}
        @keyframes ddIn{from{opacity:0;transform:scale(0.95) translateY(-4px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .dd-menu{animation:ddIn 0.12s ease both;transform-origin:top right}
      `}</style>

      <div className="min-h-screen bg-gray-50/80 px-3 py-5 md:px-6">
        <div className="mx-auto max-w-screen-2xl space-y-5">

          {/* WALLET BANNER */}
          <div className="flex items-center gap-4 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-5 py-3.5 shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 shadow"><Wallet size={18} className="text-white" /></div>
            <div>
              <p className="text-[0.62rem] font-bold uppercase tracking-widest text-emerald-500">Wallet Balance — {activeShop.name}</p>
              <p className="font-bold text-emerald-900 text-lg">KSh {walletBalance.toLocaleString()}</p>
            </div>
            {walletBalance <= 0 && (
              <span className="ml-auto rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 border border-red-200">No funds available</span>
            )}
          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: "Today",      ...stats.today },
              { label: "This Week",  ...stats.week },
              { label: "This Month", ...stats.month },
              { label: "This Year",  ...stats.year },
              { label: "Total",      ...stats.total },
            ].map((s) => (
              <div key={s.label} className="relative overflow-hidden rounded-xl border border-gray-100 bg-white px-4 pt-4 pb-3 shadow-sm">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-500" />
                <p className="text-[0.63rem] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className="mt-1 text-xl font-black tabular-nums text-gray-900">{s.count}</p>
                <p className="text-xs text-emerald-700 font-semibold">KSh {s.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>

          {/* TOOLBAR */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search expenses…"
                className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs focus:border-emerald-400 focus:outline-none shadow-sm transition" />
            </div>
            <button onClick={() => openModal("add")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 shadow-sm shrink-0 transition-colors">
              <Plus size={14} /> Add Expense
            </button>
          </div>

          {/* TABLE */}
          <div className="exp-scroll-wrap rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="exp-table w-full min-w-[860px] text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200">
                    <th className="col-sticky px-4 py-3.5 text-left" style={{ backgroundColor: "#f8fafc" }}>
                      <div className="flex items-center gap-3">
                        <span className="text-[0.68rem] font-bold uppercase tracking-widest text-gray-400 w-5">#</span>
                        <span className="text-[0.68rem] font-bold uppercase tracking-widest text-gray-400">Description</span>
                      </div>
                    </th>
                    {["Amount","Category","Spent By","Date","Shop","Actions"].map((h) => (
                      <th key={h} className={`px-4 py-3.5 text-[0.68rem] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap ${h === "Actions" ? "text-center" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((e, i) => (
                    <tr key={e.id}
                      onClick={() => openModal("view", e)}
                      className="cursor-pointer bg-white hover:bg-slate-50 transition-colors duration-100"
                      style={{ animationDelay: `${i * 0.025}s` }}
                      onMouseEnter={(ev) => { const td = ev.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#f8fafc"; }}
                      onMouseLeave={(ev) => { const td = ev.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#ffffff"; }}
                    >
                      <td className="col-sticky px-4 py-3" style={{ backgroundColor: "#ffffff" }}>
                        <div className="flex items-center gap-3">
                          <span className="text-[0.7rem] font-bold text-gray-300 w-5 text-center tabular-nums shrink-0">{i + 1}</span>
                          <div className="h-8 w-8 shrink-0 rounded-xl bg-emerald-100 flex items-center justify-center shadow-sm"><Package size={13} className="text-emerald-600" /></div>
                          <p className="font-semibold text-gray-800 truncate max-w-[150px] text-[0.82rem]">{e.description}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className="tabular-nums text-[0.82rem] font-bold text-gray-800">KSh {e.amount.toLocaleString()}</span></td>
                      <td className="px-4 py-3">
                        {e.category
                          ? <span className="inline-block rounded-full border px-2.5 py-0.5 text-[0.68rem] font-bold bg-blue-50 text-blue-700 border-blue-100">{e.category}</span>
                          : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-[0.78rem] text-gray-600">{e.paidByName}</td>
                      <td className="px-4 py-3"><span className="text-[0.73rem] text-gray-400 whitespace-nowrap">{e.date}</span></td>
                      <td className="px-4 py-3 text-[0.78rem] text-gray-600">{e.shop}</td>
                      <td className="px-4 py-3 text-center" onClick={(ev) => ev.stopPropagation()}>
                        <button onClick={(ev) => open(e.id, ev)}
                          className={`rounded-lg p-1.5 transition-colors ${dd.id === e.id ? "bg-gray-200 text-gray-700" : "hover:bg-gray-100 text-gray-400"}`}>
                          <MoreVertical size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-300"><Wallet size={38} strokeWidth={1} /><p className="text-sm font-semibold text-gray-400">No expenses found</p></div>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* PORTAL DROPDOWN */}
      {dd.id && ddExpense && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} className="dd-menu fixed z-[99999] w-[176px] bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 overflow-hidden"
          style={{ top: dd.top, left: dd.left }}>
          <div className="px-3 py-2 border-b border-gray-50 mb-1">
            <p className="text-[0.63rem] font-bold uppercase tracking-widest text-gray-400">Expense</p>
            <p className="text-xs font-semibold text-gray-700 truncate">{ddExpense.description}</p>
          </div>
          <button onClick={() => openModal("view", ddExpense)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Eye size={12} /></span> View Details
          </button>
          <button onClick={() => openModal("edit", ddExpense)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><Pencil size={12} /></span> Edit
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button onClick={() => handleDelete(ddExpense.id)} disabled={deletingId === ddExpense.id}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-50 text-red-500">
              {deletingId === ddExpense.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            </span> Delete
          </button>
        </div>,
        document.body
      )}

      {showForm && (
        <ExpenseFormSideSheet key={mode + (selected?.id || "new")} mode={mode} expenseToEdit={selected ?? null}
          shopId={activeShop.id} walletBalance={walletBalance} currentUserName={currentUserName}
          onSuccess={handleSuccess} onClose={closeModal} />
      )}
    </>
  );
}