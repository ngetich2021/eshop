// app/sale/quote/_components/ConvertModal.tsx
"use client";

import { useState } from "react";
import { X, ArrowRightCircle, Loader2 } from "lucide-react";

type Quote = {
  id: string;
  items: { id: string; productName: string; quantity: number; price: number; discount: number }[];
  amount: number;
  customerName: string;
};

type Props = {
  quote: Quote;
  onConfirm: (paymentMethod: string, downPayment: number, dueDate?: string) => void;
  onClose: () => void;
  loading: boolean;
};

export default function ConvertModal({ quote, onConfirm, onClose, loading }: Props) {
  const [paymentMethod, setPaymentMethod] = useState("");
  const [downPayment, setDownPayment] = useState(0);
  const [dueDate, setDueDate] = useState("");

  const isCredit = paymentMethod === "credit";
  const balance = quote.amount - downPayment;

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
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

          {/* Total */}
          <div className="flex justify-between items-center bg-gray-50 rounded-xl px-4 py-3">
            <span className="text-sm text-gray-600">Total Amount</span>
            <span className="font-bold text-gray-900 text-lg">
              KSh {quote.amount.toLocaleString()}
            </span>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">
              Payment Method:
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => {
                setPaymentMethod(e.target.value);
                if (e.target.value !== "credit") {
                  setDownPayment(0);
                  setDueDate("");
                }
              }}
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

          {/* Credit-specific fields */}
          {isCredit && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-3">
              <p className="text-xs font-bold text-orange-700 uppercase tracking-wide">
                🏦 Credit Terms
              </p>
              <div>
                <label className="block mb-1 text-xs font-medium text-gray-700">
                  Down Payment (KSh)
                </label>
                <input
                  type="number"
                  min={0}
                  max={quote.amount}
                  value={downPayment}
                  onChange={(e) =>
                    setDownPayment(Math.max(0, Math.min(quote.amount, Number(e.target.value))))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block mb-1 text-xs font-medium text-gray-700">
                  Due Date (optional)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="bg-white rounded-lg px-3 py-2 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Down payment:</span>
                  <span className="text-green-700 font-semibold">
                    KSh {downPayment.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600 mt-1">
                  <span>Balance on credit:</span>
                  <span className="text-orange-600 font-bold">
                    KSh {Math.max(0, balance).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={() =>
              paymentMethod && onConfirm(paymentMethod, downPayment, dueDate || undefined)
            }
            disabled={!paymentMethod || loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white py-3 font-bold rounded-xl flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <ArrowRightCircle size={18} />{" "}
                {isCredit ? "Record Credit Sale" : "Confirm Sale"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}