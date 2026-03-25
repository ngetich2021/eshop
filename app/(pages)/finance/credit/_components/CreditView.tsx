// app/credit/_components/CreditView.tsx
"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Loader2, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteCreditAction } from "./actions";
import CreditFormSideSheet from "./CreditFormSideSheet";

type Credit = {
  id: string;
  amount: number;
  downPayment: number;
  due: number;
  dueDate: string | null;
  status: string;
  shop: string;
  shopId: string;
  date: string;
};

type StatBlock = { count: number; added: number; paid: number; due: number };
type ShopOption = { id: string; name: string };

type Props = {
  stats: { today: StatBlock; week: StatBlock; month: StatBlock; year: StatBlock; total: StatBlock };
  credits: Credit[];
  shops: ShopOption[];
};

export default function CreditView({ stats, credits, shops }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "view">("add");
  const [selected, setSelected] = useState<Credit | undefined>();
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
    setDropdownTop(top); setDropdownLeft(left); setOpenDropdownId(id);
  };

  const openModal = (m: "add" | "edit" | "view", c?: Credit) => {
    setMode(m); setSelected(c); setShowForm(true); setOpenDropdownId(null);
  };
  const closeModal = () => { setShowForm(false); setSelected(undefined); };
  const handleSuccess = () => { closeModal(); router.refresh(); };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this credit?")) return;
    setDeletingId(id);
    const res = await deleteCreditAction(id);
    setDeletingId(null);
    if (res.success) router.refresh();
    else alert(res.error || "Delete failed");
    setOpenDropdownId(null);
  };

  const filtered = credits.filter((c) =>
    `${c.status} ${c.shop}`.toLowerCase().includes(search.toLowerCase())
  );

  const periods = [
    { label: "Today", s: stats.today },
    { label: "Week", s: stats.week },
    { label: "Month", s: stats.month },
    { label: "Year", s: stats.year },
    { label: "Total", s: stats.total },
  ];

  return (
    <div className="min-h-screen bg-gray-50/80 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-screen-2xl space-y-6">
        {/* STATS — added/paid/due per period */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {periods.map(({ label, s }) => (
            <div key={label} className="rounded-lg border bg-white p-3 shadow-sm">
              <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">{label}</div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>Added</span><span className="font-semibold text-gray-800">{s.count} · KSh {s.added.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>Paid</span><span className="font-semibold text-green-700">KSh {s.paid.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>Due</span><span className="font-semibold text-red-600">KSh {s.due.toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search credits..." className="w-full rounded-lg border border-gray-300 pl-10 py-2.5 text-sm focus:border-blue-500" />
          </div>
          <button onClick={() => openModal("add")} className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700">
            <Plus size={16} /> Add Credit
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-white shadow">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["S/NO","cost","paid","due","date","due date","status","shop","actions"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left font-semibold text-gray-700 last:text-center">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c, i) => (
                <tr key={c.id} onClick={() => openModal("view", c)} className="cursor-pointer hover:bg-gray-50 transition-all">
                  <td className="px-5 py-4">{i + 1}</td>
                  <td className="px-5 py-4 font-medium">KSh {c.amount.toLocaleString()}</td>
                  <td className="px-5 py-4 text-green-700 font-medium">KSh {c.downPayment.toLocaleString()}</td>
                  <td className="px-5 py-4 text-red-600 font-medium">KSh {c.due.toLocaleString()}</td>
                  <td className="px-5 py-4">{c.date}</td>
                  <td className="px-5 py-4">{c.dueDate ?? "—"}</td>
                  <td className="px-5 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${c.status === "paid" ? "bg-green-100 text-green-700" : c.status === "partial" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-5 py-4">{c.shop}</td>
                  <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => toggleDropdown(c.id, e)} className="p-2 hover:bg-gray-100 rounded-full"><MoreVertical size={20} /></button>
                    {openDropdownId === c.id && (
                      <div className="fixed z-[10000] w-40 bg-white border rounded-xl shadow-xl py-1" style={{ top: `${dropdownTop}px`, left: `${dropdownLeft}px` }}>
                        <button onClick={() => { setOpenDropdownId(null); openModal("view", c); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">👁️ View</button>
                        <button onClick={() => { setOpenDropdownId(null); openModal("edit", c); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">✏️ Edit</button>
                        <button onClick={() => handleDelete(c.id)} disabled={deletingId === c.id} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                          {deletingId === c.id ? <Loader2 size={16} className="animate-spin" /> : "🗑️"} Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={9} className="py-20 text-center text-gray-500">No credits found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <CreditFormSideSheet
          key={mode + (selected?.id || "new")}
          mode={mode}
          creditToEdit={selected ?? null}
          shops={shops}
          onSuccess={handleSuccess}
          onClose={closeModal}
        />
      )}
    </div>
  );
}