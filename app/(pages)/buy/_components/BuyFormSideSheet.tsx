// app/buy/_components/BuyFormSideSheet.tsx
"use client";

import { ArrowLeft, Loader2, Eye, Plus, Trash2 } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { useActionState } from "react";
import { saveBuyAction } from "./actions";

type ActionResult = { success: boolean; error?: string };
type SupplierOption = { id: string; name: string };
type ShopOption = { id: string; name: string };

type BuyItem = { name: string; amount: number };

type BuyToEdit = {
  id: string;
  supplierId: string;
  itemsJson: string;
  totalAmount: number;
  transportCost: number;
  status: string;
  shopId: string;
};

type Props = {
  mode: "add" | "edit" | "view";
  buyToEdit?: BuyToEdit | null;
  suppliers: SupplierOption[];
  shops: ShopOption[];
  onSuccess: () => void;
  onClose: () => void;
};

export default function BuyFormSideSheet({ mode, buyToEdit, suppliers, shops, onSuccess, onClose }: Props) {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const formRef = useRef<HTMLFormElement>(null);

  const parseItems = (json: string): BuyItem[] => {
    try { return JSON.parse(json); } catch { return [{ name: "", amount: 0 }]; }
  };

  const [items, setItems] = useState<BuyItem[]>(
    buyToEdit ? parseItems(buyToEdit.itemsJson) : [{ name: "", amount: 0 }]
  );

  const addItem = () => setItems([...items, { name: "", amount: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof BuyItem, value: string | number) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: value };
    setItems(updated);
  };

  const totalAmount = items.reduce((sum, it) => sum + Number(it.amount || 0), 0);

  const [state, submitAction, isPending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      formData.set("itemsJson", JSON.stringify(items));
      formData.set("totalAmount", String(totalAmount));
      return await saveBuyAction(prev, formData);
    },
    { success: false }
  );

  useEffect(() => { if (state?.success) onSuccess(); }, [state?.success, onSuccess]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
      <div className="w-full max-w-[380px] md:max-w-[520px] lg:max-w-[680px] h-full bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center gap-4 border-b px-6 py-5">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><ArrowLeft size={26} /></button>
          <h2 className="text-2xl font-semibold flex items-center gap-3">
            {isView ? <><Eye size={28} className="text-gray-600" /> View Purchase</> : isEdit ? "Edit Purchase" : "Buy Items"}
          </h2>
        </div>

        <form ref={formRef} action={submitAction} className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 space-y-6">
          {buyToEdit?.id && <input type="hidden" name="buyId" value={buyToEdit.id} />}
          {state?.error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-2xl text-center font-medium">{state.error}</div>}

          {/* SUPPLIER */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Supplier:</label>
            <select name="supplierId" defaultValue={buyToEdit?.supplierId || ""} required disabled={isView} className={`w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`}>
              <option value="">Select supplier</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* SHOP */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Shop:</label>
            <select name="shopId" defaultValue={buyToEdit?.shopId || ""} required disabled={isView} className={`w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`}>
              <option value="">Select shop</option>
              {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* ITEMS */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Products:</label>
              {!isView && <button type="button" onClick={addItem} className="text-green-600 hover:text-green-700 flex items-center gap-1 text-sm font-medium"><Plus size={16} /> Add Item</button>}
            </div>
            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <input value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)} readOnly={isView} placeholder="Product name" className={`flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`} />
                  <input value={item.amount} onChange={(e) => updateItem(i, "amount", e.target.value)} readOnly={isView} type="number" placeholder="Amount" className={`w-32 border border-gray-300 rounded-xl px-4 py-3 text-sm ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`} />
                  {!isView && items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-red-500 hover:text-red-700"><Trash2 size={18} /></button>}
                </div>
              ))}
            </div>
          </div>

          {/* TRANSPORT + STATUS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Fare (KSh):</label>
              <input name="transportCost" type="number" defaultValue={buyToEdit?.transportCost || 0} readOnly={isView} className={`w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`} />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Status:</label>
              <select name="status" defaultValue={buyToEdit?.status || "pending"} disabled={isView} className={`w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`}>
                <option value="pending">Pending</option>
                <option value="shipped">Shipped</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* TOTAL */}
          <div className="bg-gray-50 rounded-2xl px-5 py-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Total Amount:</span>
              <span className="text-xl font-bold text-gray-900">KSh {totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {!isView && (
            <button type="submit" disabled={isPending} className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-4 text-xl font-semibold rounded-2xl flex items-center justify-center gap-2">
              {isPending ? <Loader2 size={24} className="animate-spin" /> : isEdit ? "Update Purchase" : "Buy"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}