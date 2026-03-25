// app/shops/_components/ShopFormModal.tsx
"use client";

import { useEffect } from "react";
import { useActionState } from "react";
import { saveShopAction } from "./actions";

type ActionState = { success?: boolean; error?: string };
type Mode = "add" | "edit" | "view";

interface Shop {
  id?: string;
  name: string;
  tel: string;
  location: string;
}

interface Props {
  mode: Mode;
  shop?: Shop;
  onSuccess: () => void;
  onClose: () => void;
}

export default function ShopFormModal({ mode, shop, onSuccess, onClose }: Props) {
  const isView = mode === "view";

  const [state, submitAction, isPending] = useActionState<ActionState, FormData>(
    async (_, formData) => await saveShopAction(formData),
    { success: false }
  );

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state?.success, onSuccess]);

  return (
    <form action={submitAction} className="grid grid-cols-1 gap-7 p-8">
      <div className="text-center mb-6">
        <h3 className="text-3xl font-bold text-gray-900">
          {mode === "add" ? "Add New Shop" : mode === "edit" ? "Edit Shop" : "Shop Details"}
        </h3>
      </div>

      {state?.error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-6 py-4 rounded-2xl text-center font-semibold">
          {state.error}
        </div>
      )}

      {shop?.id && <input type="hidden" name="shopId" value={shop.id} />}

      <div>
        <label className="block text-lg font-semibold text-gray-800 mb-2">
          Shop Name <span className="text-red-600">*</span>
        </label>
        <input
          required
          name="name"
          type="text"
          defaultValue={shop?.name ?? ""}
          readOnly={isView}
          className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-300 rounded-2xl disabled:bg-gray-100 focus:border-blue-500"
          placeholder="e.g. Supreme Electronics"
        />
      </div>

      <div>
        <label className="block text-lg font-semibold text-gray-800 mb-2">
          Telephone <span className="text-red-600">*</span>
        </label>
        <input
          required
          name="tel"
          type="tel"
          defaultValue={shop?.tel ?? ""}
          readOnly={isView}
          className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-300 rounded-2xl disabled:bg-gray-100 focus:border-blue-500"
          placeholder="+254 712 345 678"
        />
      </div>

      <div>
        <label className="block text-lg font-semibold text-gray-800 mb-2">
          Location <span className="text-red-600">*</span>
        </label>
        <input
          required
          name="location"
          type="text"
          defaultValue={shop?.location ?? ""}
          readOnly={isView}
          className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-300 rounded-2xl disabled:bg-gray-100 focus:border-blue-500"
          placeholder="e.g. Nairobi CBD, Kenya"
        />
      </div>

      <div className="mt-8 flex gap-4">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold text-xl py-5 rounded-2xl transition"
        >
          Cancel
        </button>

        {!isView && (
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold text-xl py-5 rounded-2xl transition"
          >
            {isPending ? "Saving..." : mode === "add" ? "Add Shop" : "Update Shop"}
          </button>
        )}
      </div>
    </form>
  );
}