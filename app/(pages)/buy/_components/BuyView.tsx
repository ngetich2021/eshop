// app/buy/_components/BuyView.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, Plus, Loader2, MoreVertical, Store, ShoppingBag, Package, Eye, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { deleteBuyAction } from "./actions";
import BuyFormSideSheet from "./BuyFormSideSheet";

type Buy = {
  id: string; supplierName: string; supplierId: string; itemsJson: string;
  totalAmount: number; transportCost: number; status: string;
  shop: string; shopId: string; buyerName: string; date: string;
};
type SupplierOption = { id: string; name: string };
type ActiveShop = { id: string; name: string; location: string };
type Props = {
  activeShop: ActiveShop; activeUserName: string;
  stats: { totalItems: number; totalAmount: number; totalTransport: number };
  buys: Buy[]; suppliers: SupplierOption[];
};

const STATUS_CHIP: Record<string, string> = {
  shipped:   "bg-green-50 text-green-700 border-green-100",
  cancelled: "bg-red-50 text-red-700 border-red-100",
  pending:   "bg-amber-50 text-amber-700 border-amber-100",
};

// ── Portal dropdown hook ──────────────────────────────────────────────────────
type DDState = { id: string | null; top: number; left: number };

function useTableDropdown() {
  const [dd, setDd]   = useState<DDState>({ id: null, top: 0, left: 0 });
  const menuRef       = useRef<HTMLDivElement | null>(null);
  const close         = useCallback(() => setDd({ id: null, top: 0, left: 0 }), []);

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
    const r  = e.currentTarget.getBoundingClientRect();
    const dw = 176, gap = 6;
    const dh = menuRef.current?.offsetHeight ?? 140;
    let top  = r.bottom + gap;
    let left = r.right - dw;
    if (top + dh > window.innerHeight - gap) top  = r.top - dh - gap;
    if (top < gap)                            top  = gap;
    if (left < gap)                           left = gap;
    if (left + dw > window.innerWidth - gap)  left = window.innerWidth - dw - gap;
    setDd({ id, top, left });
  }, [dd.id, close]);

  return { dd, open, close, menuRef };
}

