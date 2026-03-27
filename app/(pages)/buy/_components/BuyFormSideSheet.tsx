"use client";

import { ArrowLeft, Loader2, Eye, Plus, Trash2, Store, ShoppingBag, UserPlus } from "lucide-react";
import { useRef, useEffect, useState, useActionState } from "react";
import { createSupplierAction, saveBuyAction } from "./actions";

type ActionResult = { success: boolean; error?: string };
type SupplierOption = { id: string; name: string };
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
  activeShopId: string;
  activeShopName: string;
  activeUserName: string;
  onSuccess: () => void;
  onClose: () => void;
};

export default function BuyFormSideSheet({
  mode, buyToEdit, suppliers: initialSuppliers, activeShopId, activeShopName, activeUserName, onSuccess, onClose,
}: Props) {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const formRef = useRef<HTMLFormElement>(null);

  const parseItems = (json: string): BuyItem[] => {
    try { return JSON.parse(json); } catch { return [{ name: "", amount: 0 }]; }
  };

  const [items, setItems] = useState<BuyItem[]>(
    buyToEdit ? parseItems(buyToEdit.itemsJson) : [{ name: "", amount: 0 }]
  );
  const [suppliers, setSuppliers] = useState<SupplierOption[]>(initialSuppliers);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(buyToEdit?.supplierId ?? "");

  // Inline new supplier form (Updated Fields)
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierContact1, setNewSupplierContact1] = useState("");
  const [newSupplierContact2, setNewSupplierContact2] = useState("");
  const [newSupplierGoodsType, setNewSupplierGoodsType] = useState("");
  const [creatingSupplier, setCreatingSupplier] = useState(false);
  const [supplierError, setSupplierError] = useState<string | null>(null);

  const addItem = () => setItems([...items, { name: "", amount: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof BuyItem, value: string | number) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: field === "amount" ? Number(value) : value };
    setItems(updated);
  };

  const totalAmount = items.reduce((sum, it) => sum + Number(it.amount || 0), 0);

  const [state, submitAction, isPending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      formData.set("itemsJson", JSON.stringify(items));
      formData.set("totalAmount", String(totalAmount));
      formData.set("shopId", activeShopId);
      formData.set("supplierId", selectedSupplierId);
      return await saveBuyAction(prev, formData);
    },
    { success: false }
  );

  useEffect(() => { if (state?.success) onSuccess(); }, [state?.success, onSuccess]);

  const handleSupplierChange = (value: string) => {
    if (value === "__other__") {
      setShowNewSupplier(true);
      setSelectedSupplierId("");
    } else {
      setSelectedSupplierId(value);
      setShowNewSupplier(false);
    }
  };

  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim() || !newSupplierContact1.trim()) {
      setSupplierError("Name and Primary Contact are required");
      return;
    }
    setCreatingSupplier(true);
    setSupplierError(null);
    const fd = new FormData();
    fd.set("name", newSupplierName.trim());
    fd.set("contact1", newSupplierContact1.trim());
    fd.set("contact2", newSupplierContact2.trim());
    fd.set("goodsType", newSupplierGoodsType.trim());
    fd.set("shopId", activeShopId);

    const res = await createSupplierAction(fd);
    setCreatingSupplier(false);
    if (res.success && res.supplierId) {
      const newSupplier = { id: res.supplierId, name: newSupplierName.trim() };
      setSuppliers([...suppliers, newSupplier]);
      setSelectedSupplierId(res.supplierId);
      setShowNewSupplier(false);
      setNewSupplierName("");
      setNewSupplierContact1("");
      setNewSupplierContact2("");
      setNewSupplierGoodsType("");
    } else {
      setSupplierError(res.error ?? "Failed to create supplier");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
      <div className="w-full max-w-[380px] md:max-w-[520px] lg:max-w-[680px] h-full bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center gap-4 border-b px-6 py-5 bg-gradient-to-r from-green-50 to-white">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><ArrowLeft size={26} /></button>
          <h2 className="text-xl font-semibold flex items-center gap-3">
            {isView ? <><Eye size={24} className="text-gray-600" /> View Purchase</>
              : isEdit ? "Edit Purchase"
              : <><ShoppingBag size={22} className="text-green-600" /> Buy Items</>}
          </h2>
        </div>

        <form ref={formRef} action={submitAction} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {buyToEdit?.id && <input type="hidden" name="buyId" value={buyToEdit.id} />}

          {state?.error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-2xl text-center font-medium">
              {state.error}
            </div>
          )}

          {/* SHOP INFO */}
          <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
            <Store size={16} className="text-green-600 shrink-0" />
            <div>
              <div className="text-xs text-green-600 font-medium">Shop</div>
              <div className="font-semibold text-green-900">{activeShopName}</div>
            </div>
          </div>

          {/* SUPPLIER SELECTION */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Supplier:</label>
            {isView ? (
              <input readOnly value={suppliers.find(s => s.id === selectedSupplierId)?.name ?? ""} className="w-full border border-gray-300 rounded-2xl px-5 py-3.5 bg-gray-50" />
            ) : (
              <>
                <select
                  value={showNewSupplier ? "__other__" : selectedSupplierId}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  required={!showNewSupplier}
                  className="w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base"
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                  <option value="__other__">➕ Add new supplier...</option>
                </select>

                {showNewSupplier && (
                  <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-green-700"><UserPlus size={16} /> New Supplier</div>
                    {supplierError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{supplierError}</div>}
                    
                    <input value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} placeholder="Name *" className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm" />
                    
                    <div className="grid grid-cols-2 gap-2">
                        <input value={newSupplierContact1} onChange={(e) => setNewSupplierContact1(e.target.value)} placeholder="Contact 1 *" className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm" />
                        <input value={newSupplierContact2} onChange={(e) => setNewSupplierContact2(e.target.value)} placeholder="Contact 2" className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm" />
                    </div>

                    <input value={newSupplierGoodsType} onChange={(e) => setNewSupplierGoodsType(e.target.value)} placeholder="Goods Type (e.g. Hardware)" className="w-full border border-gray-300 rounded-xl px-4 py-2 text-sm" />

                    <div className="flex gap-2">
                      <button type="button" onClick={handleCreateSupplier} disabled={creatingSupplier} className="flex-1 bg-green-600 text-white py-2 text-sm font-semibold rounded-xl">
                        {creatingSupplier ? "Saving..." : "Save Supplier"}
                      </button>
                      <button type="button" onClick={() => setShowNewSupplier(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-xl">Cancel</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* ITEMS SECTION */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Products / Goods:</label>
              {!isView && (
                <button type="button" onClick={addItem} className="text-green-600 flex items-center gap-1 text-sm font-medium"><Plus size={16} /> Add Item</button>
              )}
            </div>
            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <input value={item.name} onChange={(e) => updateItem(i, "name", e.target.value)} readOnly={isView} placeholder="Item name" className="flex-1 border border-gray-300 rounded-xl px-4 py-3 text-sm" />
                  <input value={item.amount} onChange={(e) => updateItem(i, "amount", e.target.value)} readOnly={isView} type="number" placeholder="Amount" className="w-32 border border-gray-300 rounded-xl px-4 py-3 text-sm" />
                  {!isView && items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="text-red-500"><Trash2 size={18} /></button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* TRANSPORT & STATUS */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Transport Cost:</label>
              <input name="transportCost" type="number" defaultValue={buyToEdit?.transportCost || 0} readOnly={isView} className="w-full border border-gray-300 rounded-xl px-4 py-3" />
            </div>
            <div>
              <label className="block text-sm font-medium">Status:</label>
              <select name="status" defaultValue={buyToEdit?.status || "pending"} disabled={isView} className="w-full border border-gray-300 rounded-xl px-4 py-3">
                <option value="pending">Pending</option>
                <option value="shipped">Shipped</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {!isView && (
            <button type="submit" disabled={isPending} className="w-full bg-green-600 text-white py-4 text-xl font-semibold rounded-2xl">
              {isPending ? <Loader2 size={24} className="animate-spin m-auto" /> : isEdit ? "Update Purchase" : "Confirm Buy"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}