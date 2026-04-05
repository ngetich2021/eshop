// app/inventory/adjustStock/_components/AdjustStockView.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Search, Plus, Loader2, MoreVertical, Store, MapPin,
  PackageX, SlidersHorizontal, RotateCcw, Package, Eye, Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { deleteAdjustmentAction } from "./actions";
import AdjustmentFormSideSheet from "./AdjustmentFormSideSheet";
import { deleteReturnAction, updateReturnStatusAction } from "./returnactions";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type Adjustment = {
  id: string; productName: string; productId: string; adjustType: string;
  quantity: number; originalStock: number; newStockQty: number;
  value: number; adjustedBy: string; shop: string; shopId: string; date: string;
};
type ReturnItem = {
  id: string; productId: string; productName: string;
  quantity: number; price: number; reason: string;
};
type Return = {
  id: string; saleId: string | null; reason: string; status: string;
  returnedById: string; shopId: string; shopName: string; date: string;
  totalQty: number; totalValue: number; items: ReturnItem[];
};
type ProductOption = { id: string; productName: string; quantity: number; sellingPrice: number };
type SaleOption   = { id: string; label: string };
type ShopOption   = { id: string; name: string };
type Profile      = { role: string; shopId: string | null; fullName: string };

type Props = {
  activeShop: { id: string; name: string; location: string };
  activeShopId: string;
  isStaff: boolean;
  isAdmin: boolean;
  stats: {
    totalAdjustments: number; totalValue: number;
    totalReturns: number; totalReturnValue: number; pendingReturns: number;
  };
  adjustments: Adjustment[];
  returns: Return[];
  sales: SaleOption[];
  products: ProductOption[];
  shops: ShopOption[];
  profile: Profile;
};

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  pending:  { bg: "bg-amber-50",  text: "text-amber-700",  dot: "bg-amber-400"  },
  approved: { bg: "bg-green-50",  text: "text-green-700",  dot: "bg-green-500"  },
  rejected: { bg: "bg-red-50",    text: "text-red-700",    dot: "bg-red-500"    },
};

