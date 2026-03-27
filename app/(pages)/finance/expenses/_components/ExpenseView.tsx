// app/expense/_components/ExpenseView.tsx
"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Loader2, MoreVertical, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteExpenseAction } from "./actions";
import ExpenseFormSideSheet from "./ExpenseFormSideSheet";

type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  paidById: string;
  paidByName: string;
  shop: string;
  shopId: string;
  date: string;
};

type ActiveShop = { id: string; name: string; location: string };
type StatPair = { count: number; amount: number };

type Props = {
  activeShop: ActiveShop;
  isStaff: boolean;
  isAdmin: boolean;
  walletBalance: number;
  currentUserName: string;
  stats: {
    today: StatPair;
    week: StatPair;
    month: StatPair;
    year: StatPair;
    total: StatPair;
  };
  expenses: Expense[];
};

export default function ExpenseView({
  activeShop,
  walletBalance,
  currentUserName,
  stats,
  expenses,
}: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "view">("add");
  const [selected, setSelected] = useState<Expense | undefined>();
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
    const gap = 8, dw = 160, dh = 120;
    let top = rect.bottom + gap, left = rect.right - dw;
    if (top + dh > window.innerHeight) top = rect.top - dh - gap;
    if (left < gap) left = gap;
    if (left + dw > window.innerWidth - gap) left = window.innerWidth - dw - gap;
    setDropdownTop(top);
    setDropdownLeft(left);
    setOpenDropdownId(id);
  };

  const openModal = (m: "add" | "edit" | "view", e?: Expense) => {
    setMode(m);
    setSelected(e);
    setShowForm(true);
    setOpenDropdownId(null);
  };
  const closeModal = () => { setShowForm(false); setSelected(undefined); };
  const handleSuccess = () => { closeModal(); router.refresh(); };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    setDeletingId(id);
    const res = await deleteExpenseAction(id);
    setDeletingId(null);
    if (res.success) router.refresh();
    else alert(res.error || "Delete failed");
    setOpenDropdownId(null);
  };

  const filtered = expenses.filter((e) =>
    `${e.description} ${e.category ?? ""} ${e.shop} ${e.paidByName}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50/80 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-screen-2xl space-y-6">
        {/* WALLET BALANCE BANNER */}
        <div className="flex items-center gap-4 rounded-xl border border-emerald-100 bg-gradient-to-r from-emerald-50 to-white px-5 py-3.5 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 shadow">
            <Wallet size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-500">
              Wallet Balance — {activeShop.name}
            </p>
            <p className="font-bold text-emerald-900 text-lg">
              KSh {walletBalance.toLocaleString()}
            </p>
          </div>
          {walletBalance <= 0 && (
            <span className="ml-auto rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 border border-red-200">
              No funds available
            </span>
          )}
        </div>

        {/* STATS GRID */}
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
              <div className="text-xs text-green-700 font-semibold">KSh {s.amount.toLocaleString()}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search expenses..."
              className="w-full rounded-lg border border-gray-300 pl-10 py-2.5 text-sm focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => openModal("add")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700"
          >
            <Plus size={16} /> Add Expense
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-white shadow">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["S/NO", "Amount", "Description", "Category", "Spent By", "Date", "Shop", "Actions"].map((h) => (
                  <th key={h} className="px-6 py-3.5 text-left font-semibold text-gray-700 last:text-center">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((e, i) => (
                <tr
                  key={e.id}
                  onClick={() => openModal("view", e)}
                  className="cursor-pointer hover:bg-gray-50 transition-all"
                >
                  <td className="px-6 py-4">{i + 1}</td>
                  <td className="px-6 py-4 font-medium">KSh {e.amount.toLocaleString()}</td>
                  <td className="px-6 py-4">{e.description}</td>
                  <td className="px-6 py-4">
                    {e.category ? (
                      <span className="px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                        {e.category}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-6 py-4">{e.paidByName}</td>
                  <td className="px-6 py-4">{e.date}</td>
                  <td className="px-6 py-4">{e.shop}</td>
                  <td className="px-6 py-4 text-center" onClick={(ev) => ev.stopPropagation()}>
                    <button
                      onClick={(ev) => toggleDropdown(e.id, ev)}
                      className="p-2 hover:bg-gray-100 rounded-full"
                    >
                      <MoreVertical size={20} />
                    </button>
                    {openDropdownId === e.id && (
                      <div
                        className="fixed z-[10000] w-40 bg-white border rounded-xl shadow-xl py-1"
                        style={{ top: `${dropdownTop}px`, left: `${dropdownLeft}px` }}
                      >
                        <button
                          onClick={() => { setOpenDropdownId(null); openModal("view", e); }}
                          className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        >
                          👁️ View
                        </button>
                        <button
                          onClick={() => { setOpenDropdownId(null); openModal("edit", e); }}
                          className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(e.id)}
                          disabled={deletingId === e.id}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          {deletingId === e.id ? <Loader2 size={16} className="animate-spin" /> : "🗑️"} Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-20 text-center text-gray-500">No expenses found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <ExpenseFormSideSheet
          key={mode + (selected?.id || "new")}
          mode={mode}
          expenseToEdit={selected ?? null}
          shopId={activeShop.id}
          walletBalance={walletBalance}
          currentUserName={currentUserName}
          onSuccess={handleSuccess}
          onClose={closeModal}
        />
      )}
    </div>
  );
}