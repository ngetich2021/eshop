// app/wallet/margins/_components/MarginView.tsx
"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Loader2, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteMarginAction } from "./actions";
import MarginFormSideSheet from "./MarginFormSideSheet";


type Margin = { id: string; date: string; value: number; profitType: string | null; shop: string; shopId: string };
type ShopOption = { id: string; name: string };

type Props = {
  stats: { totalMargins: number; totalValue: number };
  margins: Margin[];
  shops: ShopOption[];
};

export default function MarginView({ stats, margins, shops }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "view">("add");
  const [selected, setSelected] = useState<Margin | undefined>();
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

  const openModal = (m: "add" | "edit" | "view", mg?: Margin) => {
    setMode(m); setSelected(mg); setShowForm(true); setOpenDropdownId(null);
  };
  const closeModal = () => { setShowForm(false); setSelected(undefined); };
  const handleSuccess = () => { closeModal(); router.refresh(); };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this margin record?")) return;
    setDeletingId(id);
    const res = await deleteMarginAction(id);
    setDeletingId(null);
    if (res.success) router.refresh();
    else alert(res.error || "Delete failed");
    setOpenDropdownId(null);
  };

  const filtered = margins.filter((m) =>
    `${m.profitType} ${m.shop}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50/80 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-screen-2xl space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Total Transfer" value={`KSh ${stats.totalValue.toLocaleString()}`} />
          <Stat label="Total Records" value={stats.totalMargins} />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search margins..." className="w-full rounded-lg border border-gray-300 pl-10 py-2.5 text-sm focus:border-blue-500" />
          </div>
          <button onClick={() => openModal("add")} className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700">
            <Plus size={16} /> Add Margin
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-white shadow">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["S/NO","date","value","profit type","shop","actions"].map((h) => (
                  <th key={h} className="px-6 py-3.5 text-left font-semibold text-gray-700 last:text-center">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((m, i) => (
                <tr key={m.id} onClick={() => openModal("view", m)} className="cursor-pointer hover:bg-gray-50 transition-all">
                  <td className="px-6 py-4">{i + 1}</td>
                  <td className="px-6 py-4">{m.date}</td>
                  <td className="px-6 py-4 font-medium">KSh {m.value.toLocaleString()}</td>
                  <td className="px-6 py-4">{m.profitType ?? "—"}</td>
                  <td className="px-6 py-4">{m.shop}</td>
                  <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => toggleDropdown(m.id, e)} className="p-2 hover:bg-gray-100 rounded-full"><MoreVertical size={20} /></button>
                    {openDropdownId === m.id && (
                      <div className="fixed z-[10000] w-40 bg-white border rounded-xl shadow-xl py-1" style={{ top: `${dropdownTop}px`, left: `${dropdownLeft}px` }}>
                        <button onClick={() => { setOpenDropdownId(null); openModal("view", m); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">👁️ View</button>
                        <button onClick={() => { setOpenDropdownId(null); openModal("edit", m); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">✏️ Edit</button>
                        <button onClick={() => handleDelete(m.id)} disabled={deletingId === m.id} className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                          {deletingId === m.id ? <Loader2 size={16} className="animate-spin" /> : "🗑️"} Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="py-20 text-center text-gray-500">No margin records found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <MarginFormSideSheet
          key={mode + (selected?.id || "new")}
          mode={mode}
          marginToEdit={selected ?? null}
          shops={shops}
          onSuccess={handleSuccess}
          onClose={closeModal}
        />
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-white p-4 text-center shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="mt-1.5 text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}