const ADJ_TYPE_STYLES: Record<string, { bg: string; text: string }> = {
  increase: { bg: "bg-emerald-50", text: "text-emerald-700" },
  decrease: { bg: "bg-red-50",     text: "text-red-700"     },
  set:      { bg: "bg-blue-50",    text: "text-blue-700"    },
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
    const dh = menuRef.current?.offsetHeight ?? 150;
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

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function AdjustStockView({
  activeShop, isStaff, isAdmin,
  stats, adjustments, returns, sales, products, shops, profile,
}: Props) {
  const router = useRouter();
  const canManage = !isStaff;

  const [tab, setTab]               = useState<"adjustments" | "returns">("adjustments");
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const [showForm, setShowForm]   = useState(false);
  const [formMode, setFormMode]   = useState<"adjustment" | "return">("adjustment");
  const [viewAdj, setViewAdj]     = useState<Adjustment | undefined>();
  const [viewRet, setViewRet]     = useState<Return | undefined>();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const { dd, open, close, menuRef } = useTableDropdown();

  // Determine what record the open dropdown belongs to
  const ddAdj = tab === "adjustments" && dd.id ? adjustments.find((a) => a.id === dd.id) : null;
  const ddRet = tab === "returns"     && dd.id ? returns.find((r) => r.id === dd.id)     : null;

  const openAdd = () => {
    setFormMode(tab === "returns" ? "return" : "adjustment");
    setViewAdj(undefined); setViewRet(undefined);
    setShowForm(true);
  };

  const openViewAdj = (a: Adjustment) => { setFormMode("adjustment"); setViewAdj(a); setViewRet(undefined); setShowForm(true); close(); };
  const openViewRet = (r: Return)     => { setFormMode("return");     setViewRet(r); setViewAdj(undefined); setShowForm(true); close(); };
  const closeForm   = () => { setShowForm(false); setViewAdj(undefined); setViewRet(undefined); };

  const handleDeleteAdj = async (id: string) => {
    close();
    if (!confirm("Delete this adjustment?")) return;
    setDeletingId(id);
    const res = await deleteAdjustmentAction(id);
    setDeletingId(null);
    if (res.success) router.refresh(); else alert(res.error || "Delete failed");
  };

  const handleDeleteRet = async (id: string) => {
    close();
    if (!confirm("Delete this return? Stock will be reversed.")) return;
    setDeletingId(id);
    const res = await deleteReturnAction(id);
    setDeletingId(null);
    if (res.success) router.refresh(); else alert(res.error || "Delete failed");
  };

  const handleStatusChange = async (id: string, status: string) => {
    close();
    setUpdatingId(id);
    const res = await updateReturnStatusAction(id, status);
    setUpdatingId(null);
    if (res.success) router.refresh(); else alert(res.error || "Update failed");
  };

  const filteredAdj = adjustments.filter((a) =>
    `${a.productName} ${a.adjustType} ${a.shop}`.toLowerCase().includes(search.toLowerCase())
  );
  const filteredRet = returns.filter((r) => {
    const matchSearch = `${r.id} ${r.shopName} ${r.reason} ${r.items.map((i) => i.productName).join(" ")}`
      .toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stickyStyles = `
    .adj-table .col-sticky, .ret-table .col-sticky {
      position: sticky; left: 0; z-index: 10;
      box-shadow: 6px 0 18px -6px rgba(0,0,0,0.06);
      clip-path: inset(0px -30px 0px 0px);
    }
    .adj-table thead .col-sticky, .ret-table thead .col-sticky { z-index: 20; }
    .table-scroll-wrap { position: relative; }
    .table-scroll-wrap::after {
      content: ''; position: absolute; top: 0; right: 0; bottom: 0; width: 48px;
      background: linear-gradient(to right, transparent, rgba(248,250,252,0.7));
      pointer-events: none; z-index: 5; border-radius: 0 16px 16px 0;
    }
    @keyframes rowIn { from { opacity: 0; transform: translateX(-5px); } to { opacity: 1; transform: translateX(0); } }
    .adj-table tbody tr, .ret-table tbody tr { animation: rowIn 0.2s ease both; }
    @keyframes ddIn { from { opacity:0; transform:scale(0.95) translateY(-4px); } to { opacity:1; transform:scale(1) translateY(0); } }
    .dd-menu { animation: ddIn 0.12s ease both; transform-origin: top right; }
  `;

  return (
    <>
      <style>{stickyStyles}</style>

      <div className="min-h-screen bg-slate-50/80 px-3 py-5 md:px-6">
        <div className="mx-auto max-w-screen-2xl space-y-5">

          {/* Shop Banner */}
          <div className="flex items-center gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-violet-50 to-purple-50 px-5 py-3.5 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-md">
              <Store size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.62rem] font-semibold uppercase tracking-widest text-indigo-400">Active Shop</p>
              <p className="font-bold text-indigo-900 truncate">{activeShop.name}</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur px-3 py-1.5 text-xs text-gray-500 shadow-sm shrink-0 border border-gray-100">
              <MapPin size={11} className="text-indigo-400" />{activeShop.location}
            </div>
            {isStaff && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200 shrink-0">Staff View</span>}
            {isAdmin && <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700 border border-purple-200 shrink-0">Admin</span>}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="Adjustments"    value={stats.totalAdjustments} />
            <Stat label="Adj. Value"      value={`KSh ${stats.totalValue.toLocaleString()}`} />
            <Stat label="Returns"         value={stats.totalReturns} />
            <Stat label="Return Value"    value={`KSh ${stats.totalReturnValue.toLocaleString()}`} />
            <Stat label="Pending Returns" value={stats.pendingReturns} variant="warning" />
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
            <TabBtn active={tab === "adjustments"} onClick={() => { setTab("adjustments"); setSearch(""); close(); }}
              icon={<SlidersHorizontal size={15} />} label="Adjustments" count={adjustments.length} />
            <TabBtn active={tab === "returns"} onClick={() => { setTab("returns"); setSearch(""); setStatusFilter("all"); close(); }}
              icon={<RotateCcw size={15} />} label="Returns" count={returns.length}
              badge={stats.pendingReturns > 0 ? stats.pendingReturns : undefined} />
          </div>

          {/* Toolbar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {tab === "returns" && (
                (["all", "pending", "approved", "rejected"] as const).map((s) => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`rounded-full border px-4 py-1.5 text-xs font-semibold capitalize transition-all duration-150 ${
                      statusFilter === s
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200"
                        : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                    }`}>
                    {s === "all" ? `All (${returns.length})` : s}
                  </button>
                ))
              )}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder={tab === "adjustments" ? "Search adjustments…" : "Search returns…"}
                  className="w-52 rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 shadow-sm transition" />
              </div>
            </div>
            {canManage && (
              <button onClick={openAdd}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm transition shrink-0">
                <Plus size={14} />
                {tab === "adjustments" ? "Add Adjustment" : "New Return"}
              </button>
            )}
          </div>

          {/* ══ ADJUSTMENTS TABLE ══════════════════════════════════════════ */}
          {tab === "adjustments" && (
            <div className="table-scroll-wrap rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="adj-table w-full min-w-[860px] text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-200">
                      <th className="col-sticky px-4 py-3.5 text-left" style={{ backgroundColor: "#f8fafc" }}>
                        <div className="flex items-center gap-3">
                          <span className="text-[0.7rem] font-bold uppercase tracking-widest text-gray-400 w-5">#</span>
                          <span className="text-[0.7rem] font-bold uppercase tracking-widest text-gray-400">Product</span>
                        </div>
                      </th>
                      {["Type", "Old Qty", "New Qty", "Value (KSh)", "Date", "Shop", "Actions"].map((h) => (
                        <th key={h} className={`px-4 py-3.5 text-[0.7rem] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap ${h === "Actions" ? "text-center" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAdj.map((a, i) => {
                      const typeStyle = ADJ_TYPE_STYLES[a.adjustType] ?? { bg: "bg-gray-100", text: "text-gray-600" };
                      return (
                        <tr key={a.id}
                          onClick={() => openViewAdj(a)}
                          className="cursor-pointer bg-white hover:bg-slate-50 transition-colors duration-100"
                          style={{ animationDelay: `${i * 0.025}s` }}
                          onMouseEnter={(e) => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#f8fafc"; }}
                          onMouseLeave={(e) => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#ffffff"; }}
                        >
                          <td className="col-sticky px-4 py-3" style={{ backgroundColor: "#ffffff" }}>
                            <div className="flex items-center gap-3">
                              <span className="text-[0.72rem] font-bold text-gray-300 w-5 text-center tabular-nums shrink-0">{i + 1}</span>
                              <div className={`h-9 w-9 shrink-0 rounded-xl flex items-center justify-center shadow-sm
                                ${a.adjustType === "increase" ? "bg-emerald-100" : a.adjustType === "decrease" ? "bg-red-100" : "bg-blue-100"}`}>
                                <Package size={15} className={
                                  a.adjustType === "increase" ? "text-emerald-600" :
                                  a.adjustType === "decrease" ? "text-red-500" : "text-blue-500"
                                } />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-800 truncate max-w-[160px] text-[0.82rem] leading-tight">{a.productName}</p>
                                <p className="text-[0.65rem] text-gray-400 mt-0.5 truncate max-w-[160px]">by {a.adjustedBy || "—"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[0.72rem] font-semibold capitalize ${typeStyle.bg} ${typeStyle.text}`}>
                              {a.adjustType}
                            </span>
                          </td>
                          <td className="px-4 py-3"><span className="tabular-nums text-[0.8rem] text-gray-500">{a.originalStock}</span></td>
                          <td className="px-4 py-3"><span className="tabular-nums text-[0.82rem] font-bold text-gray-800">{a.newStockQty}</span></td>
                          <td className="px-4 py-3"><span className="tabular-nums text-[0.8rem] font-semibold text-gray-700">{a.value.toLocaleString()}</span></td>
                          <td className="px-4 py-3"><span className="text-[0.75rem] text-gray-400 whitespace-nowrap">{a.date}</span></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1.5">
                              <Store size={11} className="text-gray-300 shrink-0" />
                              <span className="text-[0.75rem] text-gray-500 truncate max-w-[100px]">{a.shop}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button onClick={(e) => open(a.id, e)}
                              className={`rounded-lg p-1.5 transition-colors ${dd.id === a.id ? "bg-gray-200 text-gray-700" : "hover:bg-gray-100 text-gray-400 hover:text-gray-700"}`}>
                              <MoreVertical size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredAdj.length === 0 && <EmptyRow cols={8} />}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ══ RETURNS TABLE ══════════════════════════════════════════════ */}
          {tab === "returns" && (
            <div className="table-scroll-wrap rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="ret-table w-full min-w-[900px] text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-200">
                      <th className="col-sticky px-4 py-3.5 text-left" style={{ backgroundColor: "#f8fafc" }}>
                        <div className="flex items-center gap-3">
                          <span className="text-[0.7rem] font-bold uppercase tracking-widest text-gray-400 w-5">#</span>
                          <span className="text-[0.7rem] font-bold uppercase tracking-widest text-gray-400">Products</span>
                        </div>
                      </th>
                      {["Return ID", "Qty", "Value (KSh)", "Reason", "Status", "Date", "Actions"].map((h) => (
                        <th key={h} className={`px-4 py-3.5 text-[0.7rem] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap ${h === "Actions" ? "text-center" : "text-left"}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRet.map((r, i) => {
                      const st           = STATUS_STYLES[r.status] ?? { bg: "bg-gray-50", text: "text-gray-600", dot: "bg-gray-400" };
                      const firstProduct = r.items[0]?.productName ?? "—";
                      const extra        = r.items.length - 1;
                      return (
                        <tr key={r.id}
                          onClick={() => openViewRet(r)}
                          className="cursor-pointer bg-white hover:bg-slate-50 transition-colors duration-100"
                          style={{ animationDelay: `${i * 0.025}s` }}
                          onMouseEnter={(e) => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#f8fafc"; }}
                          onMouseLeave={(e) => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#ffffff"; }}
                        >
                          <td className="col-sticky px-4 py-3" style={{ backgroundColor: "#ffffff" }}>
                            <div className="flex items-center gap-3">
                              <span className="text-[0.72rem] font-bold text-gray-300 w-5 text-center tabular-nums shrink-0">{i + 1}</span>
                              <div className="h-9 w-9 shrink-0 rounded-xl bg-violet-100 flex items-center justify-center shadow-sm">
                                <RotateCcw size={14} className="text-violet-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-800 truncate max-w-[160px] text-[0.82rem] leading-tight">{firstProduct}</p>
                                {extra > 0 && <p className="text-[0.65rem] text-indigo-500 font-semibold mt-0.5">+{extra} more item{extra > 1 ? "s" : ""}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-mono text-[0.7rem] text-gray-400 bg-gray-50 rounded-md px-2 py-0.5 border border-gray-100">{r.id.slice(0, 8)}…</span>
                          </td>
                          <td className="px-4 py-3"><span className="tabular-nums text-[0.85rem] font-bold text-gray-800">{r.totalQty}</span></td>
                          <td className="px-4 py-3"><span className="tabular-nums text-[0.8rem] font-semibold text-gray-700">{r.totalValue.toLocaleString()}</span></td>
                          <td className="px-4 py-3"><span className="text-[0.75rem] text-gray-500 truncate max-w-[120px] block">{r.reason || "—"}</span></td>
                          <td className="px-4 py-3">
                            {updatingId === r.id ? (
                              <Loader2 size={15} className="animate-spin text-gray-400" />
                            ) : (
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-bold capitalize ${st.bg} ${st.text}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                                {r.status}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3"><span className="text-[0.75rem] text-gray-400 whitespace-nowrap">{r.date}</span></td>
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button onClick={(e) => open(r.id, e)}
                              className={`rounded-lg p-1.5 transition-colors ${dd.id === r.id ? "bg-gray-200 text-gray-700" : "hover:bg-gray-100 text-gray-400 hover:text-gray-700"}`}>
                              <MoreVertical size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredRet.length === 0 && <EmptyRow cols={8} />}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ROOT-LEVEL DROPDOWN PORTAL — Adjustments */}
      {tab === "adjustments" && dd.id && ddAdj && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} className="dd-menu fixed z-[99999] w-[176px] bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 overflow-hidden"
          style={{ top: dd.top, left: dd.left }}>
          <div className="px-3 py-2 border-b border-gray-50 mb-1">
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400">Actions</p>
            <p className="text-xs font-semibold text-gray-700 truncate">{ddAdj.productName}</p>
          </div>
          <button onClick={() => openViewAdj(ddAdj)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Eye size={12} /></span> View
          </button>
          {canManage && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <button onClick={() => handleDeleteAdj(ddAdj.id)} disabled={deletingId === ddAdj.id}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-50 text-red-500">
                  {deletingId === ddAdj.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                </span> Delete
              </button>
            </>
          )}
        </div>,
        document.body
      )}

      {/* ROOT-LEVEL DROPDOWN PORTAL — Returns */}
      {tab === "returns" && dd.id && ddRet && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} className="dd-menu fixed z-[99999] w-[176px] bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 overflow-hidden"
          style={{ top: dd.top, left: dd.left }}>
          <div className="px-3 py-2 border-b border-gray-50 mb-1">
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400">Actions</p>
            <p className="text-xs font-semibold text-gray-700 truncate">{ddRet.items[0]?.productName ?? "Return"}</p>
          </div>
          <button onClick={() => openViewRet(ddRet)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Eye size={12} /></span> View
          </button>
          {canManage && ddRet.status === "pending" && (
            <>
              <button onClick={() => handleStatusChange(ddRet.id, "approved")}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 text-[0.65rem]">✅</span> Approve
              </button>
              <button onClick={() => handleStatusChange(ddRet.id, "rejected")}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-50 text-red-500 text-[0.65rem]">❌</span> Reject
              </button>
            </>
          )}
          {canManage && (
            <>
              <div className="my-1 border-t border-gray-100" />
              <button onClick={() => handleDeleteRet(ddRet.id)} disabled={deletingId === ddRet.id}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-50 text-red-500">
                  {deletingId === ddRet.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                </span> Delete
              </button>
            </>
          )}
        </div>,
        document.body
      )}

      {/* Side Sheet */}
      {showForm && (
        <AdjustmentFormSideSheet
          key={(viewAdj?.id ?? viewRet?.id) || "new"}
          mode={formMode}
          viewAdj={viewAdj ?? null}
          viewRet={viewRet ?? null}
          products={products}
          sales={sales}
          shops={shops}
          profile={profile}
          onSuccess={() => { closeForm(); router.refresh(); }}
          onClose={closeForm}
        />
      )}
    </>
  );
}

/* ─── Small helpers ──────────────────────────────────────────────────────── */
function TabBtn({ active, onClick, icon, label, count, badge }: {
  active: boolean; onClick: () => void; icon: React.ReactNode;
  label: string; count: number; badge?: number;
}) {
  return (
    <button onClick={onClick}
      className={`relative flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
        active ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {icon}{label}
      <span className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${
        active ? "bg-indigo-100 text-indigo-700" : "bg-gray-200 text-gray-500"
      }`}>{count}</span>
      {badge != null && (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold">
          {badge}
        </span>
      )}
    </button>
  );
}

function EmptyRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="py-24 text-center">
        <div className="flex flex-col items-center gap-3 text-gray-300">
          <PackageX size={40} strokeWidth={1} />
          <p className="text-sm font-semibold text-gray-400">Nothing found</p>
        </div>
      </td>
    </tr>
  );
}

function Stat({ label, value, variant = "default" }: {
  label: string; value: string | number; variant?: "default" | "warning" | "success";
}) {
  const valueColor = variant === "warning" ? "text-amber-600" : variant === "success" ? "text-green-700" : "text-gray-900";
  const accent     = variant === "warning" ? "bg-amber-400"  : variant === "success" ? "bg-green-500"  : "bg-indigo-500";
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white px-4 pt-4 pb-3 shadow-sm hover:shadow-md transition-shadow">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent}`} />
      <p className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400">{label}</p>
      <p className={`mt-1.5 text-2xl font-black tabular-nums ${valueColor}`}>{value}</p>
    </div>
  );
}