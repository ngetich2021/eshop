// app/sale/quote/_components/QuoteView.tsx
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, Loader2, MoreVertical, ArrowRightCircle,
  AlertCircle, Printer, X, Store, FileText, Lock,
} from "lucide-react";
import { createPortal } from "react-dom";
import { convertQuoteToSaleAction, deleteQuoteAction } from "./actions";
import QuotePOSSheet from "./QuotePOSSheet";
import ConvertModal, { type ConvertPayload } from "./ConvertModal";

type QuoteItem = { id: string; productName: string; quantity: number; price: number; discount: number };
type Quote = {
  id: string; soldById: string; soldByName: string; customerName: string;
  customerContact: string; items: QuoteItem[]; amount: number; shop: string;
  shopLocation: string; shopTel: string; shopId: string; date: string; createdAt: string;
};
type Product = {
  id: string; productName: string; sellingPrice: number; buyingPrice: number;
  discount: number; quantity: number; imageUrl: string | null; shopId: string; shopName: string;
};
type ShopOption  = { id: string; name: string; location: string; tel: string };
type StaffOption = { id: string; fullName: string };
type StatPair    = { count: number; amount: number };
type Profile     = { role: string; shopId: string | null; fullName: string };
type Props = {
  stats: { today: StatPair; week: StatPair; month: StatPair; year: StatPair; total: StatPair };
  quotes: Quote[]; products: Product[]; shops: ShopOption[]; staffList: StaffOption[];
  profile: Profile; hasStaffRecord: boolean; canSell: boolean; // ← new
  activeShopId: string; activeShopName: string; activeShopLocation: string;
};

type DDState = { id: string | null; top: number; left: number };

