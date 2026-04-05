// app/sale/sold/_components/SaleView.tsx
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, Loader2, MoreVertical, Receipt, AlertCircle, Store,
  ShoppingBag, Trash2, User, Phone, Lock,
} from "lucide-react";
import { createPortal } from "react-dom";
import { deleteSaleAction } from "./actions";
import POSSheet from "./POSSheet";
import ReceiptModal from "./ReceiptModal";

type SaleItem = { id: string; productName: string; quantity: number; price: number; discount: number };

type CreditInfo = {
  amount: number;
  downPayment: number;
  dueDate: string | null;
  status: string;
  remaining: number;
};

type Sale = {
  id: string; soldById: string; soldByName: string; items: SaleItem[];
  totalAmount: number; paymentMethod: string;
  paymentSplits: { method: string; amount: number }[];
  customerName?: string | null; customerContact?: string | null;
  shop: string; shopLocation: string; shopTel: string; shopId: string;
  date: string; createdAt: string;
  creditInfo?: CreditInfo | null;
};

type Product    = { id: string; productName: string; sellingPrice: number; buyingPrice: number; discount: number; quantity: number; imageUrl: string | null; shopId: string; shopName: string };
type ShopOption  = { id: string; name: string; location: string; tel: string };
type StaffOption = { id: string; fullName: string };
type StatPair    = { count: number; amount: number };
type Profile     = { role: string; shopId: string | null; fullName: string };

type Props = {
  stats: { today: StatPair; week: StatPair; month: StatPair; year: StatPair; total: StatPair };
  sales: Sale[]; products: Product[]; shops: ShopOption[]; staffList: StaffOption[];
  profile: Profile; hasStaffRecord: boolean; canSell: boolean;
  activeShopId: string; activeShopName: string; activeShopLocation: string;
};

const METHOD_CHIP: Record<string, string> = {
  cash:               "bg-green-50 text-green-700 border-green-200",
  mpesa:              "bg-emerald-50 text-emerald-700 border-emerald-200",
  bank:               "bg-blue-50 text-blue-700 border-blue-200",
  card:               "bg-purple-50 text-purple-700 border-purple-200",
  credit:             "bg-orange-50 text-orange-700 border-orange-200",
  split:              "bg-indigo-50 text-indigo-700 border-indigo-200",
  credit_downpayment: "bg-amber-50 text-amber-700 border-amber-200",
};

const METHOD_EMOJI: Record<string, string> = {
  cash: "💵", mpesa: "📱", bank: "🏦", card: "💳", credit: "🤝",
};

