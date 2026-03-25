// app/sale/quote/_components/QuoteView.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Loader2, MoreVertical, ArrowRightCircle, AlertCircle, Printer, X } from "lucide-react";
import { convertQuoteToSaleAction, deleteQuoteAction } from "./actions";
import QuotePOSSheet from "./QuotePOSSheet";

type QuoteItem = {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  discount: number;
};

type Quote = {
  id: string;
  soldById: string;
  soldByName: string;
  customerName: string;
  customerContact: string;
  items: QuoteItem[];
  amount: number;
  shop: string;
  shopLocation: string;
  shopTel: string;
  shopId: string;
  date: string;
  createdAt: string;
};

type Product = {
  id: string;
  productName: string;
  sellingPrice: number;
  buyingPrice: number;
  discount: number;
  quantity: number;
  imageUrl: string | null;
  shopId: string;
  shopName: string;
};

type ShopOption = { id: string; name: string; location: string; tel: string };
type StaffOption = { id: string; fullName: string };
type StatPair = { count: number; amount: number };

type Profile = {
  role: string;
  shopId: string | null;
  fullName: string;
};

type Props = {
  stats: { today: StatPair; week: StatPair; month: StatPair; year: StatPair; total: StatPair };
  quotes: Quote[];
  products: Product[];
  shops: ShopOption[];
  staffList: StaffOption[];
  profile: Profile;
  hasStaffRecord: boolean;
};

