// app/credit/_components/CreditView.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, Loader2, MoreVertical, CreditCard, Store, MapPin, User, Phone, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { deleteCreditAction } from "./actions";
import CreditPaymentSheet from "./CreditFormSideSheet";

type Payment   = { id: string; amount: number; method: string; note: string | null; dueDate: string | null; paidAt: string };
type SaleLeg   = { method: string; amount: number; date: string };
type Credit    = {
  id: string; amount: number; downPayment: number; totalPaid: number; due: number;
  dueDate: string | null; status: string; shop: string; shopId: string;
  customerName: string | null; customerPhone: string | null; date: string;
  payments: Payment[];
  saleLegs: SaleLeg[];
};
type StatBlock = { count: number; added: number; paid: number; due: number };
type Props     = {
  activeShop: { id: string; name: string; location: string };
  isAdmin: boolean;
  stats: { today: StatBlock; week: StatBlock; month: StatBlock; year: StatBlock; total: StatBlock };
  credits: Credit[];
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
    const dw = 180, gap = 6, dh = menuRef.current?.offsetHeight ?? 140;
    let top = r.bottom + gap, left = r.right - dw;
    if (top + dh > window.innerHeight - gap) top = r.top - dh - gap;
    if (top < gap) top = gap; if (left < gap) left = gap;
    if (left + dw > window.innerWidth - gap) left = window.innerWidth - dw - gap;
    setDd({ id, top, left });
  }, [dd.id, close]);
  return { dd, open, close, menuRef };
}

