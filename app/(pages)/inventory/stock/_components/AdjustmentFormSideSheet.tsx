// app/inventory/adjustStock/_components/AdjustmentFormSideSheet.tsx
"use client";

import { ArrowLeft, Loader2, Eye } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { useActionState } from "react";
import { saveAdjustmentAction } from "./actions";

type ActionResult = { success: boolean; error?: string };
type ProductOption = { id: string; productName: string; quantity: number; sellingPrice: number };
type ShopOption = { id: string; name: string };

type Profile = {
  role: string;
  shopId: string | null;
  fullName: string;
};

type ViewItem = {
  id: string;
  productName: string;
  productId: string;
  adjustType: string;
  quantity: number;
  originalStock: number;
  newStockQty: number;
  value: number;
  adjustedBy: string;
  shopId: string;
  shop: string;
};

type Props = {
  viewItem?: ViewItem | null;
  products: ProductOption[];
  shops: ShopOption[];
  profile: Profile;
  onSuccess: () => void;
  onClose: () => void;
};

export default function AdjustmentFormSideSheet({
  viewItem,
  products,
  shops,
  profile,
  onSuccess,
  onClose,
}: Props) {
  const isView = !!viewItem;
  const isAdmin = profile.role?.toLowerCase().trim() === "admin";
  const defaultShopId = profile.shopId ?? shops[0]?.id ?? "";

  const formRef = useRef<HTMLFormElement>(null);

  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState<number>(0);
  const [selectedShopId, setSelectedShopId] = useState(defaultShopId);

  const [state, submitAction, isPending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => await saveAdjustmentAction(prev, formData),
    { success: false }
  );

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state?.success, onSuccess]);

  // Derived — no state, no effect needed
  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const computedValue = (selectedProduct?.sellingPrice ?? 0) * quantity;
  const shopName = shops.find((s) => s.id === selectedShopId)?.name ?? "";

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
      <div className="w-full max-w-[380px] md:max-w-[520px] lg:max-w-[680px] h-full bg-white shadow-2xl flex flex-col overflow-hidden">

        <div className="flex items-center gap-4 border-b px-6 py-5">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={26} />
          </button>
          <h2 className="text-2xl font-semibold flex items-center gap-3">
            {isView ? (
              <><Eye size={28} className="text-gray-600" /> View Adjustment</>
            ) : (
              "Add Adjustment"
            )}
          </h2>
        </div>

        <form ref={formRef} action={submitAction} className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 space-y-8">
          {state?.error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-2xl text-center font-medium">
              {state.error}
            </div>
          )}

          {!isView && <input type="hidden" name="adjustedBy" value={profile.fullName} />}
          {!isView && <input type="hidden" name="shopId" value={selectedShopId} />}

          {/* PRODUCT */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Product:</label>
            {isView ? (
              <div className="w-full border border-gray-300 rounded-2xl px-5 py-3.5 bg-gray-50 text-gray-600">
                {viewItem.productName}
              </div>
            ) : (
              <select
                name="productId"
                required
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base"
              >
                <option value="">Select product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.productName} (stock: {p.quantity} | KSh {p.sellingPrice.toLocaleString()})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* SHOP */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Shop:</label>
            {isView ? (
              <div className="w-full border border-gray-300 rounded-2xl px-5 py-3.5 bg-gray-50 text-gray-600">
                {viewItem.shop}
              </div>
            ) : isAdmin && !profile.shopId ? (
              <select
                value={selectedShopId}
                onChange={(e) => setSelectedShopId(e.target.value)}
                className="w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base"
              >
                <option value="">Select shop</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            ) : (
              <div className="w-full border border-gray-300 rounded-2xl px-5 py-3.5 bg-gray-50 text-gray-600">
                {shopName || "—"}
              </div>
            )}
          </div>

          {/* TYPE + QUANTITY */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Adjust Type:</label>
              {isView ? (
                <div className="w-full border border-gray-300 rounded-2xl px-5 py-3.5 bg-gray-50 text-gray-600 capitalize">
                  {viewItem.adjustType}
                </div>
              ) : (
                <select
                  name="adjustType"
                  required
                  className="w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base"
                >
                  <option value="increase">Increase</option>
                  <option value="decrease">Decrease</option>
                  <option value="set">Set</option>
                </select>
              )}
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Quantity:</label>
              {isView ? (
                <input
                  name="quantity"
                  type="number"
                  defaultValue={viewItem.quantity}
                  readOnly
                  className="w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base bg-gray-50 cursor-not-allowed"
                />
              ) : (
                <input
                  name="quantity"
                  type="number"
                  min={0}
                  value={quantity === 0 ? "" : quantity}
                  onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                  required
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base"
                />
              )}
            </div>
          </div>

          {/* VALUE */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">
              Value (KSh):
              {!isView && selectedProduct && (
                <span className="ml-2 text-xs text-gray-400 font-normal">
                  {quantity} × KSh {selectedProduct.sellingPrice.toLocaleString()} = KSh {computedValue.toLocaleString()}
                </span>
              )}
            </label>
            <input
              name="value"
              type="number"
              value={isView ? viewItem.value : computedValue}
              readOnly
              className="w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base bg-gray-50 cursor-not-allowed"
            />
          </div>

          {/* STOCK SUMMARY — view only */}
          {isView && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-2xl p-4 text-center">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Old Stock</div>
                <div className="text-2xl font-bold text-gray-800">{viewItem.originalStock}</div>
              </div>
              <div className="bg-green-50 rounded-2xl p-4 text-center">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">New Stock</div>
                <div className="text-2xl font-bold text-green-700">{viewItem.newStockQty}</div>
              </div>
            </div>
          )}

          {/* ADJUSTED BY — view only */}
          {isView && (
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Adjusted By:</label>
              <div className="w-full border border-gray-300 rounded-2xl px-5 py-3.5 bg-gray-50 text-gray-600">
                {viewItem.adjustedBy}
              </div>
            </div>
          )}

          {!isView && (
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-4 text-xl font-semibold rounded-2xl flex items-center justify-center gap-2"
            >
              {isPending ? <Loader2 size={24} className="animate-spin" /> : "Adjust Stock"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}