function useTableDropdown() {
  const [dd, setDd]   = useState<DDState>({ id: null, top: 0, left: 0 });
  const menuRef       = useRef<HTMLDivElement | null>(null);
  const close         = useCallback(() => setDd({ id: null, top: 0, left: 0 }), []);
  useEffect(() => {
    if (!dd.id) return;
    const handler = (e: MouseEvent) => { if (menuRef.current?.contains(e.target as Node)) return; close(); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dd.id, close]);
  const open = useCallback((id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (dd.id === id) { close(); return; }
    const r  = e.currentTarget.getBoundingClientRect();
    const dw = 192, gap = 6;
    const dh = menuRef.current?.offsetHeight ?? 160;
    let top  = r.bottom + gap;
    let left = r.right - dw;
    if (top + dh > window.innerHeight - gap) top  = r.top - dh - gap;
    if (top < gap) top = gap; if (left < gap) left = gap;
    if (left + dw > window.innerWidth - gap) left = window.innerWidth - dw - gap;
    setDd({ id, top, left });
  }, [dd.id, close]);
  return { dd, open, close, menuRef };
}

function QuotePrintModal({ quote, onClose }: { quote: Quote; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank", "width=420,height=700");
    if (!win) return;
    win.document.write(`<html><head><title>Quote - ${quote.shop}</title>
      <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Courier New',monospace;font-size:12px;padding:16px;max-width:360px}
      .center{text-align:center}.divider{border-top:1px dashed #000;margin:8px 0}.row{display:flex;justify-content:space-between;margin:3px 0}
      .shop-name{font-size:18px;font-weight:bold;text-align:center;margin-bottom:4px}table{width:100%;border-collapse:collapse}td{padding:3px 0;font-size:12px}
      </style></head><body>${content}</body></html>`);
    win.document.close(); win.focus(); win.print(); win.close();
  };
  const quoteNo = quote.id.slice(-6).toUpperCase();
  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-gray-800">Quote Preview</h2>
          <div className="flex gap-2">
            <button onClick={handlePrint} className="flex items-center gap-1.5 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-blue-700">
              <Printer size={14} /> Print
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
          </div>
        </div>
        <div className="p-5 overflow-y-auto max-h-[70vh]">
          <div ref={printRef} className="font-mono text-xs border border-dashed border-gray-300 rounded-xl p-5 bg-white">
            <div className="text-center text-base font-bold mb-1">{quote.shop}</div>
            <div className="text-center text-gray-600 text-xs">
              {quote.shopLocation && <div>{quote.shopLocation}</div>}
              {quote.shopTel && <div>Tel: {quote.shopTel}</div>}
            </div>
            <div className="border-t border-dashed border-gray-400 my-3" />
            <div className="font-bold text-center text-sm mb-2">QUOTATION</div>
            <div className="flex justify-between text-xs mb-1"><span>Quote No:</span><span className="font-bold">{quoteNo}</span></div>
            <div className="flex justify-between text-xs mb-1"><span>Date:</span><span>{quote.date}</span></div>
            <div className="flex justify-between text-xs mb-1"><span>Prepared By:</span><span>{quote.soldByName}</span></div>
            {quote.customerName && <div className="flex justify-between text-xs mb-1"><span>Customer:</span><span>{quote.customerName}</span></div>}
            {quote.customerContact && <div className="flex justify-between text-xs mb-1"><span>Contact:</span><span>{quote.customerContact}</span></div>}
            <div className="border-t border-dashed border-gray-400 my-3" />
            <div className="flex justify-between font-bold text-xs mb-1">
              <span className="flex-1">Item</span><span className="w-10 text-center">Qty</span>
              <span className="w-24 text-right">Unit Price</span><span className="w-24 text-right">Total</span>
            </div>
            <div className="border-t border-dashed border-gray-300 mb-2" />
            {quote.items.map((item, i) => (
              <div key={item.id} className="flex justify-between text-xs mb-1">
                <span className="flex-1 truncate pr-1">{i + 1}. {item.productName}</span>
                <span className="w-10 text-center">{item.quantity}</span>
                <span className="w-24 text-right">KSh {(item.price - item.discount).toLocaleString()}</span>
                <span className="w-24 text-right">KSh {((item.price - item.discount) * item.quantity).toLocaleString()}</span>
              </div>
            ))}
            <div className="border-t border-dashed border-gray-300 my-2" />
            <div className="flex justify-between font-bold text-sm"><span>Total Amount:</span><span>KSh {quote.amount.toLocaleString()}</span></div>
            <div className="border-t border-dashed border-gray-300 my-3" />
            <div className="text-center text-xs text-gray-500">This is a quotation only — not a receipt.<br />Valid for 7 days. Thank you! 🙏</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function QuoteView({
  stats, quotes, products, shops, staffList, profile,
  hasStaffRecord, canSell, activeShopId, activeShopName, activeShopLocation,
}: Props) {
  const router = useRouter();
  const [search, setSearch]             = useState("");
  const [showPOS, setShowPOS]           = useState(false);
  const [editQuote, setEditQuote]       = useState<Quote | undefined>();
  const [printQuote, setPrintQuote]     = useState<Quote | null>(null);
  const [convertQuote, setConvertQuote] = useState<Quote | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const { dd, open, close, menuRef }    = useTableDropdown();
  const ddQuote = dd.id ? quotes.find(q => q.id === dd.id) : null;

  const handleDelete = async (id: string) => {
    close();
    if (!confirm("Delete this quote?")) return;
    setDeletingId(id);
    const res = await deleteQuoteAction(id);
    setDeletingId(null);
    if (res.success) router.refresh(); else alert(res.error || "Delete failed");
  };

  const handleConvert = async (payload: ConvertPayload) => {
    if (!convertQuote) return;
    setConvertingId(convertQuote.id);
    const res = await convertQuoteToSaleAction(
      convertQuote.id,
      payload.paymentMethod,
      payload.downPayment,
      payload.dueDate,
      payload.customerName,
      payload.customerContact,
      payload.splits,
    );
    setConvertingId(null);
    setConvertQuote(null);
    if (res.success) router.refresh(); else alert(res.error || "Conversion failed");
  };

  const filtered = quotes.filter(q =>
    `${q.soldByName} ${q.customerName} ${q.items.map(i => i.productName).join(" ")} ${q.shop}`
      .toLowerCase().includes(search.toLowerCase())
  );

  const quoteBlockReason = !hasStaffRecord
    ? "Your account is not linked to a staff record."
    : !canSell
    ? "You are not authorised to create quotes in this shop."
    : null;

  return (
    <>
      <style>{`
        .quotes-table .col-sticky { position:sticky;left:0;z-index:10;box-shadow:6px 0 18px -6px rgba(0,0,0,0.06);clip-path:inset(0px -30px 0px 0px); }
        .quotes-table thead .col-sticky { z-index:20; }
        .table-scroll-wrap { position:relative; }
        .table-scroll-wrap::after { content:'';position:absolute;top:0;right:0;bottom:0;width:48px;background:linear-gradient(to right,transparent,rgba(248,250,252,0.7));pointer-events:none;z-index:5;border-radius:0 16px 16px 0; }
        @keyframes rowIn { from{opacity:0;transform:translateX(-5px)} to{opacity:1;transform:translateX(0)} }
        .quotes-table tbody tr { animation:rowIn 0.2s ease both; }
        @keyframes ddIn { from{opacity:0;transform:scale(0.95) translateY(-4px)} to{opacity:1;transform:scale(1) translateY(0)} }
        .dd-menu { animation:ddIn 0.12s ease both;transform-origin:top right; }
      `}</style>

      <div className="min-h-screen bg-slate-50/80 px-3 py-5 md:px-6">
        <div className="mx-auto max-w-screen-2xl space-y-5">

          {!hasStaffRecord && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-800">
              <AlertCircle size={20} className="shrink-0 text-amber-500" />
              <p className="text-sm font-medium">Your account is not linked to a staff record. Quotes are disabled.</p>
            </div>
          )}

          {hasStaffRecord && !canSell && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-rose-800">
              <Lock size={20} className="shrink-0 text-rose-400" />
              <div>
                <p className="text-sm font-semibold">View-only mode for this shop</p>
                <p className="text-xs text-rose-600 mt-0.5">
                  You can browse products here for customer reference, but quotes must be created in your assigned shop.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-violet-50 to-purple-50 px-5 py-3.5 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-md">
              <Store size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.62rem] font-semibold uppercase tracking-widest text-indigo-400">Viewing Shop</p>
              <p className="font-bold text-indigo-900 truncate">{activeShopName}</p>
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
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-500" />
                <p className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className="mt-1 text-2xl font-black tabular-nums text-gray-900">{s.count}</p>
                <p className="text-[0.7rem] font-semibold text-blue-600 tabular-nums">KSh {s.amount.toLocaleString()}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search quotes…"
                className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 shadow-sm transition" />
            </div>

            <div className="relative group shrink-0">
              <button
                onClick={() => { if (hasStaffRecord && canSell) { setEditQuote(undefined); setShowPOS(true); } }}
                disabled={!hasStaffRecord || !canSell}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition shrink-0"
              >
                {canSell ? <Plus size={14} /> : <Lock size={14} />}
                New Quote
              </button>
              {quoteBlockReason && (
                <div className="pointer-events-none absolute bottom-full right-0 mb-2 w-56 rounded-xl bg-gray-900 px-3 py-2 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-lg z-50">
                  {quoteBlockReason}
                  <div className="absolute top-full right-4 border-4 border-transparent border-t-gray-900" />
                </div>
              )}
            </div>
          </div>

          <div className="table-scroll-wrap rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="quotes-table w-full min-w-[860px] text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200">
                    <th className="col-sticky px-4 py-3.5 text-left" style={{ backgroundColor: "#f8fafc" }}>
                      <div className="flex items-center gap-3">
                        <span className="text-[0.7rem] font-bold uppercase tracking-widest text-gray-400 w-5">#</span>
                        <span className="text-[0.7rem] font-bold uppercase tracking-widest text-gray-400">Products</span>
                      </div>
                    </th>
                    {["Items", "Amount", "Customer", "Quoted By", "Date", "Shop", "Actions"].map(h => (
                      <th key={h} className={`px-4 py-3.5 text-[0.7rem] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap ${h === "Actions" ? "text-center" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((q, i) => {
                    const firstProduct = q.items[0]?.productName ?? "—";
                    const extra = q.items.length - 1;
                    const totalItems = q.items.reduce((s, it) => s + it.quantity, 0);
                    return (
                      <tr key={q.id}
                        className="cursor-pointer bg-white hover:bg-slate-50 transition-colors duration-100"
                        style={{ animationDelay: `${i * 0.025}s` }}
                        onMouseEnter={e => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#f8fafc"; }}
                        onMouseLeave={e => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#ffffff"; }}
                      >
                        <td className="col-sticky px-4 py-3" style={{ backgroundColor: "#ffffff" }}>
                          <div className="flex items-center gap-3">
                            <span className="text-[0.72rem] font-bold text-gray-300 w-5 text-center tabular-nums shrink-0">{i + 1}</span>
                            <div className="h-9 w-9 shrink-0 rounded-xl bg-blue-100 flex items-center justify-center shadow-sm">
                              <FileText size={14} className="text-blue-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-800 truncate max-w-[160px] text-[0.82rem] leading-tight">{firstProduct}</p>
                              {extra > 0 && <p className="text-[0.65rem] text-indigo-500 font-semibold mt-0.5">+{extra} more item{extra > 1 ? "s" : ""}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3"><span className="tabular-nums text-[0.82rem] font-bold text-gray-700">{totalItems}</span></td>
                        <td className="px-4 py-3"><span className="tabular-nums text-[0.82rem] font-bold text-gray-800">KSh {q.amount.toLocaleString()}</span></td>
                        <td className="px-4 py-3">
                          <span className="text-[0.78rem] text-gray-600 truncate max-w-[120px] block">
                            {q.customerName || <span className="text-gray-300">—</span>}
                          </span>
                          {q.customerContact && <span className="text-[0.68rem] text-gray-400">{q.customerContact}</span>}
                        </td>
                        <td className="px-4 py-3"><span className="text-[0.78rem] text-gray-600">{q.soldByName}</span></td>
                        <td className="px-4 py-3"><span className="text-[0.75rem] text-gray-400 whitespace-nowrap">{q.date}</span></td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Store size={11} className="text-gray-300 shrink-0" />
                            <span className="text-[0.75rem] text-gray-500 truncate max-w-[90px]">{q.shop}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                          <button onClick={e => open(q.id, e)}
                            className={`rounded-lg p-1.5 transition-colors ${dd.id === q.id ? "bg-gray-200 text-gray-700" : "hover:bg-gray-100 text-gray-400"}`}>
                            <MoreVertical size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-300">
                        <FileText size={40} strokeWidth={1} />
                        <p className="text-sm font-semibold text-gray-400">No quotes found</p>
                      </div>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {dd.id && ddQuote && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} className="dd-menu fixed z-[99999] w-[192px] bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 overflow-hidden"
          style={{ top: dd.top, left: dd.left }}>
          <div className="px-3 py-2 border-b border-gray-50 mb-1">
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400">Actions</p>
            <p className="text-xs font-semibold text-gray-700 truncate">{ddQuote.customerName || ddQuote.soldByName}</p>
          </div>
          <button onClick={() => { close(); setPrintQuote(ddQuote); }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Printer size={12} /></span> Print Quote
          </button>
          <button onClick={() => { close(); setEditQuote(ddQuote); setShowPOS(true); }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-50 text-violet-600 text-[0.65rem]">✏️</span> Edit Quote
          </button>
          <button onClick={() => { close(); setConvertQuote(ddQuote); }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600"><ArrowRightCircle size={12} /></span> Convert to Sale
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button onClick={() => handleDelete(ddQuote.id)} disabled={deletingId === ddQuote.id}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-50 text-red-500">
              {deletingId === ddQuote.id ? <Loader2 size={12} className="animate-spin" /> : <span className="text-[0.65rem]">🗑️</span>}
            </span> Delete
          </button>
        </div>,
        document.body
      )}

      {showPOS && (
        <QuotePOSSheet
          key={editQuote?.id ?? "new"}
          editQuote={editQuote}
          products={products}
          shops={shops}
          profile={profile}
          activeShopId={activeShopId}
          canSell={canSell}
          onSuccess={() => { setShowPOS(false); setEditQuote(undefined); router.refresh(); }}
          onClose={() => { setShowPOS(false); setEditQuote(undefined); }}
        />
      )}
      {printQuote && <QuotePrintModal quote={printQuote} onClose={() => setPrintQuote(null)} />}
      {convertQuote && (
        <ConvertModal
          quote={convertQuote}
          onConfirm={handleConvert}
          onClose={() => setConvertQuote(null)}
          loading={convertingId === convertQuote.id}
        />
      )}
    </>
  );
}