// ── CONVERT MODAL ──────────────────────────────────────────────────────────────
function ConvertModal({
  quote,
  onConfirm,
  onClose,
  loading,
}: {
  quote: Quote;
  onConfirm: (paymentMethod: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [paymentMethod, setPaymentMethod] = useState("");

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-gray-800">Convert to Sale</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            Converting{" "}
            <span className="font-semibold">
              {quote.items.map((i) => i.productName).join(", ")}
            </span>{" "}
            to a sale. Stock will be decremented.
          </p>
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">
              Payment Method:
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm"
            >
              <option value="">Select payment method...</option>
              <option value="cash">Cash</option>
              <option value="mpesa">M-Pesa</option>
              <option value="bank">Bank</option>
              <option value="card">Card</option>
              <option value="credit">Credit</option>
            </select>
          </div>
          <button
            onClick={() => paymentMethod && onConfirm(paymentMethod)}
            disabled={!paymentMethod || loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white py-3 font-bold rounded-xl flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <><ArrowRightCircle size={18} /> Confirm Sale</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── QUOTE PRINT MODAL ──────────────────────────────────────────────────────────
function QuotePrintModal({ quote, onClose }: { quote: Quote; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank", "width=420,height=700");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Quote - ${quote.shop}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', monospace; font-size: 12px; padding: 16px; max-width: 360px; }
            .center { text-align: center; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .shop-name { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 4px; }
            .total-row { font-size: 14px; font-weight: bold; }
            .footer { text-align: center; margin-top: 12px; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 3px 0; font-size: 12px; }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const quoteNo = quote.id.slice(-6).toUpperCase();

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-bold text-gray-800">Quote Preview</h2>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700"
            >
              <Printer size={15} /> Print
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 overflow-y-auto max-h-[70vh]">
          <div
            ref={printRef}
            className="font-mono text-xs border border-dashed border-gray-300 rounded-xl p-5 bg-white"
          >
            {/* SHOP HEADER */}
            <div className="shop-name text-center text-base font-bold mb-1">{quote.shop}</div>
            <div className="text-center text-gray-600 text-xs">
              {quote.shopLocation && <div>{quote.shopLocation}</div>}
              {quote.shopTel && <div>Tel: {quote.shopTel}</div>}
            </div>

            <div className="border-t border-dashed border-gray-400 my-3" />

            <div className="font-bold text-center text-sm mb-2">QUOTATION</div>

            {/* META */}
            <div className="flex justify-between text-xs mb-1">
              <span>Quote No:</span><span className="font-bold">{quoteNo}</span>
            </div>
            <div className="flex justify-between text-xs mb-1">
              <span>Date:</span><span>{quote.date}</span>
            </div>
            <div className="flex justify-between text-xs mb-1">
              <span>Prepared By:</span><span>{quote.soldByName}</span>
            </div>
            {quote.customerName && (
              <div className="flex justify-between text-xs mb-1">
                <span>Customer:</span><span>{quote.customerName}</span>
              </div>
            )}
            {quote.customerContact && (
              <div className="flex justify-between text-xs mb-1">
                <span>Contact:</span><span>{quote.customerContact}</span>
              </div>
            )}

            <div className="border-t border-dashed border-gray-400 my-3" />

            {/* ITEMS HEADER */}
            <div className="flex justify-between font-bold text-xs mb-1">
              <span className="flex-1">Item</span>
              <span className="w-10 text-center">Qty</span>
              <span className="w-24 text-right">Unit Price</span>
              <span className="w-24 text-right">Total</span>
            </div>
            <div className="border-t border-dashed border-gray-300 mb-2" />

            {/* ITEMS */}
            {quote.items.map((item, i) => (
              <div key={item.id} className="flex justify-between text-xs mb-1">
                <span className="flex-1 truncate pr-1">{i + 1}. {item.productName}</span>
                <span className="w-10 text-center">{item.quantity}</span>
                <span className="w-24 text-right">
                  KSh {(item.price - item.discount).toLocaleString()}
                </span>
                <span className="w-24 text-right">
                  KSh {((item.price - item.discount) * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}

            <div className="border-t border-dashed border-gray-300 my-2" />

            {/* TOTAL */}
            <div className="flex justify-between font-bold text-sm">
              <span>Total Amount:</span>
              <span>KSh {quote.amount.toLocaleString()}</span>
            </div>

            <div className="border-t border-dashed border-gray-300 my-3" />

            {/* FOOTER */}
            <div className="text-center text-xs text-gray-500">
              This is a quotation only — not a receipt.<br />
              Valid for 7 days. Thank you for your interest! 🙏
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN VIEW ──────────────────────────────────────────────────────────────────
export default function QuoteView({
  stats,
  quotes,
  products,
  shops,
  staffList,
  profile,
  hasStaffRecord,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showPOS, setShowPOS] = useState(false);
  const [editQuote, setEditQuote] = useState<Quote | undefined>();
  const [printQuote, setPrintQuote] = useState<Quote | null>(null);
  const [convertQuote, setConvertQuote] = useState<Quote | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
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
    const gap = 8, dw = 180, dh = 160;
    let top = rect.bottom + gap, left = rect.right - dw;
    if (top + dh > window.innerHeight) top = rect.top - dh - gap;
    if (left < gap) left = gap;
    if (left + dw > window.innerWidth - gap) left = window.innerWidth - dw - gap;
    setDropdownTop(top); setDropdownLeft(left); setOpenDropdownId(id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this quote?")) return;
    setDeletingId(id);
    const res = await deleteQuoteAction(id);
    setDeletingId(null);
    if (res.success) router.refresh();
    else alert(res.error || "Delete failed");
    setOpenDropdownId(null);
  };

  const handleConvert = async (paymentMethod: string) => {
    if (!convertQuote) return;
    setConvertingId(convertQuote.id);
    const res = await convertQuoteToSaleAction(convertQuote.id, paymentMethod);
    setConvertingId(null);
    setConvertQuote(null);
    if (res.success) router.refresh();
    else alert(res.error || "Conversion failed");
  };

  const filtered = quotes.filter((q) =>
    `${q.soldByName} ${q.customerName} ${q.items.map((i) => i.productName).join(" ")} ${q.shop}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50/80 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-screen-2xl space-y-6">

        {/* NO STAFF WARNING */}
        {!hasStaffRecord && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-800">
            <AlertCircle size={20} className="shrink-0 text-amber-500" />
            <p className="text-sm font-medium">
              Your account is not linked to a staff record. Quotes are disabled until an administrator adds you as staff.
            </p>
          </div>
        )}

        {/* STATS */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            { label: "Today", ...stats.today },
            { label: "This Week", ...stats.week },
            { label: "This Month", ...stats.month },
            { label: "This Year", ...stats.year },
            { label: "Total", ...stats.total },
          ].map((s) => (
            <div key={s.label} className="rounded-lg border bg-white p-3 shadow-sm text-center">
              <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{s.label}</div>
              <div className="mt-1 text-xl font-bold text-gray-900">{s.count}</div>
              <div className="text-xs text-blue-700 font-semibold">KSh {s.amount.toLocaleString()}</div>
            </div>
          ))}
        </div>

        {/* TOOLBAR */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search quotes..."
              className="w-full rounded-lg border border-gray-300 pl-10 py-2.5 text-sm focus:border-blue-500 outline-none"
            />
          </div>
          <button
            onClick={() => { if (!hasStaffRecord) return; setEditQuote(undefined); setShowPOS(true); }}
            disabled={!hasStaffRecord}
            title={!hasStaffRecord ? "No staff record linked to your account" : undefined}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} /> New Quote
          </button>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto rounded-xl border bg-white shadow">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["S/NO", "product(s)", "items", "amount", "customer", "date", "quotedBy", "shop", "actions"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left font-semibold text-gray-700 last:text-center">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((q, i) => (
                <tr key={q.id} className="hover:bg-gray-50 transition-all">
                  <td className="px-5 py-4">{i + 1}</td>
                  <td className="px-5 py-4 font-semibold max-w-[200px] truncate">
                    {q.items.map((it) => it.productName).join(", ")}
                  </td>
                  <td className="px-5 py-4">{q.items.reduce((s, it) => s + it.quantity, 0)}</td>
                  <td className="px-5 py-4 font-medium">KSh {q.amount.toLocaleString()}</td>
                  <td className="px-5 py-4 text-gray-600">{q.customerName || "—"}</td>
                  <td className="px-5 py-4">{q.date}</td>
                  <td className="px-5 py-4">{q.soldByName}</td>
                  <td className="px-5 py-4">{q.shop}</td>
                  <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => toggleDropdown(q.id, e)}
                      className="p-2 hover:bg-gray-100 rounded-full"
                    >
                      <MoreVertical size={20} />
                    </button>
                    {openDropdownId === q.id && (
                      <div
                        className="fixed z-[10000] w-48 bg-white border rounded-xl shadow-xl py-1"
                        style={{ top: `${dropdownTop}px`, left: `${dropdownLeft}px` }}
                      >
                        <button
                          onClick={() => { setOpenDropdownId(null); setPrintQuote(q); }}
                          className="flex w-full text-left px-4 py-2 text-sm hover:bg-gray-100 items-center gap-2"
                        >
                          <Printer size={14} /> Print Quote
                        </button>
                        <button
                          onClick={() => { setOpenDropdownId(null); setEditQuote(q); setShowPOS(true); }}
                          className="flex w-full text-left px-4 py-2 text-sm hover:bg-gray-100 items-center gap-2"
                        >
                          ✏️ Edit Quote
                        </button>
                        <button
                          onClick={() => { setOpenDropdownId(null); setConvertQuote(q); }}
                          className="flex w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 items-center gap-2"
                        >
                          <ArrowRightCircle size={14} /> Convert to Sale
                        </button>
                        <button
                          onClick={() => handleDelete(q.id)}
                          disabled={deletingId === q.id}
                          className="flex w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 items-center gap-2"
                        >
                          {deletingId === q.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : "🗑️"} Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-20 text-center text-gray-500">No quotes found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showPOS && (
        <QuotePOSSheet
          key={editQuote?.id ?? "new"}
          editQuote={editQuote}
          products={products}
          shops={shops}
          profile={profile}
          onSuccess={() => { setShowPOS(false); setEditQuote(undefined); router.refresh(); }}
          onClose={() => { setShowPOS(false); setEditQuote(undefined); }}
        />
      )}

      {printQuote && (
        <QuotePrintModal
          quote={printQuote}
          onClose={() => setPrintQuote(null)}
        />
      )}

      {convertQuote && (
        <ConvertModal
          quote={convertQuote}
          onConfirm={handleConvert}
          onClose={() => setConvertQuote(null)}
          loading={convertingId === convertQuote.id}
        />
      )}
    </div>
  );
}