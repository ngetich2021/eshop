// app/shops/_components/ShopsClient.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, MoreVertical, Store, MapPin, Loader2 } from "lucide-react";
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

// ── Dropdown rendered via portal so it escapes sticky/overflow stacking contexts
function ShopDropdown({
  shop,
  top,
  left,
  deletingId,
  onView,
  onEdit,
  onDelete,
}: {
  shop: Shop;
  top: number;
  left: number;
  deletingId: string | null;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return createPortal(
    <div
      className="fixed w-40 bg-white border border-gray-100 rounded-2xl shadow-2xl py-1.5"
      // z-index 20000 — above the modal (10000) and everything else
      style={{ top, left, zIndex: 20000 }}
      // stop clicks inside the menu from bubbling to the document close-listener
      onClick={(e) => e.stopPropagation()}
    >
      <button onClick={onView} className="block w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-gray-50 text-gray-700 rounded-t-2xl">
        👁️ View
      </button>
      <button onClick={onEdit} className="block w-full text-left px-4 py-2.5 text-xs font-medium hover:bg-gray-50 text-gray-700">
        ✏️ Edit
      </button>
      <button
        onClick={onDelete}
        disabled={deletingId === shop.id}
        className="w-full text-left px-4 py-2.5 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-b-2xl disabled:opacity-60"
      >
        {deletingId === shop.id ? <Loader2 size={13} className="animate-spin" /> : "🗑️"} Delete
      </button>
    </div>,
    document.body
  );
}

export default function ShopsClient({ totalShops, initialShops }: Props) {
  const router = useRouter();

  const [isOpen, setIsOpen]             = useState(false);
  const [modalMode, setModalMode]       = useState<"add" | "edit" | "view">("add");
  const [selectedShop, setSelectedShop] = useState<Shop | undefined>();
  const [search, setSearch]             = useState("");
  const [deletingId, setDeletingId]     = useState<string | null>(null);

  // ── dropdown state
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [dropdownTop, setDropdownTop]       = useState(0);
  const [dropdownLeft, setDropdownLeft]     = useState(0);
  // track which shop object the open dropdown belongs to
  const openShopRef = useRef<Shop | null>(null);

  // close on any outside click
  useEffect(() => {
    if (!openDropdownId) return;
    const close = () => setOpenDropdownId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openDropdownId]);

  // close dropdown when page scrolls (avoids misaligned floating menu)
  useEffect(() => {
    if (!openDropdownId) return;
    const close = () => setOpenDropdownId(null);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [openDropdownId]);

  const toggleDropdown = (shop: Shop, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (openDropdownId === shop.id) { setOpenDropdownId(null); return; }

    const rect = e.currentTarget.getBoundingClientRect();
    const gap = 8;
    const dw  = 160;
    const dh  = 120; // 3 items × ~40px

    let top  = rect.bottom + gap;
    let left = rect.right - dw;

    // flip above if it would clip the viewport bottom
    if (top + dh > window.innerHeight - gap) top = rect.top - dh - gap;
    // clamp horizontally
    if (left < gap) left = gap;
    if (left + dw > window.innerWidth - gap) left = window.innerWidth - dw - gap;

    setDropdownTop(top);
    setDropdownLeft(left);
    openShopRef.current = shop;
    setOpenDropdownId(shop.id);
  };

  const openModal = (mode: "add" | "edit" | "view", shop?: Shop) => {
    setModalMode(mode);
    setSelectedShop(shop);
    setIsOpen(true);
    setOpenDropdownId(null);
  };
  const closeModal    = () => { setIsOpen(false); setSelectedShop(undefined); };
  const handleSuccess = () => { closeModal(); router.refresh(); };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this shop?")) return;
    setOpenDropdownId(null);
    setDeletingId(id);
    try {
      await deleteShopAction(id);
      router.refresh();
    } catch {
      alert("Failed to delete shop.");
    } finally {
      setDeletingId(null);
    }
  };

  const filteredShops = initialShops.filter((s) =>
    `${s.name} ${s.location}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      {/* ── table styles */}
      <style>{`
        .shops-table .col-sticky { position:sticky;left:0;z-index:10;box-shadow:6px 0 18px -6px rgba(0,0,0,0.06);clip-path:inset(0px -30px 0px 0px); }
        .shops-table thead .col-sticky { z-index:20; }
        .shops-scroll-wrap { position:relative }
        .shops-scroll-wrap::after { content:'';position:absolute;top:0;right:0;bottom:0;width:48px;background:linear-gradient(to right,transparent,rgba(248,250,252,0.7));pointer-events:none;z-index:5;border-radius:0 16px 16px 0 }
        @keyframes rowIn { from{opacity:0;transform:translateX(-5px)} to{opacity:1;transform:translateX(0)} }
        .shops-table tbody tr { animation:rowIn 0.2s ease both }
      `}</style>

      <main className="min-h-screen bg-gray-100 p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-5">

          {/* ── Header */}
          <div className="flex items-center justify-between gap-4">
            <div className="border border-gray-300 rounded-xl px-6 py-4 bg-white shadow-sm">
              <div className="text-xs uppercase tracking-widest text-gray-500">total shops</div>
              <div className="text-4xl font-bold text-gray-900">{totalShops}</div>
            </div>
            <button onClick={() => openModal("add")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-semibold flex items-center gap-2 text-lg transition shadow-sm">
              + Shop
            </button>
          </div>

          {/* ── Search */}
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by name or location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 text-base shadow-sm transition"
            />
          </div>

          {/* ── Table */}
          <div className="shops-scroll-wrap rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="shops-table w-full min-w-[640px] text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200">
                    <th className="col-sticky px-4 py-3.5 text-left" style={{ backgroundColor: "#f8fafc" }}>
                      <div className="flex items-center gap-3">
                        <span className="text-[0.7rem] font-bold uppercase tracking-widest text-gray-400 w-5">#</span>
                        <span className="text-[0.7rem] font-bold uppercase tracking-widest text-gray-400">Shop</span>
                      </div>
                    </th>
                    {["Location", "Tel", "Actions"].map((h) => (
                      <th key={h} className={`px-4 py-3.5 text-[0.7rem] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap ${h === "Actions" ? "text-center" : "text-left"}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredShops.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-24 text-center">
                        <div className="flex flex-col items-center gap-3 text-gray-300">
                          <Store size={40} strokeWidth={1} />
                          <p className="text-sm font-semibold text-gray-400">No shops found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredShops.map((shop, i) => (
                      <tr
                        key={shop.id}
                        onClick={() => openModal("view", shop)}
                        className="cursor-pointer bg-white hover:bg-slate-50 transition-colors duration-100"
                        style={{ animationDelay: `${i * 0.025}s` }}
                        onMouseEnter={(e) => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#f8fafc"; }}
                        onMouseLeave={(e) => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#ffffff"; }}
                      >
                        <td className="col-sticky px-4 py-3" style={{ backgroundColor: "#ffffff" }}>
                          <div className="flex items-center gap-3">
                            <span className="text-[0.72rem] font-bold text-gray-300 w-5 text-center tabular-nums shrink-0">{i + 1}</span>
                            <div className="h-9 w-9 shrink-0 rounded-xl bg-blue-100 flex items-center justify-center shadow-sm">
                              <Store size={14} className="text-blue-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-800 truncate max-w-[160px] text-[0.82rem] leading-tight">{shop.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-[0.78rem] text-gray-600">
                            <MapPin size={11} className="text-gray-400 shrink-0" />{shop.location}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[0.78rem] text-gray-500">{shop.tel}</span>
                        </td>
                        {/* Actions — stopPropagation so row click doesn't fire */}
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => toggleDropdown(shop, e)}
                            className={`rounded-lg p-1.5 transition-colors text-gray-400 hover:bg-gray-100 ${openDropdownId === shop.id ? "bg-gray-100 text-gray-600" : ""}`}
                          >
                            <MoreVertical size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* ── Portal dropdown — rendered on document.body, escapes all stacking contexts */}
      {openDropdownId && openShopRef.current && (
        <ShopDropdown
          shop={openShopRef.current}
          top={dropdownTop}
          left={dropdownLeft}
          deletingId={deletingId}
          onView={() => openModal("view", openShopRef.current!)}
          onEdit={() => openModal("edit", openShopRef.current!)}
          onDelete={() => handleDelete(openShopRef.current!.id)}
        />
      )}

      {/* ── Slide-in Modal — z-index 10000, below dropdown (20000) */}
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
              <ShopFormModal mode={modalMode} shop={selectedShop} onSuccess={handleSuccess} onClose={closeModal} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}