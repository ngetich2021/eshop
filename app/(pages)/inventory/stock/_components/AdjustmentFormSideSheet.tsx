// app/inventory/adjustStock/_components/AdjustmentFormSideSheet.tsx
"use client";

import { ArrowLeft, Eye, Store, Loader2, Plus, Trash2, SlidersHorizontal, RotateCcw } from "lucide-react";
import { useState, useEffect } from "react";
import { useActionState } from "react";
import { saveAdjustmentAction } from "./actions";
import { saveReturnAction } from "./returnactions";

type ActionResult = { success: boolean; error?: string };
type ProductOption = { id: string; productName: string; quantity: number; sellingPrice: number };
type SaleOption   = { id: string; label: string };
type ShopOption   = { id: string; name: string };
type Profile      = { role: string; shopId: string | null; fullName: string };

type ViewAdj = {
  id: string; productName: string; productId: string; adjustType: string;
  quantity: number; originalStock: number; newStockQty: number;
  value: number; adjustedBy: string; shop: string; shopId: string; date: string;
};

type ReturnLineItem = { id: string; productId: string; productName: string; quantity: number; price: number; reason: string };
type ViewRet = {
  id: string; saleId: string | null; reason: string; status: string;
  shopName: string; date: string; totalQty: number; totalValue: number;
  items: ReturnLineItem[];
};

type Props = {
  mode: "adjustment" | "return";
  viewAdj?: ViewAdj | null;
  viewRet?: ViewRet | null;
  products: ProductOption[];
  sales: SaleOption[];
  shops: ShopOption[];
  profile: Profile;
  onSuccess: () => void;
  onClose: () => void;
};

type LineItem = { _key: string; productId: string; quantity: number; price: number; reason: string };

const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-amber-100 text-amber-700 border-amber-200",
  approved: "bg-green-100 text-green-700 border-green-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
};

