// app/inventory/adjustStock/_components/AdjustStockView.tsx
"use client";

import { useEffect, useState } from "react";
import { Search, Plus, Loader2, MoreVertical, Store, MapPin, PackageX, SlidersHorizontal, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { deleteAdjustmentAction } from "./actions";
import AdjustmentFormSideSheet from "./AdjustmentFormSideSheet";
import { deleteReturnAction, updateReturnStatusAction } from "./returnactions";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type Adjustment = {
  id: string; productName: string; productId: string; adjustType: string;
  quantity: number; originalStock: number; newStockQty: number;
  value: number; adjustedBy: string; shop: string; shopId: string; date: string;
};

type ReturnItem = {
  id: string; productId: string; productName: string;
  quantity: number; price: number; reason: string;
};

type Return = {
  id: string; saleId: string | null; reason: string; status: string;
  returnedById: string; shopId: string; shopName: string; date: string;
  totalQty: number; totalValue: number; items: ReturnItem[];
};

type ProductOption = { id: string; productName: string; quantity: number; sellingPrice: number };
type SaleOption   = { id: string; label: string };
type ShopOption   = { id: string; name: string };
type Profile      = { role: string; shopId: string | null; fullName: string };

type Props = {
  activeShop: { id: string; name: string; location: string };
  activeShopId: string;
  isStaff: boolean;
  isAdmin: boolean;
  stats: {
    totalAdjustments: number; totalValue: number;
    totalReturns: number; totalReturnValue: number; pendingReturns: number;
  };
  adjustments: Adjustment[];
  returns: Return[];
  sales: SaleOption[];
  products: ProductOption[];
  shops: ShopOption[];
  profile: Profile;
};

const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

/* ─── Component ──────────────────────────────────────────────────────────── */
export default function AdjustStockView({
  activeShop, activeShopId, isStaff, isAdmin,
  stats, adjustments, returns, sales, products, shops, profile,
}: Props) {
  const router = useRouter();
  const canManage = !isStaff;

  const [tab, setTab] = useState<"adjustments" | "returns">("adjustments");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  // form
  const [showForm, setShowForm]   = useState(false);
  const [formMode, setFormMode]   = useState<"adjustment" | "return">("adjustment");
  const [viewAdj, setViewAdj]     = useState<Adjustment | undefined>();
  const [viewRet, setViewRet]     = useState<Return | undefined>();

  // actions
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [openDropId, setOpenDropId] = useState<string | null>(null);
  const [dropTop,    setDropTop]    = useState(0);
  const [dropLeft,   setDropLeft]   = useState(0);

  useEffect(() => {
    if (!openDropId) return;
    const close = () => setOpenDropId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [openDropId]);

  const toggleDrop = (id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (openDropId === id) { setOpenDropId(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const dw = 180, dh = 150, gap = 8;
    let top = rect.bottom + gap, left = rect.right - dw;
    if (top + dh > window.innerHeight) top = rect.top - dh - gap;
    if (left < gap) left = gap;
    if (left + dw > window.innerWidth - gap) left = window.innerWidth - dw - gap;
    setDropTop(top); setDropLeft(left); setOpenDropId(id);
  };

  const openAdd = () => {
    setFormMode(tab === "returns" ? "return" : "adjustment");
    setViewAdj(undefined); setViewRet(undefined);
    setShowForm(true);
  };

  const openViewAdj = (a: Adjustment) => { setFormMode("adjustment"); setViewAdj(a); setViewRet(undefined); setShowForm(true); };
  const openViewRet = (r: Return)     => { setFormMode("return");     setViewRet(r); setViewAdj(undefined); setShowForm(true); };

  const closeForm = () => { setShowForm(false); setViewAdj(undefined); setViewRet(undefined); };

  const handleDeleteAdj = async (id: string) => {
    if (!confirm("Delete this adjustment?")) return;
    setDeletingId(id); setOpenDropId(null);
    const res = await deleteAdjustmentAction(id);
    setDeletingId(null);
    if (res.success) router.refresh(); else alert(res.error || "Delete failed");
  };

  const handleDeleteRet = async (id: string) => {
    if (!confirm("Delete this return? Stock will be reversed.")) return;
    setDeletingId(id); setOpenDropId(null);
    const res = await deleteReturnAction(id);
    setDeletingId(null);
    if (res.success) router.refresh(); else alert(res.error || "Delete failed");
  };

  const handleStatusChange = async (id: string, status: string) => {
    setUpdatingId(id); setOpenDropId(null);
    const res = await updateReturnStatusAction(id, status);
    setUpdatingId(null);
    if (res.success) router.refresh(); else alert(res.error || "Update failed");
  };

  const filteredAdj = adjustments.filter((a) =>
    `${a.productName} ${a.adjustType} ${a.shop}`.toLowerCase().includes(search.toLowerCase())
  );

  const filteredRet = returns.filter((r) => {
    const matchSearch = `${r.id} ${r.shopName} ${r.reason} ${r.items.map((i) => i.productName).join(" ")}`
      .toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50/80 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-screen-2xl space-y-6">

        {/* ── Active Shop Banner ──────────────────────────────────────────── */}
        <div className="flex items-center gap-4 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 px-5 py-3.5 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 shadow">
            <Store size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-400">Active Shop</p>
            <p className="font-bold text-indigo-900 truncate">{activeShop.name}</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs text-gray-500 shadow-sm shrink-0">
            <MapPin size={11} />{activeShop.location}
          </div>
          {isStaff && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200 shrink-0">Staff View</span>}
          {isAdmin && <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 border border-purple-200 shrink-0">Admin View</span>}
        </div>

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Stat label="Adjustments"      value={stats.totalAdjustments} />
          <Stat label="Adjustment Value" value={`KSh ${stats.totalValue.toLocaleString()}`} />
          <Stat label="Returns"          value={stats.totalReturns} />
          <Stat label="Return Value"     value={`KSh ${stats.totalReturnValue.toLocaleString()}`} />
          <Stat label="Pending Returns"  value={stats.pendingReturns} variant="warning" />
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1 w-fit">
          <TabBtn
            active={tab === "adjustments"}
            onClick={() => { setTab("adjustments"); setSearch(""); }}
            icon={<SlidersHorizontal size={15} />}
            label="Adjustments"
            count={adjustments.length}
          />
          <TabBtn
            active={tab === "returns"}
            onClick={() => { setTab("returns"); setSearch(""); setStatusFilter("all"); }}
            icon={<RotateCcw size={15} />}
            label="Returns"
            count={returns.length}
            badge={stats.pendingReturns > 0 ? stats.pendingReturns : undefined}
          />
        </div>

        {/* ── Toolbar ────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {tab === "returns" && (
              (["all", "pending", "approved", "rejected"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
                    statusFilter === s
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                  }`}
                >
                  {s === "all" ? `All (${returns.length})` : s}
                </button>
              ))
            )}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tab === "adjustments" ? "Search adjustments…" : "Search returns…"}
                className="w-56 rounded-lg border border-gray-300 pl-10 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
          {canManage && (
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700 shrink-0"
            >
              <Plus size={16} />
              {tab === "adjustments" ? "Add Adjustment" : "New Return"}
            </button>
          )}
        </div>

        {/* ── Adjustments Table ──────────────────────────────────────────── */}
        {tab === "adjustments" && (
          <div className="overflow-x-auto rounded-xl border bg-white shadow">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["S/NO", "Product", "Type", "Old Qty", "New Qty", "Value", "Date", "Shop", "Actions"].map((h) => (
                    <th key={h} className="px-6 py-3.5 text-left font-semibold text-gray-700 last:text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAdj.map((a, i) => (
                  <tr key={a.id} onClick={() => openViewAdj(a)} className="cursor-pointer hover:bg-gray-50 transition-all">
                    <td className="px-6 py-4 text-gray-500">{i + 1}</td>
                    <td className="px-6 py-4 font-semibold">{a.productName}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        a.adjustType === "increase" ? "bg-green-100 text-green-700" :
                        a.adjustType === "decrease" ? "bg-red-100 text-red-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>{a.adjustType}</span>
                    </td>
                    <td className="px-6 py-4">{a.originalStock}</td>
                    <td className="px-6 py-4">{a.newStockQty}</td>
                    <td className="px-6 py-4">KSh {a.value.toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-500">{a.date}</td>
                    <td className="px-6 py-4">{a.shop}</td>
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => toggleDrop(a.id, e)} className="p-2 hover:bg-gray-100 rounded-full">
                        <MoreVertical size={20} />
                      </button>
                      {openDropId === a.id && (
                        <DropMenu top={dropTop} left={dropLeft}>
                          <DropItem onClick={() => { setOpenDropId(null); openViewAdj(a); }}>👁️ View</DropItem>
                          {canManage && (
                            <DropItem danger onClick={() => handleDeleteAdj(a.id)} loading={deletingId === a.id}>
                              🗑️ Delete
                            </DropItem>
                          )}
                        </DropMenu>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredAdj.length === 0 && <EmptyRow cols={9} />}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Returns Table ──────────────────────────────────────────────── */}
        {tab === "returns" && (
          <div className="overflow-x-auto rounded-xl border bg-white shadow">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {["S/NO", "Return ID", "Products", "Qty", "Value", "Reason", "Status", "Date", "Actions"].map((h) => (
                    <th key={h} className="px-6 py-3.5 text-left font-semibold text-gray-700 last:text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRet.map((r, i) => (
                  <tr key={r.id} onClick={() => openViewRet(r)} className="cursor-pointer hover:bg-gray-50 transition-all">
                    <td className="px-6 py-4 text-gray-500">{i + 1}</td>
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{r.id.slice(0, 10)}…</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        {r.items.slice(0, 2).map((item) => (
                          <span key={item.id} className="font-medium">{item.productName}</span>
                        ))}
                        {r.items.length > 2 && <span className="text-xs text-gray-400">+{r.items.length - 2} more</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold">{r.totalQty}</td>
                    <td className="px-6 py-4">KSh {r.totalValue.toLocaleString()}</td>
                    <td className="px-6 py-4 text-gray-500 max-w-[140px] truncate">{r.reason || "—"}</td>
                    <td className="px-6 py-4">
                      {updatingId === r.id ? (
                        <Loader2 size={16} className="animate-spin text-gray-400" />
                      ) : (
                        <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[r.status] ?? "bg-gray-100 text-gray-600"}`}>
                          {r.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-500">{r.date}</td>
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button onClick={(e) => toggleDrop(r.id, e)} className="p-2 hover:bg-gray-100 rounded-full">
                        <MoreVertical size={20} />
                      </button>
                      {openDropId === r.id && (
                        <DropMenu top={dropTop} left={dropLeft}>
                          <DropItem onClick={() => { setOpenDropId(null); openViewRet(r); }}>👁️ View</DropItem>
                          {canManage && r.status === "pending" && (
                            <>
                              <DropItem onClick={() => handleStatusChange(r.id, "approved")}>✅ Approve</DropItem>
                              <DropItem onClick={() => handleStatusChange(r.id, "rejected")}>❌ Reject</DropItem>
                            </>
                          )}
                          {canManage && (
                            <DropItem danger onClick={() => handleDeleteRet(r.id)} loading={deletingId === r.id}>
                              🗑️ Delete
                            </DropItem>
                          )}
                        </DropMenu>
                      )}
                    </td>
                  </tr>
                ))}
                {filteredRet.length === 0 && <EmptyRow cols={9} />}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Side Sheet ───────────────────────────────────────────────────── */}
      {showForm && (
        <AdjustmentFormSideSheet
          key={(viewAdj?.id ?? viewRet?.id) || "new"}
          mode={formMode}
          viewAdj={viewAdj ?? null}
          viewRet={viewRet ?? null}
          products={products}
          sales={sales}
          shops={shops}
          profile={profile}
          onSuccess={() => { closeForm(); router.refresh(); }}
          onClose={closeForm}
        />
      )}
    </div>
  );
}

/* ─── Small helpers ──────────────────────────────────────────────────────── */
function TabBtn({ active, onClick, icon, label, count, badge }: {
  active: boolean; onClick: () => void; icon: React.ReactNode;
  label: string; count: number; badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
        active ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"
      }`}
    >
      {icon}{label}
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${active ? "bg-indigo-100 text-indigo-700" : "bg-gray-200 text-gray-500"}`}>
        {count}
      </span>
      {badge != null && (
        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold">
          {badge}
        </span>
      )}
    </button>
  );
}

function DropMenu({ top, left, children }: { top: number; left: number; children: React.ReactNode }) {
  return (
    <div className="fixed z-[10000] w-44 bg-white border rounded-xl shadow-xl py-1" style={{ top, left }}>
      {children}
    </div>
  );
}

function DropItem({ children, onClick, danger, loading }: {
  children: React.ReactNode; onClick: () => void; danger?: boolean; loading?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60 ${danger ? "text-red-600 hover:bg-red-50" : ""}`}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

function EmptyRow({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="py-20 text-center text-gray-400">
        <div className="flex flex-col items-center gap-2">
          <PackageX size={36} className="text-gray-300" />
          Nothing found
        </div>
      </td>
    </tr>
  );
}

function Stat({ label, value, variant = "default" }: {
  label: string; value: string | number; variant?: "default" | "warning" | "success";
}) {
  const color = variant === "warning" ? "text-amber-700" : variant === "success" ? "text-green-700" : "text-gray-900";
  return (
    <div className="rounded-lg border bg-white p-4 text-center shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}