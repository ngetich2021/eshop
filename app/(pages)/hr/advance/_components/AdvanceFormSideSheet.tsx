"use client";

import { ArrowLeft, Loader2, Eye } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { saveAdvanceAction } from "./actions";

type ActionResult = { success: boolean; error?: string };

type StaffOption = { id: string; fullName: string };
type ShopOption = { id: string; name: string };

type AdvanceToEdit = {
  id: string;
  staffId: string;
  amount: number;
  date: string;
  reason: string | null;
  status: string;
  transactionCode: string | null;
  shopId: string;
};

type Mode = "add" | "edit" | "view";

type Props = {
  mode: Mode;
  advanceToEdit?: AdvanceToEdit | null;
  staffList: StaffOption[];
  shops: ShopOption[];
  onSuccess: () => void;
  onClose: () => void;
};

export default function AdvanceFormSideSheet({
  mode,
  advanceToEdit,
  staffList,
  shops,
  onSuccess,
  onClose,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const isView = mode === "view";
  const isEdit = mode === "edit";

  const [state, submitAction, isPending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => await saveAdvanceAction(prev, formData),
    { success: false }
  );

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state?.success, onSuccess]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
      <div className="w-full max-w-[380px] md:max-w-[520px] lg:max-w-[680px] h-full bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center gap-4 border-b px-6 py-5">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={26} />
          </button>
          <h2 className="text-2xl font-semibold flex items-center gap-3">
            {isView ? (
              <>
                <Eye size={28} className="text-gray-600" /> View Advance
              </>
            ) : isEdit ? (
              "Edit Advance"
            ) : (
              "Add Advance"
            )}
          </h2>
        </div>

        <form ref={formRef} action={submitAction} className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 space-y-8">
          {advanceToEdit?.id && <input type="hidden" name="advanceId" value={advanceToEdit.id} />}

          {state?.error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-2xl text-center font-medium">
              {state.error}
            </div>
          )}

          {/* STAFF */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Staff:</label>
            {isEdit ? (
              <div className="w-full border border-gray-300 rounded-2xl px-5 py-3.5 bg-gray-50 text-gray-600">
                {staffList.find((s) => s.id === advanceToEdit?.staffId)?.fullName}
                <input type="hidden" name="staffId" value={advanceToEdit?.staffId} />
              </div>
            ) : (
              <select name="staffId" defaultValue={advanceToEdit?.staffId || ""} required disabled={isView} className={`w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`}>
                <option value="">Select staff</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>{s.fullName}</option>
                ))}
              </select>
            )}
          </div>

          {/* SHOP */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Shop:</label>
            <select name="shopId" defaultValue={advanceToEdit?.shopId || ""} required disabled={isView} className={`w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`}>
              <option value="">Select shop</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* AMOUNT + DATE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Amount (KSh):</label>
              <input name="amount" type="number" defaultValue={advanceToEdit?.amount || ""} required readOnly={isView} className={`w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`} />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Date:</label>
              <input name="date" type="date" defaultValue={advanceToEdit?.date || ""} required readOnly={isView} className={`w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`} />
            </div>
          </div>

          {/* REASON */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Reason:</label>
            <textarea name="reason" defaultValue={advanceToEdit?.reason || ""} readOnly={isView} className={`w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base h-24 ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`} />
          </div>

          {/* STATUS + TRANSACTION CODE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Status:</label>
              <select name="status" defaultValue={advanceToEdit?.status || "requested"} disabled={isView} className={`w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`}>
                <option value="requested">Requested</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="disbursed">Disbursed</option>
              </select>
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Transaction Code:</label>
              <input name="transactionCode" defaultValue={advanceToEdit?.transactionCode || ""} readOnly={isView} className={`w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`} />
            </div>
          </div>

          {!isView && (
            <button type="submit" disabled={isPending} className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-4 text-xl font-semibold rounded-2xl mt-8 flex items-center justify-center gap-2">
              {isPending ? <Loader2 size={24} className="animate-spin" /> : isEdit ? "Update Advance" : "Add Advance"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}