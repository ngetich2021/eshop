// app/shops/_components/ShopsClient.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, MoreHorizontal } from "lucide-react";
import ShopFormModal from "./ShopFormModal";
import { deleteShopAction } from "./actions";

interface Shop {
  id: string;
  name: string;
  tel: string;
  location: string;
  createdAt: Date;
}

interface Props {
  totalShops: number;
  initialShops: Shop[];
}

export default function ShopsClient({ totalShops, initialShops }: Props) {
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view">("add");
  const [selectedShop, setSelectedShop] = useState<Shop | undefined>();
  const [search, setSearch] = useState("");
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
    const w = 160;
    let top = rect.bottom + gap;
    let left = rect.right - w;

    if (top + 100 > window.innerHeight) top = rect.top - 100 - gap;
    if (left < gap) left = gap;
    if (left + w > window.innerWidth - gap) left = window.innerWidth - w - gap;

    setDropdownTop(top);
    setDropdownLeft(left);
    setOpenDropdownId(id);
  };

  const openModal = (mode: "add" | "edit" | "view", shop?: Shop) => {
    setModalMode(mode);
    setSelectedShop(shop);
    setIsOpen(true);
    setOpenDropdownId(null);
  };

  const closeModal = () => {
    setIsOpen(false);
    setSelectedShop(undefined);
  };

  const handleSuccess = () => {
    closeModal();
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this shop?")) return;
    try {
      await deleteShopAction(id);
      router.refresh();
    } catch {
      alert("Failed to delete shop.");
    }
  };

  const filteredShops = initialShops.filter((s) =>
    `${s.name} ${s.location}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-gray-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* HEADER - Desktop: total | search | button in one line */}
        {/* Mobile: total + button on top, search full below (exactly as your second screenshot) */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="border border-gray-300 rounded-xl px-6 py-4">
              <div className="text-xs uppercase tracking-widest text-gray-500">total shops</div>
              <div className="text-4xl font-bold text-gray-900">{totalShops}</div>
            </div>
            <button
              onClick={() => openModal("add")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold flex items-center gap-2 text-lg transition"
            >
              +Shop
            </button>
          </div>

          <div className="mt-6 relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-base"
            />
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-white rounded-2xl shadow overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-5 text-left text-sm font-semibold">S/NO</th>
                <th className="px-6 py-5 text-left text-sm font-semibold">shop</th>
                <th className="px-6 py-5 text-left text-sm font-semibold">location</th>
                <th className="px-6 py-5 text-left text-sm font-semibold">tel</th>
                <th className="px-6 py-5 text-center text-sm font-semibold">actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredShops.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-gray-500">No shops found</td>
                </tr>
              ) : (
                filteredShops.map((shop, i) => (
                  <tr
                    key={shop.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => openModal("view", shop)}
                  >
                    <td className="px-6 py-5">{i + 1}</td>
                    <td className="px-6 py-5 font-medium">{shop.name}</td>
                    <td className="px-6 py-5">{shop.location}</td>
                    <td className="px-6 py-5">{shop.tel}</td>
                    <td className="px-6 py-5 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => toggleDropdown(shop.id, e)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                      >
                        <MoreHorizontal className="w-5 h-5" />
                      </button>

                      {openDropdownId === shop.id && (
                        <div
                          className="fixed z-[9999] w-40 bg-white rounded-2xl shadow-xl border py-2 text-sm"
                          style={{ top: `${dropdownTop}px`, left: `${dropdownLeft}px` }}
                        >
                          <button
                            onClick={() => {
                              setOpenDropdownId(null);
                              openModal("edit", shop);
                            }}
                            className="w-full text-left px-6 py-3 hover:bg-gray-100"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(shop.id)}
                            className="w-full text-left px-6 py-3 text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL - responsive slide-in (full screen mobile, clean panel tablet/desktop) */}
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur" onClick={closeModal} />
          <div className="relative w-full md:w-[460px] bg-white h-full shadow-2xl flex flex-col rounded-l-3xl overflow-hidden">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">
                {modalMode === "add" ? "Add Shop" : modalMode === "edit" ? "Edit Shop" : "View Shop"}
              </h2>
              <button onClick={closeModal} className="text-4xl text-gray-400 hover:text-black">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
              <ShopFormModal
                mode={modalMode}
                shop={selectedShop}
                onSuccess={handleSuccess}
                onClose={closeModal}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}