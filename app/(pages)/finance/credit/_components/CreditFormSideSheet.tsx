// app/credit/_components/CreditPaymentSheet.tsx
"use client";

import { ArrowLeft, Loader2, CreditCard, Trash2, User, Phone, PlusCircle, X, TrendingDown } from "lucide-react";
import { useActionState, useState, useCallback } from "react";
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

// A "leg" from the original sale (down payment portions captured at sale time)
type SaleLeg = {
  method: string;
  amount: number;
  date: string;
};

type CreditProp = {
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
  // Sale payment legs captured at time of sale (mpesa, cash portions etc.)
  saleLegs?: SaleLeg[];
};

type Props = {
  credit: CreditProp;
  onSuccess: () => void;
  onClose: () => void;
};

type PaymentLine = { id: string; method: string; amount: number };

const METHODS = [
  { value: "cash",  label: "Cash",   emoji: "💵" },
  { value: "mpesa", label: "M-Pesa", emoji: "📱" },
  { value: "bank",  label: "Bank",   emoji: "🏦" },
  { value: "card",  label: "Card",   emoji: "💳" },
];

const METHOD_STYLES: Record<string, string> = {
  cash:  "bg-green-100 text-green-700 border-green-200",
  mpesa: "bg-emerald-100 text-emerald-700 border-emerald-200",
  bank:  "bg-blue-100 text-blue-700 border-blue-200",
  card:  "bg-purple-100 text-purple-700 border-purple-200",
};

function genId() { return Math.random().toString(36).slice(2, 9); }
function fmt(n: number) { return `KSh ${n.toLocaleString()}`; }