export default function AdjustmentFormSideSheet({
  mode, viewAdj, viewRet, products, sales, shops, profile, onSuccess, onClose,
}: Props) {
  const isViewAdj = mode === "adjustment" && !!viewAdj;
  const isViewRet = mode === "return" && !!viewRet;
  const isView    = isViewAdj || isViewRet;

  const isAdmin          = profile.role?.toLowerCase().trim() === "admin";
  const adminCanPickShop = isAdmin && !profile.shopId;
  const activeShopId     = profile.shopId ?? shops[0]?.id ?? "";
  const activeShopName   = shops.find((s) => s.id === activeShopId)?.name ?? "—";
  const [selectedShopId, setSelectedShopId] = useState(activeShopId);

  // adjustment state
  const [selProductId, setSelProductId] = useState("");
  const [adjQty,       setAdjQty]       = useState<number>(0);

  const [adjState, adjSubmit, adjPending] = useActionState<ActionResult, FormData>(
    async (prev, fd) => await saveAdjustmentAction(prev, fd),
    { success: false }
  );

  // return state
  const [reason,     setReason]     = useState("");
  const [saleId,     setSaleId]     = useState("");
  const [lineItems,  setLineItems]  = useState<LineItem[]>([
    { _key: crypto.randomUUID(), productId: "", quantity: 1, price: 0, reason: "" },
  ]);
  const [retPending, setRetPending] = useState(false);
  const [retError,   setRetError]   = useState("");

  useEffect(() => { if (adjState?.success) onSuccess(); }, [adjState?.success, onSuccess]);

  const selProduct  = products.find((p) => p.id === selProductId);
  const computedVal = (selProduct?.sellingPrice ?? 0) * adjQty;
  const retTotalQty = lineItems.reduce((s, i) => s + i.quantity, 0);
  const retTotalVal = lineItems.reduce((s, i) => s + i.price * i.quantity, 0);

  const updateLine = (key: string, field: keyof LineItem, value: string | number) => {
    setLineItems((prev) => prev.map((item) => {
      if (item._key !== key) return item;
      const updated = { ...item, [field]: value };
      if (field === "productId") {
        const p = products.find((p) => p.id === value);
        updated.price = p?.sellingPrice ?? 0;
      }
      return updated;
    }));
  };
  const addLine    = () => setLineItems((p) => [...p, { _key: crypto.randomUUID(), productId: "", quantity: 1, price: 0, reason: "" }]);
  const removeLine = (key: string) => setLineItems((p) => p.filter((i) => i._key !== key));

  const handleReturnSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRetPending(true); setRetError("");
    const fd = new FormData();
    fd.set("shopId", selectedShopId);
    fd.set("reason", reason);
    fd.set("saleId", saleId);
    fd.set("items",  JSON.stringify(lineItems.map(({ productId, quantity, price, reason: r }) => ({ productId, quantity, price, reason: r }))));
    const res = await saveReturnAction({ success: false }, fd);
    setRetPending(false);
    if (res.success) onSuccess(); else setRetError(res.error ?? "Save failed");
  };

  const TitleIcon = isView ? Eye : mode === "adjustment" ? SlidersHorizontal : RotateCcw;
  const title     = isViewAdj ? "View Adjustment"
                  : isViewRet ? "View Return"
                  : mode === "adjustment" ? "Add Adjustment"
                  : "New Return";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
      <div className="w-full max-w-[400px] md:max-w-[560px] lg:max-w-[720px] h-full bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-4 border-b px-6 py-5">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={26} />
          </button>
          <h2 className="text-2xl font-semibold flex items-center gap-3">
            <TitleIcon size={26} className="text-gray-500" /> {title}
          </h2>
          {isViewRet && viewRet && (
            <span className={`ml-auto rounded-full border px-4 py-1 text-xs font-semibold capitalize ${STATUS_STYLES[viewRet.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
              {viewRet.status}
            </span>
          )}
        </div>

        {/* ── VIEW ADJUSTMENT ─────────────────────────────────────────────── */}
        {isViewAdj && viewAdj && (
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Product"     value={viewAdj.productName} />
              <Field label="Shop"        value={viewAdj.shop} />
              <Field label="Date"        value={viewAdj.date} />
              <Field label="Adjusted By" value={viewAdj.adjustedBy} />
              <Field label="Type"        value={viewAdj.adjustType} />
              <Field label="Quantity"    value={String(viewAdj.quantity)} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <SummaryCard label="Old Stock"   value={viewAdj.originalStock}                          color="gray" />
              <SummaryCard label="New Stock"   value={viewAdj.newStockQty}                            color="green" />
              <SummaryCard label="Value (KSh)" value={`KSh ${viewAdj.value.toLocaleString()}`}        color="indigo" />
            </div>
          </div>
        )}

        {/* ── VIEW RETURN ─────────────────────────────────────────────────── */}
        {isViewRet && viewRet && (
          <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Shop"    value={viewRet.shopName} />
              <Field label="Date"    value={viewRet.date} />
              <Field label="Sale ID" value={viewRet.saleId ?? "—"} />
              <Field label="Reason"  value={viewRet.reason || "—"} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <SummaryCard label="Total Items" value={viewRet.totalQty}                              color="indigo" />
              <SummaryCard label="Total Value" value={`KSh ${viewRet.totalValue.toLocaleString()}`} color="green" />
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Returned Products</h3>
              <div className="rounded-2xl border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {["Product", "Qty", "Price", "Subtotal", "Reason"].map((h) => (
                        <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {viewRet.items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 font-medium">{item.productName}</td>
                        <td className="px-4 py-3">{item.quantity}</td>
                        <td className="px-4 py-3">KSh {item.price.toLocaleString()}</td>
                        <td className="px-4 py-3 font-semibold">KSh {(item.price * item.quantity).toLocaleString()}</td>
                        <td className="px-4 py-3 text-gray-500">{item.reason || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── ADD ADJUSTMENT ──────────────────────────────────────────────── */}
        {!isView && mode === "adjustment" && (
          <form action={adjSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
            {adjState?.error && <ErrorBox msg={adjState.error} />}
            <input type="hidden" name="adjustedBy" value={profile.fullName} />
            <input type="hidden" name="shopId"     value={selectedShopId} />

            <ShopField adminCanPickShop={adminCanPickShop} shops={shops} activeShopName={activeShopName}
              selectedShopId={selectedShopId} onShopChange={setSelectedShopId} />

            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Product:</label>
              <select name="productId" required value={selProductId} onChange={(e) => setSelProductId(e.target.value)}
                className="w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base">
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.productName} — stock: {p.quantity} | KSh {p.sellingPrice.toLocaleString()}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-700">Adjust Type:</label>
                <select name="adjustType" required className="w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base">
                  <option value="increase">Increase</option>
                  <option value="decrease">Decrease</option>
                  <option value="set">Set</option>
                </select>
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-700">Quantity:</label>
                <input name="quantity" type="number" min={0} required placeholder="0"
                  value={adjQty === 0 ? "" : adjQty}
                  onChange={(e) => setAdjQty(Number(e.target.value) || 0)}
                  className="w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base" />
              </div>
            </div>

            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">
                Value (KSh):
                {selProduct && (
                  <span className="ml-2 text-xs text-gray-400 font-normal">
                    {adjQty} × KSh {selProduct.sellingPrice.toLocaleString()} = KSh {computedVal.toLocaleString()}
                  </span>
                )}
              </label>
              <input name="value" type="number" value={computedVal} readOnly
                className="w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base bg-gray-50 cursor-not-allowed" />
            </div>

            <button type="submit" disabled={adjPending}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-4 text-xl font-semibold rounded-2xl flex items-center justify-center gap-2">
              {adjPending ? <Loader2 size={24} className="animate-spin" /> : "Adjust Stock"}
            </button>
          </form>
        )}

        {/* ── ADD RETURN ──────────────────────────────────────────────────── */}
        {!isView && mode === "return" && (
          <form onSubmit={handleReturnSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8">
            {retError && <ErrorBox msg={retError} />}

            <ShopField adminCanPickShop={adminCanPickShop} shops={shops} activeShopName={activeShopName}
              selectedShopId={selectedShopId} onShopChange={setSelectedShopId} />

            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">
                Linked Sale <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select value={saleId} onChange={(e) => setSaleId(e.target.value)}
                className="w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base">
                <option value="">No linked sale</option>
                {sales.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">
                Overall Reason <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Defective batch, customer unsatisfied…"
                className="w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Return Items</label>
                <button type="button" onClick={addLine} className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800">
                  <Plus size={16} /> Add row
                </button>
              </div>
              <div className="space-y-3">
                {lineItems.map((item, idx) => {
                  const prod = products.find((p) => p.id === item.productId);
                  return (
                    <div key={item._key} className="rounded-2xl border border-gray-200 p-4 space-y-3 bg-gray-50/60">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-400 uppercase">Item {idx + 1}</span>
                        {lineItems.length > 1 && (
                          <button type="button" onClick={() => removeLine(item._key)} className="text-red-400 hover:text-red-600">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      <select required value={item.productId}
                        onChange={(e) => updateLine(item._key, "productId", e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm bg-white">
                        <option value="">Select product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.productName} (stock: {p.quantity})</option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">Quantity</label>
                          <input type="number" min={1} required value={item.quantity}
                            onChange={(e) => updateLine(item._key, "quantity", Number(e.target.value) || 1)}
                            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 mb-1 block">
                            Price (KSh){prod && <span className="ml-1 text-indigo-400">auto: {prod.sellingPrice.toLocaleString()}</span>}
                          </label>
                          <input type="number" min={0} required value={item.price}
                            onChange={(e) => updateLine(item._key, "price", Number(e.target.value) || 0)}
                            className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" />
                        </div>
                      </div>
                      <input type="text" value={item.reason} placeholder="Item reason (optional)"
                        onChange={(e) => updateLine(item._key, "reason", e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm" />
                      {item.productId && (
                        <div className="text-right text-xs text-gray-500">
                          Subtotal: <span className="font-semibold text-gray-700">KSh {(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <SummaryCard label="Total Items" value={retTotalQty}                             color="indigo" />
              <SummaryCard label="Total Value" value={`KSh ${retTotalVal.toLocaleString()}`}  color="green" />
            </div>

            <button type="submit" disabled={retPending}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-4 text-xl font-semibold rounded-2xl flex items-center justify-center gap-2">
              {retPending ? <Loader2 size={24} className="animate-spin" /> : "Save Return"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function ShopField({ adminCanPickShop, shops, activeShopName, selectedShopId, onShopChange }: {
  adminCanPickShop: boolean; shops: { id: string; name: string }[];
  activeShopName: string; selectedShopId: string; onShopChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block mb-1.5 text-sm font-medium text-gray-700">Shop:</label>
      {adminCanPickShop ? (
        <select value={selectedShopId} onChange={(e) => onShopChange(e.target.value)}
          className="w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base">
          <option value="">Select shop</option>
          {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      ) : (
        <div className="w-full border border-indigo-200 rounded-2xl px-5 py-3.5 bg-indigo-50 text-indigo-800 font-medium flex items-center gap-2">
          <Store size={16} className="text-indigo-500 shrink-0" />
          {activeShopName}
          <span className="ml-auto text-xs text-indigo-400 font-normal">Active shop</span>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</p>
      <div className="rounded-2xl border border-gray-200 bg-gray-50 px-5 py-3 text-gray-700 text-sm font-medium truncate">{value}</div>
    </div>
  );
}

function SummaryCard({ label, value, color }: { label: string; value: string | number; color: "gray" | "green" | "indigo" }) {
  const bg  = color === "green" ? "bg-green-50"  : color === "indigo" ? "bg-indigo-50"  : "bg-gray-50";
  const txt = color === "green" ? "text-green-700" : color === "indigo" ? "text-indigo-700" : "text-gray-800";
  const sub = color === "green" ? "text-green-500" : color === "indigo" ? "text-indigo-500" : "text-gray-500";
  return (
    <div className={`${bg} rounded-2xl p-4 text-center`}>
      <div className={`text-xs ${sub} uppercase tracking-wide mb-1`}>{label}</div>
      <div className={`text-2xl font-bold ${txt}`}>{value}</div>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-2xl text-center font-medium">{msg}</div>
  );
}