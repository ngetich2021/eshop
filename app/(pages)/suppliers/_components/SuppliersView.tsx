"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Loader2, MoreVertical, Store } from "lucide-react";
import { useRouter } from "next/navigation";
import SupplierFormSideSheet from "./SupplierFormSideSheet";
import { deleteSupplierAction } from "./actions";

type Supplier = {
  id: string;
  name: string;
  contact1: string;
  contact2: string | null;
  goodsType: string | null;
  shop: string;
  shopId: string;
};

type Props = {
  stats: { totalSuppliers: number };
  suppliers: Supplier[];
  activeShop: { id: string; name: string };
};

export default function SuppliersView({ stats, suppliers, activeShop }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "view">("add");
  const [selected, setSelected] = useState<Supplier | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

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
    setCoords({ top: rect.bottom + 8, left: rect.right - 160 });
    setOpenDropdownId(id);
  };

  const openModal = (m: "add" | "edit" | "view", s?: Supplier) => {
    setMode(m); setSelected(s); setShowForm(true); setOpenDropdownId(null);
  };

  const handleSuccess = () => { setShowForm(false); setSelected(undefined); router.refresh(); };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this supplier?")) return;
    setDeletingId(id);
    const res = await deleteSupplierAction(id);
    setDeletingId(null);
    if (res.success) router.refresh();
    else alert(res.error || "Delete failed");
  };

  const filtered = suppliers.filter((s) =>
    `${s.name} ${s.goodsType}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50/80 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-screen-2xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
            <p className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
              <Store size={14} /> {activeShop.name}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white px-4 py-2 rounded-lg border text-sm font-medium">
              Total: <span className="text-green-600">{stats.totalSuppliers}</span>
            </div>
            <button
              onClick={() => openModal("add")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 shadow-sm transition-colors"
            >
              <Plus size={16} /> Add Supplier
            </button>
          </div>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or goods type..."
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-3 text-sm focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all outline-none"
          />
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-gray-600">S/NO</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-600">Supplier Name</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-600">Primary Goods</th>
                <th className="px-6 py-4 text-left font-semibold text-gray-600">Contact</th>
                <th className="px-6 py-4 text-center font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((s, i) => (
                <tr key={s.id} onClick={() => openModal("view", s)} className="group cursor-pointer hover:bg-green-50/30 transition-colors">
                  <td className="px-6 py-4 text-gray-500">{i + 1}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">{s.name}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                      {s.goodsType || "General"}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-700">{s.contact1}</td>
                  <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => toggleDropdown(s.id, e)} className="p-2 hover:bg-white rounded-full transition-colors border border-transparent hover:border-gray-200">
                      <MoreVertical size={18} className="text-gray-400" />
                    </button>
                    {openDropdownId === s.id && (
                      <div className="fixed z-[100] w-40 bg-white border border-gray-200 rounded-xl shadow-xl py-1" style={{ top: coords.top, left: coords.left }}>
                        <button onClick={() => openModal("view", s)} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50">👁️ View</button>
                        <button onClick={() => openModal("edit", s)} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm hover:bg-gray-50">✏️ Edit</button>
                        <hr className="my-1 border-gray-100" />
                        <button onClick={() => handleDelete(s.id)} disabled={deletingId === s.id} className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">
                          {deletingId === s.id ? <Loader2 size={14} className="animate-spin" /> : "🗑️"} Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <SupplierFormSideSheet
          key={mode + (selected?.id || "new")}
          mode={mode}
          supplierToEdit={selected ?? null}
          activeShopId={activeShop.id}
          activeShopName={activeShop.name}
          onSuccess={handleSuccess}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}