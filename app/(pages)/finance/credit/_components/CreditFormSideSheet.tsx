// app/credit/_components/CreditPaymentSheet.tsx
"use client";

import { ArrowLeft, Loader2, CreditCard, Trash2, User, Phone } from "lucide-react";
import { useActionState, useState } from "react";
import { addCreditPaymentAction, deleteCreditPaymentAction, editCreditAction } from "./actions";

type ActionResult = { success: boolean; error?: string };

type Payment = {
  id: string;
  amount: number;
  method: string;
  note: string | null;
  dueDate: string | null;
  paidAt: string;
};

type Props = {
  credit: {
    id: string;
    amount: number;
    downPayment: number;
    totalPaid: number;
    due: number;
    dueDate: string | null;
    status: string;
    shop: string;
    shopId: string;
    date: string;
    customerName: string | null;
    customerPhone: string | null;
    payments: Payment[];
  };
  onSuccess: () => void;
  onClose: () => void;
};

const METHOD_STYLES: Record<string, string> = {
  cash: "bg-green-100 text-green-700",
  mpesa: "bg-emerald-100 text-emerald-700",
  bank: "bg-blue-100 text-blue-700",
  card: "bg-purple-100 text-purple-700",
};

export default function CreditPaymentSheet({ credit, onSuccess, onClose }: Props) {
  const pct = Math.min(100, Math.round((credit.totalPaid / credit.amount) * 100));

  // Customer info editing
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [customerName, setCustomerName] = useState(credit.customerName ?? "");
  const [customerPhone, setCustomerPhone] = useState(credit.customerPhone ?? "");
  const [savingCustomer, setSavingCustomer] = useState(false);

  const [state, submitAction, isPending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      formData.set("creditId", credit.id);
      formData.set("shopId", credit.shopId);
      const res = await addCreditPaymentAction(prev, formData);
      if (res.success) onSuccess();
      return res;
    },
    { success: false }
  );

  const handleDeletePayment = async (id: string) => {
    if (!confirm("Remove this payment record?")) return;
    const res = await deleteCreditPaymentAction(id);
    if (res.success) onSuccess();
    else alert(res.error ?? "Delete failed");
  };

  const handleSaveCustomer = async () => {
    setSavingCustomer(true);
    const fd = new FormData();
    fd.set("creditId", credit.id);
    fd.set("customerName", customerName);
    fd.set("customerPhone", customerPhone);
    const res = await editCreditAction({ success: false }, fd);
    setSavingCustomer(false);
    if (res.success) {
      setEditingCustomer(false);
      onSuccess();
    } else {
      alert(res.error ?? "Save failed");
    }
  };

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
      <div className="w-full max-w-[420px] md:max-w-[520px] h-full bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* HEADER */}
        <div className="flex items-center gap-4 border-b px-6 py-4 bg-white shrink-0">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={22} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CreditCard size={20} className="text-orange-500" /> Credit Payments
            </h2>
            <p className="text-xs text-gray-500">{credit.shop} · Added {credit.date}</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">

          {/* CUSTOMER INFO */}
          <div className="p-5 border-b bg-blue-50 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                Customer
              </h3>
              <button
                onClick={() => setEditingCustomer(!editingCustomer)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                {editingCustomer ? "Cancel" : "Edit"}
              </button>
            </div>

            {editingCustomer ? (
              <div className="space-y-2">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Customer name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-400 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                  <input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 07XX XXX XXX"
                    type="tel"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-400 outline-none"
                  />
                </div>
                <button
                  onClick={handleSaveCustomer}
                  disabled={savingCustomer}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2"
                >
                  {savingCustomer ? <Loader2 size={14} className="animate-spin" /> : "Save Customer Info"}
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <User size={14} className="text-blue-400 shrink-0" />
                  {credit.customerName ? (
                    <span className="font-medium">{credit.customerName}</span>
                  ) : (
                    <span className="text-gray-400 italic">No name set — click Edit</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Phone size={14} className="text-blue-400 shrink-0" />
                  {credit.customerPhone ? (
                    <span>{credit.customerPhone}</span>
                  ) : (
                    <span className="text-gray-400 italic">No phone set</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* CREDIT SUMMARY */}
          <div className="p-5 border-b bg-orange-50 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Credit</span>
              <span className="text-xl font-bold text-gray-900">
                KSh {credit.amount.toLocaleString()}
              </span>
            </div>

            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Paid: KSh {credit.totalPaid.toLocaleString()}</span>
                <span>Remaining: KSh {credit.due.toLocaleString()}</span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    pct >= 100 ? "bg-green-500" : pct > 0 ? "bg-orange-400" : "bg-gray-300"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="text-right text-xs text-gray-500 mt-0.5">{pct}% paid</div>
            </div>

            <div className="flex items-center justify-between">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  credit.status === "paid"
                    ? "bg-green-100 text-green-700"
                    : credit.status === "partial"
                    ? "bg-blue-100 text-blue-700"
                    : "bg-yellow-100 text-yellow-700"
                }`}
              >
                {credit.status}
              </span>
              {credit.dueDate && (
                <span className="text-xs text-gray-500">Due: {credit.dueDate}</span>
              )}
            </div>
          </div>

          {/* PAYMENT HISTORY */}
          {(credit.payments.length > 0 || credit.downPayment > 0) && (
            <div className="p-5 border-b space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                Payment History
              </h3>

              {credit.downPayment > 0 && (
                <div className="flex items-center justify-between rounded-xl bg-gray-50 border px-4 py-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">
                      KSh {credit.downPayment.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">Down payment · at sale</div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-gray-200 text-gray-600">
                    initial
                  </span>
                </div>
              )}

              {credit.payments.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl bg-white border px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800">
                      KSh {p.amount.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500 truncate">
                      {p.paidAt}
                      {p.note && ` · ${p.note}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                        METHOD_STYLES[p.method] ?? "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {p.method}
                    </span>
                    <button
                      onClick={() => handleDeletePayment(p.id)}
                      className="p-1 hover:bg-red-50 rounded-full text-red-400 hover:text-red-600"
                      title="Remove payment"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ADD PAYMENT FORM */}
          {credit.status !== "paid" && (
            <div className="p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
                Record New Payment
              </h3>

              {state?.error && (
                <div className="mb-3 bg-red-100 border border-red-300 text-red-700 text-sm px-4 py-3 rounded-xl">
                  {state.error}
                </div>
              )}

              <form action={submitAction} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Amount Received (KSh) <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="amount"
                    type="number"
                    min={1}
                    max={credit.due}
                    required
                    placeholder={`Max KSh ${credit.due.toLocaleString()}`}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:border-orange-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="method"
                    required
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"
                  >
                    <option value="">Select method...</option>
                    <option value="cash">Cash</option>
                    <option value="mpesa">M-Pesa</option>
                    <option value="bank">Bank</option>
                    <option value="card">Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Date Received
                  </label>
                  <input
                    name="paidAt"
                    type="date"
                    defaultValue={today}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Update Due Date (optional)
                  </label>
                  <input
                    name="dueDate"
                    type="date"
                    defaultValue={credit.dueDate ?? ""}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Reference / Note (optional)
                  </label>
                  <input
                    name="note"
                    type="text"
                    placeholder="e.g. Mpesa ref: ABC123"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white py-3 font-bold rounded-xl flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <><CreditCard size={16} /> Record Payment</>
                  )}
                </button>
              </form>
            </div>
          )}

          {credit.status === "paid" && (
            <div className="p-8 text-center text-green-600">
              <div className="text-4xl mb-2">✅</div>
              <div className="font-bold text-lg">Fully Paid</div>
              <div className="text-sm text-gray-500 mt-1">
                KSh {credit.amount.toLocaleString()} collected
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}