function PaymentMethodCell({ sale }: { sale: Sale }) {
  const splits = sale.paymentSplits;
  if (splits.length > 1) {
    return (
      <div className="flex flex-col gap-0.5">
        {splits.map((sp, i) => (
          <span key={i} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-bold capitalize whitespace-nowrap ${METHOD_CHIP[sp.method] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
            <span className="text-[0.6rem]">{METHOD_EMOJI[sp.method] ?? "💰"}</span>
            {`${sp.amount.toLocaleString()} ${sp.method}`}
          </span>
        ))}
      </div>
    );
  }
  if (splits.length === 1) {
    const sp = splits[0];
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.68rem] font-bold capitalize ${METHOD_CHIP[sp.method] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
        {METHOD_EMOJI[sp.method] ?? "💰"} {sp.method}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.68rem] font-bold capitalize ${METHOD_CHIP[sale.paymentMethod] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
      {METHOD_EMOJI[sale.paymentMethod] ?? "💰"} {sale.paymentMethod}
    </span>
  );
}

type DDState = { id: string | null; top: number; left: number };
function useTableDropdown() {
  const [dd, setDd] = useState<DDState>({ id: null, top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement | null>(null);
  const close = useCallback(() => setDd({ id: null, top: 0, left: 0 }), []);
  useEffect(() => {
    if (!dd.id) return;
    const handler = (e: MouseEvent) => { if (menuRef.current?.contains(e.target as Node)) return; close(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dd.id, close]);
  const open = useCallback((id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (dd.id === id) { close(); return; }
    const r = e.currentTarget.getBoundingClientRect();
    const dw = 176, gap = 6, dh = menuRef.current?.offsetHeight ?? 120;
    let top = r.bottom + gap, left = r.right - dw;
    if (top + dh > window.innerHeight - gap) top = r.top - dh - gap;
    if (top < gap) top = gap; if (left < gap) left = gap;
    if (left + dw > window.innerWidth - gap) left = window.innerWidth - dw - gap;
    setDd({ id, top, left });
  }, [dd.id, close]);
  return { dd, open, close, menuRef };
}

export default function SaleView({
  stats, sales, products, shops, staffList, profile,
  hasStaffRecord, canSell, activeShopId, activeShopName, activeShopLocation,
}: Props) {
  const router = useRouter();
  const [search, setSearch]           = useState("");
  const [showPOS, setShowPOS]         = useState(false);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
  const [deletingId, setDeletingId]   = useState<string | null>(null);
  const { dd, open, close, menuRef }  = useTableDropdown();
  const ddSale = dd.id ? sales.find(s => s.id === dd.id) : null;

  const handleDelete = async (id: string) => {
    close();
    if (!confirm("Delete this sale? Stock will NOT be restored.")) return;
    setDeletingId(id);
    const res = await deleteSaleAction(id);
    setDeletingId(null);
    if (res.success) router.refresh(); else alert(res.error || "Delete failed");
  };

  const filtered = sales.filter(s =>
    `${s.soldByName} ${s.paymentMethod} ${s.shop} ${s.customerName ?? ""} ${s.customerContact ?? ""} ${s.items.map(i => i.productName).join(" ")}`
      .toLowerCase().includes(search.toLowerCase())
  );

  const sellBlockReason = !hasStaffRecord
    ? "Your account is not linked to a staff record."
    : !canSell
    ? "You are not authorised to sell in this shop."
    : null;

  return (
    <>
      <style>{`
        .sales-table .col-sticky { position:sticky;left:0;z-index:10;box-shadow:6px 0 18px -6px rgba(0,0,0,0.06);clip-path:inset(0px -30px 0px 0px); }
        .sales-table thead .col-sticky { z-index:20; }
        .table-scroll-wrap { position:relative; }
        .table-scroll-wrap::after { content:'';position:absolute;top:0;right:0;bottom:0;width:48px;background:linear-gradient(to right,transparent,rgba(248,250,252,0.7));pointer-events:none;z-index:5;border-radius:0 16px 16px 0; }
        @keyframes rowIn { from{opacity:0;transform:translateX(-5px)} to{opacity:1;transform:translateX(0)} }
        .sales-table tbody tr { animation:rowIn 0.2s ease both; }
        @keyframes ddIn { from{opacity:0;transform:scale(0.95) translateY(-4px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .dd-menu { animation:ddIn 0.12s ease both;transform-origin:top right; }
      `}</style>

      <div className="min-h-screen bg-slate-50/80 px-3 py-5 md:px-6">
        <div className="mx-auto max-w-screen-2xl space-y-5">

          {!hasStaffRecord && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-800">
              <AlertCircle size={20} className="shrink-0 text-amber-500" />
              <p className="text-sm font-medium">Your account is not linked to a staff record. Sales are disabled.</p>
            </div>
          )}

          {hasStaffRecord && !canSell && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-800">
              <Lock size={20} className="shrink-0 text-rose-400" />
              <div>
                <p className="text-sm font-semibold">View-only mode for this shop</p>
                <p className="text-xs text-rose-600 mt-0.5">
                  You can browse products here for customer reference, but sales must be recorded in your assigned shop.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 rounded-2xl border border-green-100 bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 px-5 py-3.5 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 shadow-md">
              <Store size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.62rem] font-semibold uppercase tracking-widest text-green-400">Viewing Shop</p>
              <p className="font-bold text-green-900 truncate">{activeShopName}</p>
            </div>
            {activeShopLocation && (
              <span className="text-xs text-gray-500 bg-white/80 rounded-full px-3 py-1 border border-gray-100 shrink-0">
                {activeShopLocation}
              </span>
            )}
            {!canSell && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-full px-3 py-1 shrink-0">
                <Lock size={11} /> View only
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: "Today",      ...stats.today  },
              { label: "This Week",  ...stats.week   },
              { label: "This Month", ...stats.month  },
              { label: "This Year",  ...stats.year   },
              { label: "Total",      ...stats.total  },
            ].map(s => (
              <div key={s.label} className="relative overflow-hidden rounded-xl border border-gray-100 bg-white px-4 pt-4 pb-3 shadow-sm">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-green-500" />
                <p className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className="mt-1 text-2xl font-black tabular-nums text-gray-900">{s.count}</p>
                <p className="text-[0.7rem] font-semibold text-green-700 tabular-nums">KSh {s.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search sales, customers…"
                className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-100 shadow-sm transition" />
            </div>

            <div className="relative group shrink-0">
              <button
                onClick={() => { if (hasStaffRecord && canSell) setShowPOS(true); }}
                disabled={!hasStaffRecord || !canSell}
                className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition"
              >
                {canSell ? <Plus size={14} /> : <Lock size={14} />}
                Make Sale
              </button>
              {sellBlockReason && (
                <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-56 rounded-xl bg-gray-900 px-3 py-2 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50">
                  {sellBlockReason}
                  <div className="absolute top-full right-4 border-4 border-transparent border-t-gray-900" />
                </div>
              )}
            </div>
          </div>

          <div className="table-scroll-wrap rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="sales-table w-full min-w-[1000px] text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200">
                    <th className="col-sticky px-4 py-3.5 text-left" style={{ backgroundColor: "#f8fafc" }}>
                      <div className="flex items-center gap-3">
                        <span className="text-[0.7rem] font-bold uppercase tracking-widest text-gray-400 w-5">#</span>
                        <span className="text-[0.7rem] font-bold uppercase tracking-widest text-gray-400">Products</span>
                      </div>
                    </th>
                    {["Customer", "Items", "Amount", "Payment Breakdown", "Date", "Sold By", "Shop", "Actions"].map(h => (
                      <th key={h} className={`px-4 py-3.5 text-[0.7rem] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap ${h === "Actions" ? "text-center" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((sale, i) => {
                    const firstProduct = sale.items[0]?.productName ?? "—";
                    const extra        = sale.items.length - 1;
                    const totalItems   = sale.items.reduce((s, it) => s + it.quantity, 0);
                    const isCredit     = sale.creditInfo != null ||
                      sale.paymentMethod === "credit" ||
                      sale.paymentSplits.some(s => s.method === "credit");
                    return (
                      <tr key={sale.id}
                        className={`cursor-pointer bg-white hover:bg-slate-50 transition-colors duration-100 ${isCredit ? "border-l-2 border-l-orange-300" : ""}`}
                        style={{ animationDelay: `${i * 0.025}s` }}
                        onMouseEnter={e => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#f8fafc"; }}
                        onMouseLeave={e => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#ffffff"; }}
                      >
                        <td className="col-sticky px-4 py-3" style={{ backgroundColor: "#ffffff" }}>
                          <div className="flex items-center gap-3">
                            <span className="text-[0.72rem] font-bold text-gray-300 w-5 text-center tabular-nums shrink-0">{i + 1}</span>
                            <div className="h-9 w-9 shrink-0 rounded-xl bg-green-100 flex items-center justify-center shadow-sm">
                              <ShoppingBag size={14} className="text-green-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-800 truncate max-w-[150px] text-[0.82rem] leading-tight">{firstProduct}</p>
                              {extra > 0 && <p className="text-[0.65rem] text-green-500 font-semibold mt-0.5">+{extra} more</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 min-w-[120px]">
                          {sale.customerName || sale.customerContact ? (
                            <div>
                              {sale.customerName && (
                                <div className="flex items-center gap-1 text-[0.78rem] text-gray-700 font-medium">
                                  <User size={10} className="text-gray-400 shrink-0" />
                                  <span className="truncate max-w-[100px]">{sale.customerName}</span>
                                </div>
                              )}
                              {sale.customerContact && (
                                <div className="flex items-center gap-1 text-[0.68rem] text-gray-500">
                                  <Phone size={9} className="text-gray-400 shrink-0" />
                                  <span>{sale.customerContact}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3"><span className="tabular-nums text-[0.82rem] font-bold text-gray-700">{totalItems}</span></td>
                        <td className="px-4 py-3"><span className="tabular-nums text-[0.82rem] font-bold text-gray-800">KSh {sale.totalAmount.toLocaleString()}</span></td>
                        <td className="px-4 py-3 min-w-[160px]"><PaymentMethodCell sale={sale} /></td>
                        <td className="px-4 py-3"><span className="text-[0.75rem] text-gray-400 whitespace-nowrap">{sale.date}</span></td>
                        <td className="px-4 py-3"><span className="text-[0.78rem] text-gray-600">{sale.soldByName}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Store size={11} className="text-gray-300 shrink-0" />
                            <span className="text-[0.75rem] text-gray-500 truncate max-w-[90px]">{sale.shop}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                          <button onClick={e => open(sale.id, e)}
                            className={`rounded-lg p-1.5 transition-colors ${dd.id === sale.id ? "bg-gray-200 text-gray-700" : "hover:bg-gray-100 text-gray-400 hover:text-gray-700"}`}>
                            <MoreVertical size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-300">
                        <ShoppingBag size={40} strokeWidth={1} />
                        <p className="text-sm font-semibold text-gray-400">No sales found</p>
                      </div>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {dd.id && ddSale && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} className="dd-menu fixed z-[99999] w-[176px] bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 overflow-hidden"
          style={{ top: dd.top, left: dd.left }}>
          <div className="px-3 py-2 border-b border-gray-50 mb-1">
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400">Actions</p>
            <p className="text-xs font-semibold text-gray-700 truncate">{ddSale.customerName || ddSale.soldByName}</p>
          </div>
          <button onClick={() => { close(); setReceiptSale(ddSale); }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Receipt size={12} /></span> Receipt
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button onClick={() => handleDelete(ddSale.id)} disabled={deletingId === ddSale.id}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-50 text-red-500">
              {deletingId === ddSale.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            </span> Delete
          </button>
        </div>,
        document.body
      )}

      {showPOS && (
        <POSSheet
          products={products}
          shops={shops}
          staffList={staffList}
          profile={profile}
          activeShopId={activeShopId}
          canSell={canSell}
          onSuccess={() => { setShowPOS(false); router.refresh(); }}
          onClose={() => setShowPOS(false)}
        />
      )}
      {receiptSale && <ReceiptModal sale={receiptSale} onClose={() => setReceiptSale(null)} />}
    </>
  );
}