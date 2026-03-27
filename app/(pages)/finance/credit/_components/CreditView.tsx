// app/credit/_components/CreditView.tsx
"use client";

import { useEffect, useState } from "react";
import { Search, Loader2, MoreVertical, CreditCard, Store, MapPin, User, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteCreditAction } from "./actions";
import CreditPaymentSheet from "./CreditFormSideSheet";

type Payment = {
  id: string;
  amount: number;
  method: string;
  note: string | null;
  dueDate: string | null;
  paidAt: string;
};

type Credit = {
  id: string;
  amount: number;
  downPayment: number;
  totalPaid: number;
  due: number;
  dueDate: string | null;
  status: string;
  shop: string;
  shopId: string;
  customerName: string | null;
  customerPhone: string | null;
  date: string;
  payments: Payment[];
};

type StatBlock = { count: number; added: number; paid: number; due: number };

type Props = {
  activeShop: { id: string; name: string; location: string };
  isAdmin: boolean;
  stats: {
    today: StatBlock;
    week: StatBlock;
    month: StatBlock;
    year: StatBlock;
    total: StatBlock;
  };
  credits: Credit[];
};

export default function CreditView({ activeShop, isAdmin, stats, credits }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "partial" | "paid">("all");
  const [hidePaid, setHidePaid] = useState(true);
  const [paymentCredit, setPaymentCredit] = useState<Credit | null>(null);
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
    const gap = 8, dw = 180, dh = 100;
    let top = rect.bottom + gap, left = rect.right - dw;
    if (top + dh > window.innerHeight) top = rect.top - dh - gap;
    if (left < gap) left = gap;
    if (left + dw > window.innerWidth - gap) left = window.innerWidth - dw - gap;
    setDropdownTop(top); setDropdownLeft(left); setOpenDropdownId(id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this credit record? All payments will be removed too.")) return;
    setDeletingId(id);
    const res = await deleteCreditAction(id);
    setDeletingId(null);
    if (res.success) router.refresh();
    else alert(res.error || "Delete failed");
    setOpenDropdownId(null);
  };

  const filtered = credits.filter((c) => {
    // Hide paid credits if toggle is on (and statusFilter is not explicitly "paid")
    if (hidePaid && statusFilter !== "paid" && c.status === "paid") return false;

    const matchSearch = `${c.status} ${c.shop} ${c.customerName ?? ""} ${c.customerPhone ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const periods = [
    { label: "Today", s: stats.today },
    { label: "Week", s: stats.week },
    { label: "Month", s: stats.month },
    { label: "Year", s: stats.year },
    { label: "Total", s: stats.total },
  ];

  const paidCount = credits.filter((c) => c.status === "paid").length;

  return (
    <div className="min-h-screen bg-gray-50/80 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-screen-2xl space-y-6">

        {/* ACTIVE SHOP BANNER */}
        <div className="flex items-center gap-4 rounded-xl border border-orange-100 bg-gradient-to-r from-orange-50 to-amber-50 px-5 py-3.5 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500 shadow">
            <Store size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-orange-400">Active Shop</p>
            <p className="font-bold text-orange-900 truncate">{activeShop.name}</p>
          </div>
          {activeShop.location && (
            <div className="flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs text-gray-500 shadow-sm shrink-0">
              <MapPin size={11} /> {activeShop.location}
            </div>
          )}
          <div className="text-xs bg-orange-100 text-orange-700 rounded-full px-3 py-1 font-medium border border-orange-200 shrink-0">
            ℹ️ Credits are auto-created from sales
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {periods.map(({ label, s }) => (
            <div key={label} className="rounded-lg border bg-white p-3 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
                {label}
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>Credits</span>
                <span className="font-semibold text-gray-800">
                  {s.count} · KSh {s.added.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>Collected</span>
                <span className="font-semibold text-green-700">KSh {s.paid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>Outstanding</span>
                <span className="font-semibold text-red-600">KSh {s.due.toLocaleString()}</span>
              </div>
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
              placeholder="Search by name, phone, status..."
              className="w-full rounded-lg border border-gray-300 pl-10 py-2.5 text-sm focus:border-orange-400 outline-none"
            />
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            {/* Status filter pills */}
            {(["all", "pending", "partial", "paid"] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s);
                  if (s === "paid") setHidePaid(false);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border capitalize transition-all ${
                  statusFilter === s
                    ? "bg-orange-500 text-white border-orange-500"
                    : "bg-white text-gray-600 border-gray-300 hover:border-orange-300"
                }`}
              >
                {s}
              </button>
            ))}

            {/* Hide paid toggle */}
            {paidCount > 0 && statusFilter !== "paid" && (
              <button
                onClick={() => setHidePaid(!hidePaid)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  hidePaid
                    ? "bg-green-600 text-white border-green-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-green-400"
                }`}
              >
                {hidePaid ? `✓ Hiding ${paidCount} paid` : `Show all (${paidCount} paid)`}
              </button>
            )}
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto rounded-xl border bg-white shadow">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-gray-50">
              <tr>
                {[
                  "S/NO",
                  "Customer",
                  "Total Credit",
                  "Collected",
                  "Remaining",
                  "Progress",
                  "Date",
                  "Due Date",
                  "Status",
                  "Shop",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3.5 text-left font-semibold text-gray-700 last:text-center"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c, i) => {
                const pct = Math.min(100, Math.round((c.totalPaid / c.amount) * 100));
                return (
                  <tr
                    key={c.id}
                    className="hover:bg-orange-50/40 transition-all cursor-pointer"
                    onClick={() => setPaymentCredit(c)}
                  >
                    <td className="px-4 py-4">{i + 1}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-0.5">
                        {c.customerName ? (
                          <span className="flex items-center gap-1 font-medium text-gray-800">
                            <User size={12} className="text-gray-400" /> {c.customerName}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs italic">No name</span>
                        )}
                        {c.customerPhone && (
                          <span className="flex items-center gap-1 text-xs text-gray-500">
                            <Phone size={11} className="text-gray-400" /> {c.customerPhone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 font-semibold">
                      KSh {c.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-green-700 font-medium">
                      KSh {c.totalPaid.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 text-red-600 font-medium">
                      KSh {c.due.toLocaleString()}
                    </td>
                    <td className="px-4 py-4 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              pct >= 100
                                ? "bg-green-500"
                                : pct > 0
                                ? "bg-orange-400"
                                : "bg-gray-300"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 shrink-0">{pct}%</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {c.totalPaid.toLocaleString()} / {c.amount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-4">{c.date}</td>
                    <td className="px-4 py-4">{c.dueDate ?? "—"}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          c.status === "paid"
                            ? "bg-green-100 text-green-700"
                            : c.status === "partial"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">{c.shop}</td>
                    <td
                      className="px-4 py-4 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-center gap-1">
                        {c.status !== "paid" && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPaymentCredit(c);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-semibold border border-orange-200 transition-all"
                          >
                            <CreditCard size={12} /> Pay
                          </button>
                        )}
                        <button
                          onClick={(e) => toggleDropdown(c.id, e)}
                          className="p-2 hover:bg-gray-100 rounded-full"
                        >
                          <MoreVertical size={18} />
                        </button>
                      </div>
                      {openDropdownId === c.id && (
                        <div
                          className="fixed z-[10000] w-44 bg-white border rounded-xl shadow-xl py-1"
                          style={{ top: `${dropdownTop}px`, left: `${dropdownLeft}px` }}
                        >
                          <button
                            onClick={() => {
                              setOpenDropdownId(null);
                              setPaymentCredit(c);
                            }}
                            className="flex w-full text-left px-4 py-2 text-sm hover:bg-gray-100 items-center gap-2"
                          >
                            <CreditCard size={14} /> View / Pay
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(c.id)}
                              disabled={deletingId === c.id}
                              className="flex w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 items-center gap-2"
                            >
                              {deletingId === c.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                "🗑️"
                              )}{" "}
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-20 text-center text-gray-500">
                    {hidePaid && paidCount > 0
                      ? `No unpaid credits found. ${paidCount} paid credit(s) are hidden — click "Show all" to view them.`
                      : "No credit records found. Credits are created automatically when a sale is made on credit."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAYMENT SIDE SHEET */}
      {paymentCredit && (
        <CreditPaymentSheet
          credit={paymentCredit}
          onSuccess={() => {
            setPaymentCredit(null);
            router.refresh();
          }}
          onClose={() => setPaymentCredit(null)}
        />
      )}
    </div>
  );
}