export default function CreditView({ activeShop, isAdmin, stats, credits }: Props) {
  const router = useRouter();
  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState<"all" | "pending" | "partial" | "paid">("all");
  const [hidePaid, setHidePaid]           = useState(true);
  const [paymentCredit, setPaymentCredit] = useState<Credit | null>(null);
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const { dd, open, close, menuRef }      = usePortalDropdown();

  const handleDelete = async (id: string) => {
    close();
    if (!confirm("Delete this credit record? All payments will be removed too.")) return;
    setDeletingId(id);
    const res = await deleteCreditAction(id);
    setDeletingId(null);
    if (res.success) router.refresh(); else alert(res.error || "Delete failed");
  };

  const openPaySheet = (c: Credit) => { close(); setPaymentCredit(c); };

  const filtered = credits.filter((c) => {
    if (hidePaid && statusFilter !== "paid" && c.status === "paid") return false;
    const matchSearch = `${c.status} ${c.shop} ${c.customerName ?? ""} ${c.customerPhone ?? ""}`.toLowerCase().includes(search.toLowerCase());
    return matchSearch && (statusFilter === "all" || c.status === statusFilter);
  });

  const paidCount = credits.filter((c) => c.status === "paid").length;
  const periods   = [
    { label: "Today", s: stats.today }, { label: "Week", s: stats.week },
    { label: "Month", s: stats.month }, { label: "Year",  s: stats.year },
    { label: "Total", s: stats.total },
  ];
  const ddCredit = dd.id ? credits.find((c) => c.id === dd.id) : null;

  return (
    <>
      <style>{`
        .crd-table .col-sticky{position:sticky;left:0;z-index:10;box-shadow:6px 0 18px -6px rgba(0,0,0,0.06);clip-path:inset(0px -30px 0px 0px);}
        .crd-table thead .col-sticky{z-index:20;}
        .crd-scroll-wrap{position:relative}
        .crd-scroll-wrap::after{content:'';position:absolute;top:0;right:0;bottom:0;width:48px;background:linear-gradient(to right,transparent,rgba(248,250,252,0.7));pointer-events:none;z-index:5;border-radius:0 16px 16px 0}
        @keyframes rowIn{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
        .crd-table tbody tr{animation:rowIn 0.18s ease both}
        @keyframes ddIn{from{opacity:0;transform:scale(0.95) translateY(-4px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .dd-menu{animation:ddIn 0.12s ease both;transform-origin:top right}
      `}</style>
      <div className="min-h-screen bg-gray-50/80 px-3 py-5 md:px-6">
        <div className="mx-auto max-w-screen-2xl space-y-5">
          <div className="flex items-center gap-4 rounded-xl border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 px-5 py-3.5 shadow-sm">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 shadow"><Store size={18} className="text-white" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.62rem] font-semibold uppercase tracking-widest text-orange-400">Active Shop</p>
              <p className="font-bold text-orange-900 truncate">{activeShop.name}</p>
            </div>
            {activeShop.location && <div className="flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs text-gray-500 shadow-sm shrink-0"><MapPin size={11} /> {activeShop.location}</div>}
            <div className="text-xs bg-orange-100 text-orange-700 rounded-full px-3 py-1 font-medium border border-orange-200 shrink-0">ℹ️ Auto-created from sales</div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {periods.map(({ label, s }) => (
              <div key={label} className="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-orange-500" />
                <div className="text-[0.63rem] font-bold text-gray-400 mb-2 uppercase tracking-widest">{label}</div>
                <div className="flex justify-between text-xs text-gray-600"><span>Credits</span><span className="font-semibold text-gray-800">{s.count} · KSh {s.added.toLocaleString()}</span></div>
                <div className="flex justify-between text-xs text-gray-600 mt-1"><span>Collected</span><span className="font-semibold text-green-700">KSh {s.paid.toLocaleString()}</span></div>
                <div className="flex justify-between text-xs text-gray-600 mt-1"><span>Outstanding</span><span className="font-semibold text-red-600">KSh {s.due.toLocaleString()}</span></div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone, status…"
                className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs focus:border-orange-400 focus:outline-none shadow-sm transition" />
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              {(["all","pending","partial","paid"] as const).map((s) => (
                <button key={s} onClick={() => { setStatusFilter(s); if (s === "paid") setHidePaid(false); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border capitalize transition-all ${statusFilter === s ? "bg-orange-500 text-white border-orange-500" : "bg-white text-gray-600 border-gray-300 hover:border-orange-300"}`}>{s}</button>
              ))}
              {paidCount > 0 && statusFilter !== "paid" && (
                <button onClick={() => setHidePaid(!hidePaid)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${hidePaid ? "bg-green-600 text-white border-green-600" : "bg-white text-gray-600 border-gray-300"}`}>
                  {hidePaid ? `✓ Hiding ${paidCount} paid` : `Show all (${paidCount} paid)`}
                </button>
              )}
            </div>
          </div>

          <div className="crd-scroll-wrap rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="crd-table w-full min-w-[1100px] text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200">
                    <th className="col-sticky px-4 py-3.5 text-left" style={{ backgroundColor: "#f8fafc" }}>
                      <div className="flex items-center gap-3">
                        <span className="text-[0.68rem] font-bold uppercase tracking-widest text-gray-400 w-5">#</span>
                        <span className="text-[0.68rem] font-bold uppercase tracking-widest text-gray-400">Customer</span>
                      </div>
                    </th>
                    {["Total Credit","Collected","Remaining","Progress","Date","Due Date","Status","Shop","Actions"].map((h) => (
                      <th key={h} className={`px-4 py-3.5 text-[0.68rem] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap ${h === "Actions" ? "text-center" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((c, i) => {
                    const pct = Math.min(100, Math.round((c.totalPaid / c.amount) * 100));
                    return (
                      <tr key={c.id} className="cursor-pointer bg-white hover:bg-slate-50 transition-colors duration-100" style={{ animationDelay: `${i * 0.025}s` }}
                        onClick={() => setPaymentCredit(c)}
                        onMouseEnter={(e) => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#f8fafc"; }}
                        onMouseLeave={(e) => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#ffffff"; }}
                      >
                        <td className="col-sticky px-4 py-3" style={{ backgroundColor: "#ffffff" }}>
                          <div className="flex items-center gap-3">
                            <span className="text-[0.7rem] font-bold text-gray-300 w-5 text-center tabular-nums shrink-0">{i + 1}</span>
                            <div className="min-w-0">
                              {c.customerName ? <p className="flex items-center gap-1 font-semibold text-gray-800 text-[0.82rem] truncate max-w-[130px]"><User size={11} className="text-gray-400 shrink-0" />{c.customerName}</p> : <p className="text-gray-400 text-xs italic">No name</p>}
                              {c.customerPhone && <p className="flex items-center gap-1 text-[0.68rem] text-gray-500"><Phone size={10} className="text-gray-400 shrink-0" />{c.customerPhone}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><span className="tabular-nums text-[0.82rem] font-bold text-gray-800">KSh {c.amount.toLocaleString()}</span></td>
                        <td className="px-4 py-3"><span className="tabular-nums text-[0.82rem] font-bold text-green-700">KSh {c.totalPaid.toLocaleString()}</span></td>
                        <td className="px-4 py-3"><span className="tabular-nums text-[0.82rem] font-bold text-red-600">KSh {c.due.toLocaleString()}</span></td>
                        <td className="px-4 py-3 min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${pct >= 100 ? "bg-green-500" : pct > 0 ? "bg-orange-400" : "bg-gray-300"}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-gray-500 shrink-0">{pct}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-3"><span className="text-[0.73rem] text-gray-400 whitespace-nowrap">{c.date}</span></td>
                        <td className="px-4 py-3"><span className="text-[0.73rem] text-gray-400 whitespace-nowrap">{c.dueDate ?? "—"}</span></td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[0.68rem] font-bold capitalize ${c.status === "paid" ? "bg-green-50 text-green-700 border-green-200" : c.status === "partial" ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>{c.status}</span>
                        </td>
                        <td className="px-4 py-3 text-[0.78rem] text-gray-600">{c.shop}</td>
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {c.status !== "paid" && (
                              <button onClick={(e) => { e.stopPropagation(); setPaymentCredit(c); }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-semibold border border-orange-200 transition-all">
                                <CreditCard size={11} /> Pay
                              </button>
                            )}
                            <button onClick={(e) => open(c.id, e)} className={`rounded-lg p-1.5 transition-colors ${dd.id === c.id ? "bg-gray-200 text-gray-700" : "hover:bg-gray-100 text-gray-400"}`}><MoreVertical size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={11} className="py-20 text-center text-sm text-gray-400">
                      {hidePaid && paidCount > 0 ? `No unpaid credits found. ${paidCount} paid credit(s) hidden — click "Show all".` : "No credit records found."}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {dd.id && ddCredit && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} className="dd-menu fixed z-[99999] w-[176px] bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 overflow-hidden" style={{ top: dd.top, left: dd.left }}>
          <div className="px-3 py-2 border-b border-gray-50 mb-1">
            <p className="text-[0.63rem] font-bold uppercase tracking-widest text-gray-400">Credit</p>
            <p className="text-xs font-semibold text-gray-700 truncate">{ddCredit.customerName ?? "Anonymous"}</p>
            <p className="text-[0.63rem] text-gray-400">KSh {ddCredit.amount.toLocaleString()}</p>
          </div>
          {ddCredit.status !== "paid" && (
            <button onClick={() => openPaySheet(ddCredit)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-orange-50 hover:text-orange-700 transition-colors">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-50 text-orange-600"><CreditCard size={12} /></span> View / Pay
            </button>
          )}
          {ddCredit.status === "paid" && (
            <button onClick={() => openPaySheet(ddCredit)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><CreditCard size={12} /></span> View History
            </button>
          )}
          {isAdmin && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <button onClick={() => handleDelete(ddCredit.id)} disabled={deletingId === ddCredit.id}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-50 text-red-500">
                  {deletingId === ddCredit.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                </span> Delete
              </button>
            </>
          )}
        </div>,
        document.body
      )}

      {paymentCredit && (
        <CreditPaymentSheet
          credit={paymentCredit}
          onSuccess={() => { setPaymentCredit(null); router.refresh(); }}
          onClose={() => setPaymentCredit(null)}
        />
      )}
    </>
  );
}