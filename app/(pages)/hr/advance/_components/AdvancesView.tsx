"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Loader2, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import AdvanceFormSideSheet from "./AdvanceFormSideSheet";
import { deleteAdvanceAction } from "./actions";

type Advance = {
  id: string;
  staffName: string;
  staffId: string;
  amount: number;
  date: string;
  status: string;
  shop: string;
  shopId: string;
  reason: string | null;
  transactionCode: string | null;
};

type StaffOption = { id: string; fullName: string };
type ShopOption = { id: string; name: string };

type Props = {
  stats: { totalAdvances: number; totalAmount: number };
  advances: Advance[];
  staffList: StaffOption[];
  shops: ShopOption[];
};

export default function AdvancesView({ stats, advances, staffList, shops }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "view">("add");
  const [selected, setSelected] = useState<Advance | undefined>();
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
    if (openDropdownId === id) {
      setOpenDropdownId(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const gap = 8;
    const dropdownWidth = 160;
    const dropdownHeight = 120;
    let top = rect.bottom + gap;
    let left = rect.right - dropdownWidth;
    if (top + dropdownHeight > window.innerHeight) top = rect.top - dropdownHeight - gap;
    if (left < gap) left = gap;
    if (left + dropdownWidth > window.innerWidth - gap) left = window.innerWidth - dropdownWidth - gap;
    setDropdownTop(top);
    setDropdownLeft(left);
    setOpenDropdownId(id);
  };

  const openModal = (m: "add" | "edit" | "view", adv?: Advance) => {
    setMode(m);
    setSelected(adv);
    setShowForm(true);
    setOpenDropdownId(null);
  };

  const closeModal = () => {
    setShowForm(false);
    setSelected(undefined);
  };

  const handleSuccess = () => {
    closeModal();
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this advance?")) return;
    setDeletingId(id);
    const res = await deleteAdvanceAction(id);
    setDeletingId(null);
    if (res.success) router.refresh();
    else alert(res.error || "Delete failed");
    setOpenDropdownId(null);
  };

  const filtered = advances.filter((a) =>
    `${a.staffName} ${a.status} ${a.shop}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50/80 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-screen-2xl space-y-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Total Advances" value={stats.totalAdvances} />
          <Stat label="Total Amount" value={stats.totalAmount.toLocaleString()} />
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search advances..."
              className="w-full rounded-lg border border-gray-300 pl-10 py-2.5 text-sm focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => openModal("add")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700"
          >
            <Plus size={16} /> Add Advance
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border bg-white shadow">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3.5 text-left font-semibold text-gray-700">S/NO</th>
                <th className="px-6 py-3.5 text-left font-semibold text-gray-700">staff name</th>
                <th className="px-6 py-3.5 text-right font-semibold text-gray-700">amount</th>
                <th className="px-6 py-3.5 text-left font-semibold text-gray-700">date</th>
                <th className="px-6 py-3.5 text-left font-semibold text-gray-700">status</th>
                <th className="px-6 py-3.5 text-left font-semibold text-gray-700">shop</th>
                <th className="px-6 py-3.5 text-center font-semibold text-gray-700">actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((a, i) => (
                <tr
                  key={a.id}
                  onClick={() => openModal("view", a)}
                  className="group cursor-pointer hover:bg-gray-50 transition-all"
                >
                  <td className="px-6 py-4">{i + 1}</td>
                  <td className="px-6 py-4 font-semibold">{a.staffName}</td>
                  <td className="px-6 py-4 text-right font-medium">KSh {a.amount.toLocaleString()}</td>
                  <td className="px-6 py-4">{a.date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs ${
                      a.status === "disbursed" ? "bg-green-100 text-green-700" :
                      a.status === "rejected" ? "bg-red-100 text-red-700" :
                      "bg-yellow-100 text-yellow-700"
                    }`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">{a.shop}</td>
                  <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => toggleDropdown(a.id, e)}
                      className="p-2 hover:bg-gray-100 rounded-full"
                    >
                      <MoreVertical size={20} />
                    </button>

                    {openDropdownId === a.id && (
                      <div
                        className="fixed z-[10000] w-40 bg-white border rounded-xl shadow-xl py-1"
                        style={{ top: `${dropdownTop}px`, left: `${dropdownLeft}px` }}
                      >
                        <button
                          onClick={() => { setOpenDropdownId(null); openModal("view", a); }}
                          className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        >
                          👁️ View
                        </button>
                        <button
                          onClick={() => { setOpenDropdownId(null); openModal("edit", a); }}
                          className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(a.id)}
                          disabled={deletingId === a.id}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          {deletingId === a.id ? <Loader2 size={16} className="animate-spin" /> : "🗑️"} Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-gray-500">
                    No matching advances
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <AdvanceFormSideSheet
          key={mode + (selected?.id || "new")}
          mode={mode}
          advanceToEdit={selected ?? null}
          staffList={staffList}
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