"use client";

import { ArrowLeft, Loader2, Eye, Store, Phone, Box } from "lucide-react";
import { useRef, useEffect, useActionState } from "react";
import { saveSupplierAction } from "./actions";


type ActionResult = { success: boolean; error?: string };

type SupplierToEdit = {
  id: string;
  name: string;
  contact1: string;
  contact2: string | null;
  goodsType: string | null;
};

type Props = {
  mode: "add" | "edit" | "view";
  supplierToEdit?: SupplierToEdit | null;
  activeShopId: string;
  activeShopName: string;
  onSuccess: () => void;
  onClose: () => void;
};

export default function SupplierFormSideSheet({ mode, supplierToEdit, activeShopId, activeShopName, onSuccess, onClose }: Props) {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const formRef = useRef<HTMLFormElement>(null);

  const [state, submitAction, isPending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      formData.set("shopId", activeShopId); // Ensure shopId is passed even if not in visible input
      return await saveSupplierAction(prev, formData);
    },
    { success: false }
  );

  useEffect(() => { if (state?.success) onSuccess(); }, [state?.success, onSuccess]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-[480px] h-full bg-white shadow-2xl flex flex-col">
        <div className="flex items-center gap-4 border-b px-6 py-5 bg-gray-50/50">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white border border-transparent hover:border-gray-200 transition-all">
            <ArrowLeft size={22} />
          </button>
          <h2 className="text-xl font-bold text-gray-900">
            {isView ? "Supplier Details" : isEdit ? "Update Supplier" : "Add New Supplier"}
          </h2>
        </div>

        <form ref={formRef} action={submitAction} className="flex-1 overflow-y-auto p-6 space-y-6">
          {supplierToEdit?.id && <input type="hidden" name="supplierId" value={supplierToEdit.id} />}

          {/* SHOP CONTEXT (READ ONLY) */}
          <div className="flex items-center gap-3 rounded-xl border border-green-100 bg-green-50/50 px-4 py-3">
            <Store size={18} className="text-green-600" />
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-green-600">Registering To</p>
              <p className="text-sm font-semibold text-green-900">{activeShopName}</p>
            </div>
          </div>

          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-medium">
              {state.error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight mb-1">Business Name</label>
              <input name="name" defaultValue={supplierToEdit?.name || ""} required readOnly={isView} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500/20 outline-none" placeholder="Enter supplier name" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight mb-1 flex items-center gap-1">
                <Box size={12} /> Goods Provided
              </label>
              <input name="goodsType" defaultValue={supplierToEdit?.goodsType || ""} readOnly={isView} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500/20 outline-none" placeholder="e.g. Hardware, Groceries, Electronics" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight mb-1 flex items-center gap-1">
                  <Phone size={12} /> Contact 1
                </label>
                <input name="contact1" defaultValue={supplierToEdit?.contact1 || ""} required readOnly={isView} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500/20 outline-none" placeholder="Required" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-tight mb-1">Contact 2</label>
                <input name="contact2" defaultValue={supplierToEdit?.contact2 || ""} readOnly={isView} className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-green-500/20 outline-none" placeholder="Optional" />
              </div>
            </div>
          </div>

          {!isView && (
            <button type="submit" disabled={isPending} className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white py-4 rounded-xl font-bold shadow-lg shadow-green-600/20 transition-all flex items-center justify-center gap-2">
              {isPending ? <Loader2 size={20} className="animate-spin" /> : isEdit ? "Save Changes" : "Register Supplier"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}