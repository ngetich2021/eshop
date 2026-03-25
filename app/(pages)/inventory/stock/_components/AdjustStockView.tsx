// app/inventory/adjustStock/_components/AdjustStockView.tsx
"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Loader2, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteAdjustmentAction } from "./actions";
import AdjustmentFormSideSheet from "./AdjustmentFormSideSheet";

type Adjustment = {
  id: string;
  productName: string;
  productId: string;
  adjustType: string;
  quantity: number;
  originalStock: number;
  newStockQty: number;
  value: number;
  adjustedBy: string;
  shop: string;
  shopId: string;
  date: string;
};

type ProductOption = { id: string; productName: string; quantity: number; sellingPrice: number };
type ShopOption = { id: string; name: string };

type Profile = {
  role: string;
  shopId: string | null;
  fullName: string;
};

type Props = {
  stats: { totalAdjustments: number; totalValue: number };
  adjustments: Adjustment[];
  products: ProductOption[];
  shops: ShopOption[];
  profile: Profile;
};

export default function AdjustStockView({ stats, adjustments, products, shops, profile }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownTop, setDropdownTop] = useState(0);
  const [dropdownLeft, setDropdownLeft] = useState(0);
  const [viewItem, setViewItem] = useState<Adjustment | undefined>();

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
    const gap = 8, dw = 160, dh = 100;
    let top = rect.bottom + gap, left = rect.right - dw;
    if (top + dh > window.innerHeight) top = rect.top - dh - gap;
    if (left < gap) left = gap;
    if (left + dw > window.innerWidth - gap) left = window.innerWidth - dw - gap;
    setDropdownTop(top); setDropdownLeft(left); setOpenDropdownId(id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this adjustment?")) return;
    setDeletingId(id);
    const res = await deleteAdjustmentAction(id);
    setDeletingId(null);
    if (res.success) router.refresh();
    else alert(res.error || "Delete failed");
    setOpenDropdownId(null);
  };

  const filtered = adjustments.filter((a) =>
    `${a.productName} ${a.adjustType} ${a.shop}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50/80 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-screen-2xl space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Total Adjustments" value={stats.totalAdjustments} />
          <Stat label="Total Value" value={`KSh ${stats.totalValue.toLocaleString()}`} />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search adjustments..." className="w-full rounded-lg border border-gray-300 pl-10 py-2.5 text-sm focus:border-blue-500" />
          </div>
          <button onClick={() => { setViewItem(undefined); setShowForm(true); }} className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700">
            <Plus size={16} /> Add Adjustment
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-white shadow">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["S/NO","product","type","qty old","qty new","value","date","shop","actions"].map((h) => (
                  <th key={h} className="px-6 py-3.5 text-left font-semibold text-gray-700 last:text-center">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((a, i) => (
                <tr key={a.id} onClick={() => { setViewItem(a); setShowForm(true); }} className="cursor-pointer hover:bg-gray-50 transition-all">
                  <td className="px-6 py-4">{i + 1}</td>
                  <td className="px-6 py-4 font-semibold">{a.productName}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${a.adjustType === "increase" ? "bg-green-100 text-green-700" : a.adjustType === "decrease" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                      {a.adjustType}
                    </span>
                  </td>
                  <td className="px-6 py-4">{a.originalStock}</td>
                  <td className="px-6 py-4">{a.newStockQty}</td>
                  <td className="px-6 py-4">KSh {a.value.toLocaleString()}</td>
                  <td className="px-6 py-4">{a.date}</td>
                  <td className="px-6 py-4">{a.shop}</td>
                  <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => toggleDropdown(a.id, e)} className="p-2 hover:bg-gray-100 rounded-full"><MoreVertical size={20} /></button>
                    {openDropdownId === a.id && (
                      <div className="fixed z-[10000] w-40 bg-white border rounded-xl shadow-xl py-1" style={{ top: `${dropdownTop}px`, left: `${dropdownLeft}px` }}>
                        <button onClick={() => { setOpenDropdownId(null); setViewItem(a); setShowForm(true); }} className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100">👁️ View</button>
                        <button onClick={() => handleDelete(a.id)} disabled={deletingId === a.id} className="flex w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 items-center gap-2">
                          {deletingId === a.id ? <Loader2 size={16} className="animate-spin" /> : "🗑️"} Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={9} className="py-20 text-center text-gray-500">No adjustments found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <AdjustmentFormSideSheet
          key={viewItem?.id || "new"}
          viewItem={viewItem ?? null}
          products={products}
          shops={shops}
          profile={profile}
          onSuccess={() => { setShowForm(false); setViewItem(undefined); router.refresh(); }}
          onClose={() => { setShowForm(false); setViewItem(undefined); }}
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