// ── Running Ledger Row ────────────────────────────────────────────────────────
function LedgerRow({
  label, method, amount, balance, isCredit = false, isInitial = false, date,
}: {
  label: string; method?: string; amount: number; balance: number;
  isCredit?: boolean; isInitial?: boolean; date?: string;
}) {
  return (
    <div className={`relative flex items-start gap-3 py-3 px-4 rounded-xl border ${
      isInitial ? "bg-slate-50 border-gray-200" :
      isCredit  ? "bg-orange-50 border-orange-200" :
                  "bg-white border-gray-200"
    }`}>
      {/* Timeline dot */}
      <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${
        isInitial ? "bg-gray-400" : isCredit ? "bg-orange-400" : "bg-green-500"
      }`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[0.78rem] font-semibold text-gray-800">{label}</span>
            {method && (
              <span className={`inline-block rounded-full border px-2 py-0.5 text-[0.62rem] font-bold capitalize ${METHOD_STYLES[method] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
                {method}
              </span>
            )}
            {date && <span className="text-[0.65rem] text-gray-400">{date}</span>}
          </div>
          <div className="text-right shrink-0">
            {!isCredit && (
              <span className="text-[0.82rem] font-black text-green-700">+{fmt(amount)}</span>
            )}
            {isCredit && (
              <span className="text-[0.82rem] font-black text-orange-600">{fmt(amount)} credit</span>
            )}
          </div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[0.65rem] text-gray-400">Running balance:</span>
          <span className={`text-[0.72rem] font-bold tabular-nums ${balance <= 0 ? "text-green-600" : "text-red-600"}`}>
            {balance <= 0 ? "✓ Fully paid" : `${fmt(balance)} remaining`}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CreditPaymentSheet({ credit, onSuccess, onClose }: Props) {
  const [localPayments, setLocalPayments] = useState<Payment[]>(credit.payments);
  const localTotalPaid = credit.downPayment + localPayments.reduce((s, p) => s + p.amount, 0);
  const localDue = Math.max(0, credit.amount - localTotalPaid);
  const pct = Math.min(100, Math.round((localTotalPaid / credit.amount) * 100));

  const [editingCustomer, setEditingCustomer] = useState(false);
  const [customerName, setCustomerName]       = useState(credit.customerName ?? "");
  const [customerPhone, setCustomerPhone]     = useState(credit.customerPhone ?? "");
  const [savingCustomer, setSavingCustomer]   = useState(false);

  const [paymentLines, setPaymentLines] = useState<PaymentLine[]>([{ id: genId(), method: "", amount: 0 }]);
  const [note, setNote]           = useState("");
  const [paidAt, setPaidAt]       = useState(new Date().toISOString().split("T")[0]);
  const [newDueDate, setNewDueDate] = useState(credit.dueDate ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const totalLinesAmount = paymentLines.reduce((s, l) => s + (l.amount || 0), 0);
  const lineBalance = localDue - totalLinesAmount;

  const addLine = () => {
    const leftover = Math.max(0, localDue - paymentLines.reduce((s, l) => s + l.amount, 0));
    setPaymentLines(prev => [...prev, { id: genId(), method: "", amount: leftover }]);
  };
  const removeLine = (id: string) => setPaymentLines(prev => prev.filter(l => l.id !== id));
  const updateLine = (id: string, field: keyof Omit<PaymentLine, "id">, value: string | number) =>
    setPaymentLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  const autoFillLine = (id: string) => {
    const others = paymentLines.filter(l => l.id !== id).reduce((s, l) => s + (l.amount || 0), 0);
    setPaymentLines(prev => prev.map(l => l.id === id ? { ...l, amount: Math.max(0, localDue - others) } : l));
  };

  const handleSubmit = async () => {
    setError(null);
    if (paymentLines.some(l => !l.method)) { setError("Select a payment method for each line."); return; }
    if (totalLinesAmount <= 0) { setError("Enter an amount greater than 0."); return; }
    if (totalLinesAmount > localDue + 0.01) { setError(`Total exceeds remaining balance (${fmt(localDue)}).`); return; }

    setSubmitting(true);
    for (const line of paymentLines) {
      if (line.amount <= 0) continue;
      const fd = new FormData();
      fd.set("creditId", credit.id);
      fd.set("shopId", credit.shopId);
      fd.set("amount", String(line.amount));
      fd.set("method", line.method);
      fd.set("note", note);
      fd.set("paidAt", paidAt);
      if (newDueDate) fd.set("dueDate", newDueDate);
      const res = await addCreditPaymentAction({ success: false }, fd);
      if (!res.success) { setError(res.error ?? "Payment failed"); setSubmitting(false); return; }
    }
    setSubmitting(false);
    const newPayments: Payment[] = paymentLines.filter(l => l.amount > 0).map(l => ({
      id: genId(), amount: l.amount, method: l.method,
      note: note || null, dueDate: newDueDate || null, paidAt,
    }));
    setLocalPayments(prev => [...prev, ...newPayments]);
    setPaymentLines([{ id: genId(), method: "", amount: 0 }]);
    setNote("");
    onSuccess();
  };

  const handleDeletePayment = async (id: string) => {
    if (!confirm("Remove this payment record?")) return;
    const res = await deleteCreditPaymentAction(id);
    if (res.success) { setLocalPayments(prev => prev.filter(p => p.id !== id)); onSuccess(); }
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
    if (res.success) { setEditingCustomer(false); onSuccess(); }
    else alert(res.error ?? "Save failed");
  };

  const isPaid = localDue <= 0;

  // ── Build the running ledger ────────────────────────────────────────────────
  // We reconstruct the full payment timeline with running balances
  type LedgerEntry = {
    key: string;
    label: string;
    method?: string;
    amount: number;
    balance: number;
    isCredit: boolean;
    isInitial: boolean;
    date?: string;
    paymentId?: string;
  };

  const ledger: LedgerEntry[] = [];
  let runningBalance = credit.amount;

  // Step 1: Sale legs (non-credit portions paid at sale time)
  if (credit.saleLegs && credit.saleLegs.length > 0) {
    for (const leg of credit.saleLegs) {
      runningBalance -= leg.amount;
      ledger.push({
        key: `leg-${leg.method}-${leg.date}`,
        label: `At sale — ${leg.method}`,
        method: leg.method,
        amount: leg.amount,
        balance: runningBalance,
        isCredit: false,
        isInitial: true,
        date: leg.date,
      });
    }
  } else if (credit.downPayment > 0) {
    // Fallback: single down payment (old flow / no legs info)
    runningBalance -= credit.downPayment;
    ledger.push({
      key: "dp",
      label: "Down payment at sale",
      method: undefined,
      amount: credit.downPayment,
      balance: runningBalance,
      isCredit: false,
      isInitial: true,
      date: credit.date,
    });
  }

  // Step 2: Credit installments (sorted by paidAt asc)
  const sortedPayments = [...localPayments].sort((a, b) => a.paidAt.localeCompare(b.paidAt));
  for (const p of sortedPayments) {
    runningBalance -= p.amount;
    ledger.push({
      key: p.id,
      label: p.note ? `Payment — ${p.note}` : "Credit payment",
      method: p.method,
      amount: p.amount,
      balance: Math.max(0, runningBalance),
      isCredit: false,
      isInitial: false,
      date: p.paidAt,
      paymentId: p.id,
    });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
      <div className="w-full max-w-[460px] md:max-w-[540px] h-full bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* HEADER */}
        <div className="flex items-center gap-4 border-b px-6 py-4 bg-white shrink-0">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><ArrowLeft size={22} /></button>
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
              <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-600">Customer</h3>
              <button onClick={() => setEditingCustomer(!editingCustomer)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                {editingCustomer ? "Cancel" : "Edit"}
              </button>
            </div>
            {editingCustomer ? (
              <div className="space-y-2">
                <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-400 outline-none" />
                <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                  placeholder="Phone number" type="tel"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:border-blue-400 outline-none" />
                <button onClick={handleSaveCustomer} disabled={savingCustomer}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 text-sm font-semibold rounded-lg flex items-center justify-center gap-2">
                  {savingCustomer ? <Loader2 size={14} className="animate-spin" /> : "Save Customer Info"}
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <User size={14} className="text-blue-400 shrink-0" />
                  {customerName || credit.customerName
                    ? <span className="font-medium">{customerName || credit.customerName}</span>
                    : <span className="text-gray-400 italic">No name set — click Edit</span>}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Phone size={14} className="text-blue-400 shrink-0" />
                  {customerPhone || credit.customerPhone
                    ? <span>{customerPhone || credit.customerPhone}</span>
                    : <span className="text-gray-400 italic">No phone set</span>}
                </div>
              </div>
            )}
          </div>

          {/* LIVE CREDIT SUMMARY */}
          <div className="p-5 border-b bg-orange-50 space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-sm text-gray-600">Total Credit</span>
              <span className="text-2xl font-black text-gray-900">{fmt(credit.amount)}</span>
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span className="text-green-700 font-semibold">✓ Paid: {fmt(localTotalPaid)}</span>
                <span className={`font-semibold ${localDue > 0 ? "text-red-600" : "text-green-600"}`}>
                  {localDue > 0 ? `Due: ${fmt(localDue)}` : "Fully Paid ✓"}
                </span>
              </div>
              <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out flex items-center justify-end pr-2 ${
                    pct >= 100 ? "bg-green-500" : pct > 50 ? "bg-blue-400" : pct > 0 ? "bg-orange-400" : "bg-gray-300"
                  }`}
                  style={{ width: `${pct}%` }}
                >
                  {pct >= 15 && <span className="text-white text-[0.6rem] font-bold">{pct}%</span>}
                </div>
              </div>
              {pct < 15 && <div className="text-right text-xs text-gray-400 mt-0.5">{pct}% paid</div>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: "Total",     v: fmt(credit.amount),    c: "text-gray-800" },
                { l: "Collected", v: fmt(localTotalPaid),   c: "text-green-700" },
                { l: "Remaining", v: fmt(localDue),         c: localDue > 0 ? "text-red-600" : "text-green-600" },
              ].map(x => (
                <div key={x.l} className="rounded-xl bg-white border p-2.5 text-center">
                  <p className="text-[0.6rem] text-gray-400 uppercase tracking-wide mb-0.5">{x.l}</p>
                  <p className={`text-xs font-black ${x.c}`}>{x.v}</p>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                isPaid ? "bg-green-100 text-green-700" : pct > 0 ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"
              }`}>
                {isPaid ? "paid" : pct > 0 ? "partial" : "pending"}
              </span>
              {credit.dueDate && <span className="text-xs text-gray-500">Due: {credit.dueDate}</span>}
            </div>
          </div>

          {/* PAYMENT LEDGER — running balance timeline */}
          <div className="p-5 border-b space-y-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-2">
                <TrendingDown size={13} className="text-gray-400" /> Payment Ledger
              </h3>
              <span className="text-[0.65rem] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {fmt(credit.amount)} total
              </span>
            </div>

            {/* Opening balance row */}
            <div className="flex items-start gap-3 py-2.5 px-4 rounded-xl bg-gray-900 text-white">
              <div className="mt-1 w-2.5 h-2.5 rounded-full bg-gray-400 shrink-0" />
              <div className="flex-1 flex items-center justify-between">
                <span className="text-[0.75rem] font-semibold">Credit opened · {credit.date}</span>
                <span className="text-[0.82rem] font-black tabular-nums">{fmt(credit.amount)}</span>
              </div>
            </div>

            {/* Ledger rows */}
            <div className="space-y-2">
              {ledger.map((entry) => (
                <div key={entry.key} className="relative">
                  <LedgerRow
                    label={entry.label}
                    method={entry.method}
                    amount={entry.amount}
                    balance={entry.balance}
                    isCredit={entry.isCredit}
                    isInitial={entry.isInitial}
                    date={entry.date}
                  />
                  {/* Delete button for installments only */}
                  {entry.paymentId && !entry.isInitial && (
                    <button
                      onClick={() => handleDeletePayment(entry.paymentId!)}
                      className="absolute top-2 right-2 p-1 hover:bg-red-50 rounded-full text-red-400 hover:text-red-600"
                      title="Remove payment"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {ledger.length === 0 && (
              <div className="py-6 text-center text-gray-400 text-xs">No payments recorded yet</div>
            )}

            {/* Closing balance */}
            {ledger.length > 0 && (
              <div className={`flex items-center justify-between py-2.5 px-4 rounded-xl font-bold text-sm mt-2 ${
                isPaid ? "bg-green-600 text-white" : "bg-red-50 border border-red-200 text-red-700"
              }`}>
                <span>{isPaid ? "✓ Fully Paid" : "Balance Remaining"}</span>
                <span className="tabular-nums">{fmt(localDue)}</span>
              </div>
            )}
          </div>

          {/* ADD PAYMENT FORM */}
          {!isPaid ? (
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Record New Payment</h3>
                {paymentLines.length < 3 && (
                  <button type="button" onClick={addLine}
                    className="flex items-center gap-1 text-xs text-orange-600 font-semibold hover:text-orange-800">
                    <PlusCircle size={13} /> Split payment
                  </button>
                )}
              </div>

              {error && (
                <div className="mb-3 bg-red-100 border border-red-300 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
              )}

              <div className="space-y-3">
                {paymentLines.map((line) => (
                  <div key={line.id} className="flex gap-2 items-center">
                    <select value={line.method} onChange={e => updateLine(line.id, "method", e.target.value)}
                      className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm">
                      <option value="">Method...</option>
                      {METHODS.map(m => <option key={m.value} value={m.value}>{m.emoji} {m.label}</option>)}
                    </select>
                    <div className="relative">
                      <input type="number" min={0.01} step={1}
                        value={line.amount || ""}
                        onChange={e => updateLine(line.id, "amount", Number(e.target.value))}
                        onFocus={() => { if (!line.amount) autoFillLine(line.id); }}
                        placeholder={`Max ${localDue.toLocaleString()}`}
                        className="w-32 border border-gray-300 rounded-xl px-3 py-2.5 text-sm text-right pr-7" />
                      <button type="button" onClick={() => autoFillLine(line.id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs" title="Fill remaining">↺</button>
                    </div>
                    {paymentLines.length > 1 && (
                      <button type="button" onClick={() => removeLine(line.id)}
                        className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 text-red-400 flex items-center justify-center shrink-0">
                        <X size={13} />
                      </button>
                    )}
                  </div>
                ))}

                {paymentLines.length > 1 && (
                  <div className={`flex justify-between items-center text-xs px-3 py-2 rounded-lg font-semibold ${
                    Math.abs(lineBalance) < 0.01 ? "bg-green-50 text-green-700 border border-green-200" :
                    lineBalance > 0 ? "bg-amber-50 text-amber-700 border border-amber-200" :
                    "bg-red-50 text-red-700 border border-red-200"
                  }`}>
                    <span>Total entered: {fmt(totalLinesAmount)}</span>
                    <span>{Math.abs(lineBalance) < 0.01 ? "✓ Balanced" : lineBalance > 0 ? `${fmt(lineBalance)} remaining` : `Over by ${fmt(Math.abs(lineBalance))}`}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date Received</label>
                    <input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Update Due Date</label>
                    <input type="date" value={newDueDate} onChange={e => setNewDueDate(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-3 py-2 text-xs" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Reference / Note (optional)</label>
                  <input type="text" value={note} onChange={e => setNote(e.target.value)}
                    placeholder="e.g. Mpesa ref: ABC123"
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" />
                </div>

                {/* Live preview of new balance */}
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-xs space-y-1">
                  <div className="flex justify-between text-orange-700 font-semibold">
                    <span>After this payment:</span>
                    <span>{fmt(Math.max(0, localDue - totalLinesAmount))} remaining</span>
                  </div>
                  <div className="w-full h-2 bg-orange-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.round(((localTotalPaid + totalLinesAmount) / credit.amount) * 100))}%` }} />
                  </div>
                </div>

                <button onClick={handleSubmit} disabled={submitting}
                  className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white py-3 font-bold rounded-xl flex items-center justify-center gap-2">
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : (
                    <><CreditCard size={16} /> Record Payment · {fmt(totalLinesAmount)}</>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-green-600">
              <div className="text-5xl mb-3">✅</div>
              <div className="font-black text-xl">Fully Paid!</div>
              <div className="text-sm text-gray-400 mt-1">{fmt(credit.amount)} collected</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}