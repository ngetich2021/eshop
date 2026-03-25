"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Loader2, MoreVertical } from "lucide-react";
import { useRouter } from "next/navigation";
import StaffFormSideSheet from "./StaffFormSideSheet";
import { deleteStaffAction } from "./actions";

type Staff = {
  id: string;
  userId: string;
  fullName: string;
  tel1: string;
  tel2: string | null;
  mpesaNo: string | null;
  baseSalary: number;
  date: string;
  shop: string;
  shopId: string;
};

type UserOption = { id: string; fullName: string; email?: string };
type ShopOption = { id: string; name: string };

type Props = {
  stats: { totalStaff: number; totalSalary: number };
  staffList: Staff[];
  users: UserOption[];
  shops: ShopOption[];
};

export default function StaffsView({ stats, staffList, users, shops }: Props) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<"add" | "edit" | "view">("add");
  const [selected, setSelected] = useState<Staff | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── SMART DROPDOWN POSITIONING (exact from your Expense code — no overflow) ──
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

    if (top + dropdownHeight > window.innerHeight) {
      top = rect.top - dropdownHeight - gap;
    }
    if (left < gap) left = gap;
    if (left + dropdownWidth > window.innerWidth - gap) {
      left = window.innerWidth - dropdownWidth - gap;
    }

    setDropdownTop(top);
    setDropdownLeft(left);
    setOpenDropdownId(id);
  };

  const openModal = (m: "add" | "edit" | "view", staff?: Staff) => {
    setMode(m);
    setSelected(staff);
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
    if (!confirm("Delete this staff member?")) return;
    setDeletingId(id);
    const res = await deleteStaffAction(id);
    setDeletingId(null);
    if (res.success) router.refresh();
    else alert(res.error || "Delete failed");
    setOpenDropdownId(null);
  };

  const filtered = staffList.filter((s) =>
    `${s.fullName} ${s.tel1} ${s.shop}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50/80 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-screen-2xl space-y-6">
        {/* Stats — exact same as previous working version */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Total Staff" value={stats.totalStaff} />
          <Stat label="Total Salary Payable" value={stats.totalSalary.toLocaleString()} />
        </div>

        {/* Search + Add button */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search staff..."
              className="w-full rounded-lg border border-gray-300 pl-10 py-2.5 text-sm focus:border-blue-500"
            />
          </div>
          <button
            onClick={() => openModal("add")}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700"
          >
            <Plus size={16} /> Add Staff
          </button>
        </div>

        {/* TABLE — EXACT PDF DESIGN (same headers, same spacing, same minimal style as your original ProductsView) */}
        <div className="overflow-x-auto rounded-xl border bg-white shadow">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3.5 text-left font-semibold text-gray-700">S/NO</th>
                <th className="px-6 py-3.5 text-left font-semibold text-gray-700">full name</th>
                <th className="px-6 py-3.5 text-left font-semibold text-gray-700">tel1</th>
                <th className="px-6 py-3.5 text-left font-semibold text-gray-700">tel2</th>
                <th className="px-6 py-3.5 text-left font-semibold text-gray-700">date</th>
                <th className="px-6 py-3.5 text-left font-semibold text-gray-700">shop</th>
                <th className="px-6 py-3.5 text-center font-semibold text-gray-700">actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((s, i) => (
                <tr
                  key={s.id}
                  onClick={() => openModal("view", s)}
                  className="group cursor-pointer hover:bg-gray-50 transition-all"
                >
                  <td className="px-6 py-4">{i + 1}</td>
                  <td className="px-6 py-4 font-semibold">{s.fullName}</td>
                  <td className="px-6 py-4">{s.tel1}</td>
                  <td className="px-6 py-4">{s.tel2 || "—"}</td>
                  <td className="px-6 py-4">{s.date}</td>
                  <td className="px-6 py-4">{s.shop}</td>
                  <td
                    className="px-6 py-4 text-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => toggleDropdown(s.id, e)}
                      className="p-2 hover:bg-gray-100 rounded-full"
                    >
                      <MoreVertical size={20} />
                    </button>

                    {/* SMART POSITIONED DROPDOWN — NEVER OVERFLOWS */}
                    {openDropdownId === s.id && (
                      <div
                        className="fixed z-[10000] w-40 bg-white border rounded-xl shadow-xl py-1"
                        style={{ top: `${dropdownTop}px`, left: `${dropdownLeft}px` }}
                      >
                        <button
                          onClick={() => {
                            setOpenDropdownId(null);
                            openModal("view", s);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        >
                          👁️ View
                        </button>
                        <button
                          onClick={() => {
                            setOpenDropdownId(null);
                            openModal("edit", s);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          disabled={deletingId === s.id}
                          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          {deletingId === s.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            "🗑️"
                          )}
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-gray-500">
                    No matching staff
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <StaffFormSideSheet
          key={mode + (selected?.id || "new")}
          mode={mode}
          staffToEdit={selected || undefined}
          users={users}
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