export default function BuyView({ activeShop, activeUserName, stats, buys, suppliers }: Props) {
  const router = useRouter();
  const [search, setSearch]         = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [mode, setMode]             = useState<"add" | "edit" | "view">("add");
  const [selected, setSelected]     = useState<Buy | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { dd, open, close, menuRef } = useTableDropdown();

  const ddBuy = dd.id ? buys.find((b) => b.id === dd.id) : null;

  const openModal     = (m: "add" | "edit" | "view", b?: Buy) => { setMode(m); setSelected(b); setShowForm(true); close(); };
  const closeModal    = () => { setShowForm(false); setSelected(undefined); };
  const handleSuccess = () => { closeModal(); router.refresh(); };

  const handleDelete = async (id: string) => {
    close();
    if (!confirm("Delete this purchase?")) return;
    setDeletingId(id);
    const res = await deleteBuyAction(id);
    setDeletingId(null);
    if (res.success) router.refresh(); else alert(res.error || "Delete failed");
  };

  const getItems = (json: string) => { try { return JSON.parse(json); } catch { return []; } };
  const filtered = buys.filter((b) =>
    `${b.supplierName} ${b.status} ${b.shop} ${b.buyerName}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <style>{`
        .buy-table .col-sticky { position:sticky;left:0;z-index:10;box-shadow:6px 0 18px -6px rgba(0,0,0,0.06);clip-path:inset(0px -30px 0px 0px); }
        .buy-table thead .col-sticky { z-index:20; }
        .table-scroll-wrap{position:relative}
        .table-scroll-wrap::after{content:'';position:absolute;top:0;right:0;bottom:0;width:48px;background:linear-gradient(to right,transparent,rgba(248,250,252,0.7));pointer-events:none;z-index:5;border-radius:0 16px 16px 0}
        @keyframes rowIn{from{opacity:0;transform:translateX(-5px)}to{opacity:1;transform:translateX(0)}}
        .buy-table tbody tr{animation:rowIn 0.2s ease both}
        @keyframes ddIn{from{opacity:0;transform:scale(0.95) translateY(-4px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .dd-menu{animation:ddIn 0.12s ease both;transform-origin:top right}
      `}</style>

      <div className="min-h-screen bg-slate-50/80 px-3 py-5 md:px-6">
        <div className="mx-auto max-w-screen-2xl space-y-5">

          <div className="flex items-center gap-4 rounded-2xl border border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 px-5 py-3.5 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 shadow-md"><Store size={18} className="text-white" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.62rem] font-semibold uppercase tracking-widest text-green-400">Buying For</p>
              <p className="font-bold text-green-900 truncate">{activeShop.name}</p>
              {activeShop.location && <p className="text-xs text-green-600">{activeShop.location}</p>}
            </div>
            <div className="text-xs text-gray-500 bg-white/80 rounded-full px-3 py-1 shadow-sm shrink-0 border border-gray-100">👤 {activeUserName}</div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {[
              { label: "Total Purchases",  value: stats.totalItems,                               accent: "bg-indigo-500" },
              { label: "Goods Cost",       value: `KSh ${stats.totalAmount.toLocaleString()}`,    accent: "bg-green-500" },
              { label: "Total Transport",  value: `KSh ${stats.totalTransport.toLocaleString()}`, accent: "bg-amber-500" },
            ].map((s) => (
              <div key={s.label} className="relative overflow-hidden rounded-xl border border-gray-100 bg-white px-4 pt-4 pb-3 shadow-sm">
                <div className={`absolute top-0 left-0 right-0 h-0.5 ${s.accent}`} />
                <p className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className="mt-1.5 text-2xl font-black tabular-nums text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
            <ShoppingBag size={16} className="shrink-0 mt-0.5 text-blue-500" />
            <p>Each purchase is automatically recorded as an <strong>expense</strong> and deducted from the shop wallet. Transport costs are also recorded as a separate expense.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search purchases…"
                className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs focus:border-green-400 focus:outline-none shadow-sm transition" />
            </div>
            <button onClick={() => openModal("add")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 shadow-sm shrink-0">
              <Plus size={14} /> Buy Items
            </button>
          </div>

          <div className="table-scroll-wrap rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="buy-table w-full min-w-[860px] text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200">
                    <th className="col-sticky px-4 py-3.5 text-left" style={{ backgroundColor: "#f8fafc" }}>
                      <div className="flex items-center gap-3">
                        <span className="text-[0.7rem] font-bold uppercase tracking-widest text-gray-400 w-5">#</span>
                        <span className="text-[0.7rem] font-bold uppercase tracking-widest text-gray-400">Products</span>
                      </div>
                    </th>
                    {["Amount", "Transport", "Supplier", "By", "Status", "Date", "Actions"].map((h) => (
                      <th key={h} className={`px-4 py-3.5 text-[0.7rem] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap ${h === "Actions" ? "text-center" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((b, i) => {
                    const items     = getItems(b.itemsJson);
                    const firstName = items[0]?.name ?? "—";
                    const extra     = items.length - 1;
                    const chipStyle = STATUS_CHIP[b.status] ?? "bg-gray-100 text-gray-600 border-gray-200";
                    return (
                      <tr key={b.id}
                        onClick={() => openModal("view", b)}
                        className="cursor-pointer bg-white hover:bg-slate-50 transition-colors duration-100"
                        style={{ animationDelay: `${i * 0.025}s` }}
                        onMouseEnter={(e) => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#f8fafc"; }}
                        onMouseLeave={(e) => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#ffffff"; }}
                      >
                        <td className="col-sticky px-4 py-3" style={{ backgroundColor: "#ffffff" }}>
                          <div className="flex items-center gap-3">
                            <span className="text-[0.72rem] font-bold text-gray-300 w-5 text-center tabular-nums shrink-0">{i + 1}</span>
                            <div className="h-9 w-9 shrink-0 rounded-xl bg-green-100 flex items-center justify-center shadow-sm"><Package size={14} className="text-green-600" /></div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-800 truncate max-w-[160px] text-[0.82rem] leading-tight">{firstName}</p>
                              {extra > 0 && <p className="text-[0.65rem] text-green-500 font-semibold mt-0.5">+{extra} more item{extra > 1 ? "s" : ""}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><span className="tabular-nums text-[0.82rem] font-bold text-gray-800">KSh {b.totalAmount.toLocaleString()}</span></td>
                        <td className="px-4 py-3"><span className="tabular-nums text-[0.78rem] text-gray-500">{b.transportCost > 0 ? `KSh ${b.transportCost.toLocaleString()}` : "—"}</span></td>
                        <td className="px-4 py-3"><span className="text-[0.78rem] text-gray-700">{b.supplierName}</span></td>
                        <td className="px-4 py-3"><span className="text-[0.78rem] text-gray-500">{b.buyerName}</span></td>
                        <td className="px-4 py-3">
                          <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[0.7rem] font-bold capitalize ${chipStyle}`}>{b.status}</span>
                        </td>
                        <td className="px-4 py-3"><span className="text-[0.75rem] text-gray-400 whitespace-nowrap">{b.date}</span></td>
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button onClick={(e) => open(b.id, e)}
                            className={`rounded-lg p-1.5 transition-colors ${dd.id === b.id ? "bg-gray-200 text-gray-700" : "hover:bg-gray-100 text-gray-400"}`}>
                            <MoreVertical size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-300"><ShoppingBag size={40} strokeWidth={1} /><p className="text-sm font-semibold text-gray-400">No purchases found</p></div>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ROOT-LEVEL DROPDOWN PORTAL */}
      {dd.id && ddBuy && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} className="dd-menu fixed z-[99999] w-[176px] bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 overflow-hidden"
          style={{ top: dd.top, left: dd.left }}>
          <div className="px-3 py-2 border-b border-gray-50 mb-1">
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400">Actions</p>
            <p className="text-xs font-semibold text-gray-700 truncate">{ddBuy.supplierName}</p>
          </div>
          <button onClick={() => openModal("view", ddBuy)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Eye size={12} /></span> View
          </button>
          <button onClick={() => openModal("edit", ddBuy)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><Pencil size={12} /></span> Edit
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button onClick={() => handleDelete(ddBuy.id)} disabled={deletingId === ddBuy.id}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-50 text-red-500">
              {deletingId === ddBuy.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            </span> Delete
          </button>
        </div>,
        document.body
      )}

      {showForm && (
        <BuyFormSideSheet key={mode + (selected?.id || "new")} mode={mode} buyToEdit={selected ?? null}
          suppliers={suppliers} activeShopId={activeShop.id} activeShopName={activeShop.name}
          activeUserName={activeUserName} onSuccess={handleSuccess} onClose={closeModal} />
      )}
    </>
  );
}