"use client";

import { ArrowLeft, Loader2, Eye } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { saveStaffAction } from "./actions";

type ActionResult = { success: boolean; error?: string };

type UserOption = { id: string; fullName: string; email?: string };
type ShopOption = { id: string; name: string };

type StaffToEdit = {
  id: string;
  userId: string;
  fullName: string;
  tel1: string;
  tel2: string | null;
  mpesaNo: string | null;
  baseSalary: number;
  shopId: string;
};

type Mode = "add" | "edit" | "view";

type Props = {
  mode: Mode;
  staffToEdit?: StaffToEdit | null;
  users: UserOption[];
  shops: ShopOption[];
  onSuccess: () => void;
  onClose: () => void;
};

export default function StaffFormSideSheet({
  mode,
  staffToEdit,
  users,
  shops,
  onSuccess,
  onClose,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const isView = mode === "view";
  const isEdit = mode === "edit";

  const [state, submitAction, isPending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => await saveStaffAction(prev, formData),
    { success: false }
  );

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state?.success, onSuccess]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
      {/* Side sheet container — exact responsive widths from PDF */}
      <div className="w-full max-w-[380px] md:max-w-[520px] lg:max-w-[680px] h-full bg-white shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header — matches PDF on all devices */}
        <div className="flex items-center gap-4 border-b px-6 py-5">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={26} />
          </button>
          <h2 className="text-2xl font-semibold flex items-center gap-3">
            {isView ? (
              <>
                <Eye size={28} className="text-gray-600" /> View Staff
              </>
            ) : isEdit ? (
              "Edit Staff"
            ) : (
              "Add Staff"
            )}
          </h2>
        </div>

        <form
          ref={formRef}
          action={submitAction}
          className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 space-y-8"
        >
          {staffToEdit?.id && <input type="hidden" name="staffId" value={staffToEdit.id} />}

          {state?.error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-2xl text-center font-medium">
              {state.error}
            </div>
          )}

          {/* USER (disabled on edit — exact PDF behavior) */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">User (role = user):</label>
            {isEdit ? (
              <div className="w-full border border-gray-300 rounded-2xl px-5 py-3.5 bg-gray-50 text-gray-600 text-base">
                {users.find((u) => u.id === staffToEdit?.userId)?.fullName || "Current User"}
                <input type="hidden" name="userId" value={staffToEdit?.userId} />
              </div>
            ) : (
              <select
                name="userId"
                defaultValue={staffToEdit?.userId || ""}
                required
                disabled={isView}
                className={`w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`}
              >
                <option value="">Select user</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} {u.email ? `(${u.email})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* SHOP */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Shop:</label>
            <select
              name="shopId"
              defaultValue={staffToEdit?.shopId || ""}
              required
              disabled={isView}
              className={`w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`}
            >
              <option value="">Select shop</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* FULL NAME */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Full Name:</label>
            <input
              name="fullName"
              defaultValue={staffToEdit?.fullName || ""}
              required
              readOnly={isView}
              className={`w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`}
            />
          </div>

          {/* TEL 1 + TEL 2 — 2-column on tablet/desktop, stacked on mobile (exact PDF) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Tel 1 (Kenyan):</label>
              <input
                name="tel1"
                defaultValue={staffToEdit?.tel1 || ""}
                required
                readOnly={isView}
                className={`w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`}
              />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Tel 2 (optional):</label>
              <input
                name="tel2"
                defaultValue={staffToEdit?.tel2 || ""}
                readOnly={isView}
                className={`w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`}
              />
            </div>
          </div>

          {/* MPESA + BASE SALARY — 2-column on tablet/desktop */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">
                M-Pesa Registered Tel No: (for receiving money)
              </label>
              <input
                name="mpesaNo"
                defaultValue={staffToEdit?.mpesaNo || ""}
                required
                readOnly={isView}
                className={`w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`}
              />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Base Salary (KSh):</label>
              <input
                name="baseSalary"
                type="number"
                defaultValue={staffToEdit?.baseSalary || 0}
                min="0"
                required
                readOnly={isView}
                className={`w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`}
              />
            </div>
          </div>

          {/* GREEN SUBMIT BUTTON — exact position & style from PDF */}
          {!isView && (
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-4 text-xl font-semibold rounded-2xl mt-8 transition-colors flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  Saving...
                </>
              ) : isEdit ? (
                "Update Staff"
              ) : (
                "Add Staff"
              )}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}