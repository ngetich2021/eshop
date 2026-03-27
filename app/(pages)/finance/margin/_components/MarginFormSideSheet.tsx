// app/wallet/margins/_components/MarginFormSideSheet.tsx
"use client";

import { ArrowLeft, Loader2, Eye } from "lucide-react";
import { useRef, useEffect } from "react";
import { useActionState } from "react";
import { saveMarginAction } from "./actions";

type ActionResult = { success: boolean; error?: string };
type MarginToEdit = {
  id: string;
  date: string;
  value: number;
  profitType: string | null;
  shopId: string;
};

type Props = {
  mode: "add" | "edit" | "view";
  marginToEdit?: MarginToEdit | null;
  shopId: string;
  onSuccess: () => void;
  onClose: () => void;
};

export default function MarginFormSideSheet({
  mode,
  marginToEdit,
  shopId,
  onSuccess,
  onClose,
}: Props) {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const formRef = useRef<HTMLFormElement>(null);

  const [state, submitAction, isPending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      formData.set("shopId", shopId);
      return await saveMarginAction(prev, formData);
    },
    { success: false }
  );

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state?.success, onSuccess]);

  const inputCls = `w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
      <div className="w-full max-w-[380px] md:max-w-[520px] lg:max-w-[680px] h-full bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center gap-4 border-b px-6 py-5">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100"
          >
            <ArrowLeft size={26} />
          </button>
          <h2 className="text-2xl font-semibold flex items-center gap-3">
            {isView ? (
              <>
                <Eye size={28} className="text-gray-600" /> View Margin
              </>
            ) : isEdit ? (
              "Edit Margin"
            ) : (
              "Add Margin"
            )}
          </h2>
        </div>

        <form
          ref={formRef}
          action={submitAction}
          className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 space-y-8"
        >
          {marginToEdit?.id && (
            <input type="hidden" name="marginId" value={marginToEdit.id} />
          )}

          {state?.error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-2xl text-center font-medium">
              {state.error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">
                Date:
              </label>
              <input
                name="date"
                type="date"
                defaultValue={marginToEdit?.date || ""}
                required
                readOnly={isView}
                className={isView ? `${inputCls} bg-gray-50 cursor-not-allowed` : inputCls}
              />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">
                Value (KSh):
              </label>
              <input
                name="value"
                type="number"
                defaultValue={marginToEdit?.value || ""}
                required
                readOnly={isView}
                className={isView ? `${inputCls} bg-gray-50 cursor-not-allowed` : inputCls}
              />
            </div>
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">
              Profit Type:
            </label>
            <input
              name="profitType"
              defaultValue={marginToEdit?.profitType || ""}
              readOnly={isView}
              placeholder="e.g. gross, net"
              className={isView ? `${inputCls} bg-gray-50 cursor-not-allowed` : inputCls}
            />
          </div>

          {!isView && (
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-4 text-xl font-semibold rounded-2xl flex items-center justify-center gap-2"
            >
              {isPending ? (
                <Loader2 size={24} className="animate-spin" />
              ) : isEdit ? (
                "Update Margin"
              ) : (
                "Add Margin"
              )}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}