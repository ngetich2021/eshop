// app/sale/sold/_components/ReceiptModal.tsx
"use client";

import { useRef } from "react";
import { X, Printer } from "lucide-react";

type SaleItem = {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  discount: number;
};

type CreditInfo = {
  amount: number;
  downPayment: number;
  dueDate: string | null;   // ISO string or null
  status: string;
  remaining: number;        // amount - downPayment (adjusted for any payments made)
};

type Sale = {
  id: string;
  soldByName: string;
  items: SaleItem[];
  totalAmount: number;
  paymentMethod: string;
  paymentSplits: { method: string; amount: number }[];
  customerName?: string | null;
  customerContact?: string | null;
  shop: string;
  shopLocation: string;
  shopTel: string;
  date: string;
  createdAt: string;
  creditInfo?: CreditInfo | null;
};

type Props = {
  sale: Sale;
  onClose: () => void;
};

const METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  mpesa: "M-Pesa",
  bank: "Bank Transfer",
  card: "Card",
  credit: "Credit",
  credit_downpayment: "Down Payment",
  split: "Split Payment",
};

const METHOD_EMOJI: Record<string, string> = {
  cash: "💵",
  mpesa: "📱",
  bank: "🏦",
  card: "💳",
  credit: "🤝",
  credit_downpayment: "💰",
};

