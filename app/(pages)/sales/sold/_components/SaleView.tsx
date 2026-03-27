// app/sale/sold/_components/SaleView.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Loader2, MoreVertical, Receipt, AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { deleteSaleAction } from "./actions";
import POSSheet from "./POSSheet";
import ReceiptModal from "./ReceiptModal";

type SaleItem = {
  id: string;
  productName: string;
  quantity: number;
  price: number;
  discount: number;
};

type Sale = {
  id: string;
  soldById: string;
  soldByName: string;
  items: SaleItem[];
  totalAmount: number;
  paymentMethod: string;
  shop: string;
  shopLocation: string;
  shopTel: string;
  shopId: string;
  date: string;
  createdAt: string;
};

type Product = {
  id: string;
  productName: string;
  sellingPrice: number;
  buyingPrice: number;
  discount: number;
  quantity: number;
  imageUrl: string | null;
  shopId: string;
  shopName: string;
};

type ShopOption = { id: string; name: string; location: string; tel: string };
type StaffOption = { id: string; fullName: string };
type StatPair = { count: number; amount: number };

type Profile = {
  role: string;
  shopId: string | null;
  fullName: string;
};

type Props = {
  stats: { today: StatPair; week: StatPair; month: StatPair; year: StatPair; total: StatPair };
  sales: Sale[];
  products: Product[];
  shops: ShopOption[];
  staffList: StaffOption[];
  profile: Profile;
  hasStaffRecord: boolean;
  activeShopId: string;
};

export default function SaleView({ stats, sales, products, shops, staffList, profile, hasStaffRecord, activeShopId }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showPOS, setShowPOS] = useState(false);
  const [receiptSale, setReceiptSale] = useState<Sale | null>(null);
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
    const gap = 8, dw = 160, dh = 130;
    let top = rect.bottom + gap, left = rect.right - dw;
    if (top + dh > window.innerHeight) top = rect.top - dh - gap;
    if (left < gap) left = gap;
    if (left + dw > window.innerWidth - gap) left = window.innerWidth - dw - gap;
    setDropdownTop(top); setDropdownLeft(left); setOpenDropdownId(id);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this sale? Stock will NOT be restored.")) return;
    setDeletingId(id);
    const res = await deleteSaleAction(id);
    setDeletingId(null);
    if (res.success) router.refresh();
    else alert(res.error || "Delete failed");
    setOpenDropdownId(null);
  };

  const filtered = sales.filter((s) =>
    `${s.soldByName} ${s.paymentMethod} ${s.shop} ${s.items.map((i) => i.productName).join(" ")}`
      .toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50/80 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-screen-2xl space-y-6">

        {/* NO STAFF WARNING */}
        {!hasStaffRecord && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 text-amber-800">
            <AlertCircle size={20} className="shrink-0 text-amber-500" />
            <p className="text-sm font-medium">
              Your account is not linked to a staff record. Sales are disabled until an administrator adds you as staff.
            </p>
          </div>
        )}

        {/* STATS */}
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

        {/* TOOLBAR */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sales..."
              className="w-full rounded-lg border border-gray-300 pl-10 py-2.5 text-sm focus:border-blue-500 outline-none"
            />
          </div>
          <button
            onClick={() => hasStaffRecord && setShowPOS(true)}
            disabled={!hasStaffRecord}
            title={!hasStaffRecord ? "No staff record linked to your account" : undefined}
            className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} /> Make Sale
          </button>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto rounded-xl border bg-white shadow">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["S/NO", "product(s)", "items", "amount", "date", "soldBy", "method", "shop", "actions"].map((h) => (
                  <th key={h} className="px-5 py-3.5 text-left font-semibold text-gray-700 last:text-center">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((sale, i) => (
                <tr key={sale.id} className="hover:bg-gray-50 transition-all">
                  <td className="px-5 py-4">{i + 1}</td>
                  <td className="px-5 py-4 font-semibold max-w-[200px] truncate">
                    {sale.items.map((it) => it.productName).join(", ")}
                  </td>
                  <td className="px-5 py-4">{sale.items.reduce((s, it) => s + it.quantity, 0)}</td>
                  <td className="px-5 py-4 font-medium">KSh {sale.totalAmount.toLocaleString()}</td>
                  <td className="px-5 py-4">{sale.date}</td>
                  <td className="px-5 py-4">{sale.soldByName}</td>
                  <td className="px-5 py-4 capitalize">{sale.paymentMethod}</td>
                  <td className="px-5 py-4">{sale.shop}</td>
                  <td className="px-5 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => toggleDropdown(sale.id, e)} className="p-2 hover:bg-gray-100 rounded-full">
                      <MoreVertical size={20} />
                    </button>
                    {openDropdownId === sale.id && (
                      <div
                        className="fixed z-[10000] w-44 bg-white border rounded-xl shadow-xl py-1"
                        style={{ top: `${dropdownTop}px`, left: `${dropdownLeft}px` }}
                      >
                        <button
                          onClick={() => { setOpenDropdownId(null); setReceiptSale(sale); }}
                          className="flex w-full text-left px-4 py-2 text-sm hover:bg-gray-100 items-center gap-2"
                        >
                          <Receipt size={14} /> Receipt
                        </button>
                        <button
                          onClick={() => handleDelete(sale.id)}
                          disabled={deletingId === sale.id}
                          className="flex w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 items-center gap-2"
                        >
                          {deletingId === sale.id ? <Loader2 size={14} className="animate-spin" /> : "🗑️"} Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="py-20 text-center text-gray-500">No sales found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showPOS && (
        <POSSheet
          products={products}
          shops={shops}
          staffList={staffList}
          profile={profile}
          activeShopId={activeShopId}
          onSuccess={() => { setShowPOS(false); router.refresh(); }}
          onClose={() => setShowPOS(false)}
        />
      )}

      {receiptSale && (
        <ReceiptModal
          sale={receiptSale}
          onClose={() => setReceiptSale(null)}
        />
      )}
    </div>
  );
}