export default function ReceiptModal({ sale, onClose }: Props) {
  const receiptRef = useRef<HTMLDivElement>(null);

  const isCredit = sale.creditInfo != null ||
    sale.paymentMethod === "credit" ||
    sale.paymentSplits.some(s => s.method === "credit");

  // Splits to display — filter out the raw "credit" payment row for credit sales
  // because we render credit details separately below
  const displaySplits = sale.paymentSplits.length > 0
    ? sale.paymentSplits.filter(s => isCredit ? s.method !== "credit" : true)
    : [{ method: sale.paymentMethod, amount: sale.totalAmount }];

  const paidNow = displaySplits
    .filter(s => s.method !== "credit")
    .reduce((sum, s) => sum + s.amount, 0);

  const creditAmount = sale.creditInfo
    ? sale.creditInfo.amount - sale.creditInfo.downPayment
    : sale.paymentSplits.find(s => s.method === "credit")?.amount ?? 0;

  const dueDate = sale.creditInfo?.dueDate
    ? new Date(sale.creditInfo.dueDate).toLocaleDateString("en-GB", {
        day: "2-digit", month: "short", year: "numeric",
      })
    : null;

  const handlePrint = () => {
    const content = receiptRef.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank", "width=400,height=700");
    if (!win) return;
    win.document.write(`
      <html>
        <head>
          <title>Receipt - ${sale.shop}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', monospace; font-size: 12px; padding: 16px; max-width: 300px; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; margin: 3px 0; }
            .shop-name { font-size: 18px; font-weight: bold; text-align: center; margin-bottom: 4px; }
            .total-row { font-size: 14px; font-weight: bold; }
            .footer { text-align: center; margin-top: 12px; font-size: 11px; }
            .credit-box { border: 1px dashed #000; padding: 6px; margin: 6px 0; }
            .credit-title { font-weight: bold; text-align: center; font-size: 11px; margin-bottom: 4px; }
            .warn { font-weight: bold; }
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

  const receiptNo = sale.id.slice(-6).toUpperCase();

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="font-bold text-gray-800">Receipt Preview</h2>
            {isCredit && (
              <p className="text-[0.65rem] text-orange-600 font-semibold mt-0.5">🤝 Credit sale — balance shown below</p>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-green-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-green-700"
            >
              <Printer size={15} /> Print
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* RECEIPT CONTENT */}
        <div className="p-5 overflow-y-auto max-h-[75vh]">
          <div
            ref={receiptRef}
            className="font-mono text-xs border border-dashed border-gray-300 rounded-xl p-5 bg-white"
          >
            {/* SHOP HEADER */}
            <div className="text-center text-base font-bold mb-1">{sale.shop}</div>
            <div className="text-center text-gray-600 text-xs">
              {sale.shopLocation && <div>{sale.shopLocation}</div>}
              {sale.shopTel && <div>Tel: {sale.shopTel}</div>}
            </div>

            <div className="border-t border-dashed border-gray-400 my-3" />

            <div className="font-bold text-center text-sm mb-2">
              {isCredit ? "CREDIT SALE RECEIPT" : "RECEIPT"}
            </div>

            {/* META */}
            <div className="flex justify-between text-xs mb-1">
              <span>No:</span><span className="font-bold">{receiptNo}</span>
            </div>
            <div className="flex justify-between text-xs mb-1">
              <span>Date:</span><span>{sale.date}</span>
            </div>
            <div className="flex justify-between text-xs mb-1">
              <span>Served by:</span><span>{sale.soldByName}</span>
            </div>
            {sale.customerName && (
              <div className="flex justify-between text-xs mb-1">
                <span>Customer:</span><span>{sale.customerName}</span>
              </div>
            )}
            {sale.customerContact && (
              <div className="flex justify-between text-xs mb-1">
                <span>Contact:</span><span>{sale.customerContact}</span>
              </div>
            )}

            <div className="border-t border-dashed border-gray-400 my-3" />

            {/* ITEMS HEADER */}
            <div className="flex justify-between font-bold text-xs mb-1">
              <span className="flex-1">Item</span>
              <span className="w-10 text-center">Qty</span>
              <span className="w-20 text-right">Cost</span>
            </div>
            <div className="border-t border-dashed border-gray-300 mb-2" />

            {/* ITEMS */}
            {sale.items.map((item, i) => (
              <div key={item.id} className="flex justify-between text-xs mb-1">
                <span className="flex-1 truncate pr-1">{i + 1}. {item.productName}</span>
                <span className="w-10 text-center">{item.quantity}</span>
                <span className="w-20 text-right">
                  KSh {((item.price - item.discount) * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}

            <div className="border-t border-dashed border-gray-300 my-2" />

            {/* TOTAL */}
            <div className="flex justify-between font-bold text-sm mb-1">
              <span>Total:</span>
              <span>KSh {sale.totalAmount.toLocaleString()}</span>
            </div>

            {/* ── PAYMENT SECTION ────────────────────────────────── */}
            <div className="border-t border-dashed border-gray-300 my-2" />

            {isCredit ? (
              /* Credit sale breakdown */
              <div className="border border-dashed border-gray-400 rounded p-2 my-2 space-y-1">
                <div className="font-bold text-center text-xs mb-1">PAYMENT DETAILS</div>

                {/* Non-credit splits (down payments) */}
                {displaySplits.length > 0 && displaySplits.some(s => s.amount > 0) && (
                  <>
                    {displaySplits.map((sp, i) => (
                      <div key={i} className="flex justify-between text-xs">
                        <span>{METHOD_EMOJI[sp.method] ?? "💰"} {METHOD_LABELS[sp.method] ?? sp.method} (paid):</span>
                        <span className="font-semibold">KSh {sp.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </>
                )}

                {/* Credit balance */}
                {creditAmount > 0 && (
                  <div className="flex justify-between text-xs font-bold">
                    <span>🤝 Credit balance:</span>
                    <span>KSh {creditAmount.toLocaleString()}</span>
                  </div>
                )}

                {/* Due date */}
                {dueDate && (
                  <div className="flex justify-between text-xs mt-1">
                    <span>Due date:</span>
                    <span className="font-bold">{dueDate}</span>
                  </div>
                )}

                {/* Status */}
                {sale.creditInfo && (
                  <div className="flex justify-between text-xs">
                    <span>Status:</span>
                    <span className="font-bold capitalize">{sale.creditInfo.status}</span>
                  </div>
                )}

                {/* Reminder */}
                <div className="border-t border-dashed border-gray-300 mt-1 pt-1 text-center text-[0.6rem] font-bold">
                  ⚠ BALANCE DUE: KSh {creditAmount.toLocaleString()}
                  {dueDate ? ` by ${dueDate}` : ""}
                </div>
              </div>
            ) : (
              /* Fully-paid payment breakdown */
              <>
                {displaySplits.length === 1 ? (
                  <div className="flex justify-between text-xs mb-1">
                    <span>
                      {METHOD_EMOJI[displaySplits[0].method] ?? "💰"}{" "}
                      {METHOD_LABELS[displaySplits[0].method] ?? displaySplits[0].method}:
                    </span>
                    <span className="font-semibold">KSh {displaySplits[0].amount.toLocaleString()}</span>
                  </div>
                ) : (
                  <>
                    <div className="text-xs font-bold mb-1">Payment breakdown:</div>
                    {displaySplits.map((sp, i) => (
                      <div key={i} className="flex justify-between text-xs mb-0.5 pl-2">
                        <span>
                          {METHOD_EMOJI[sp.method] ?? "💰"}{" "}
                          {METHOD_LABELS[sp.method] ?? sp.method}:
                        </span>
                        <span>KSh {sp.amount.toLocaleString()}</span>
                      </div>
                    ))}
                  </>
                )}
                <div className="flex justify-between text-xs font-bold mt-1">
                  <span>✓ Paid in full</span>
                  <span>KSh {sale.totalAmount.toLocaleString()}</span>
                </div>
              </>
            )}

            <div className="border-t border-dashed border-gray-300 my-3" />

            {/* FOOTER */}
            <div className="text-center text-xs text-gray-500">
              {isCredit
                ? <>Please settle your balance on time.<br />Thank you! 🙏</>
                : <>Thank you for shopping with us!<br />Come again 🙏</>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}