"use client";

import { ArrowLeft, Loader2, Eye } from "lucide-react";
import { useEffect, useRef } from "react";
import { useActionState } from "react";
import { saveStaffAction } from "./actions";

type ActionResult = { success: boolean; error?: string };

type UserOption = { id: string; fullName: string; email?: string };

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
  activeShopId: string;
  activeShopName: string;
  onSuccess: () => void;
  onClose: () => void;
};

const initialState: ActionResult = { success: false };

export default function StaffFormSideSheet({
  mode, staffToEdit, users, activeShopId, activeShopName, onSuccess, onClose,
}: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const isView  = mode === "view";
  const isEdit  = mode === "edit";

  // Pass saveStaffAction directly — no anonymous async wrapper (Turbopack fix)
  const [state, submitAction, isPending] = useActionState<ActionResult, FormData>(
    saveStaffAction,
    initialState
  );

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state?.success, onSuccess]);

  const fieldCls = (extra = "") =>
    `w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${
      isView ? "bg-gray-50 cursor-not-allowed text-gray-600" : "focus:border-green-500 outline-none"
    } ${extra}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
      <div className="w-full max-w-[380px] md:max-w-[520px] lg:max-w-[680px] h-full bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-4 border-b px-6 py-5">
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={26} />
          </button>
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-3">
              {isView ? <><Eye size={24} className="text-gray-500" /> View Staff</> :
               isEdit ? "Edit Staff" : "Add Staff"}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Shop: <span className="font-medium text-gray-700">{activeShopName}</span>
            </p>
          </div>
        </div>

        <form
          ref={formRef}
          action={submitAction}
          className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 space-y-7"
        >
          {/* Hidden fields */}
          {staffToEdit?.id && <input type="hidden" name="staffId" value={staffToEdit.id} />}
          <input type="hidden" name="shopId" value={activeShopId} />

          {state?.error && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium">
              {state.error}
            </div>
          )}

          {/* USER — disabled on edit/view */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">
              User <span className="text-gray-400 font-normal">(role will become staff)</span>
            </label>
            {isEdit ? (
              <div className={fieldCls()}>
                {users.find((u) => u.id === staffToEdit?.userId)?.fullName || "Current User"}
                <input type="hidden" name="userId" value={staffToEdit?.userId} />
              </div>
            ) : (
              <select
                name="userId"
                defaultValue={staffToEdit?.userId || ""}
                required
                disabled={isView}
                className={fieldCls()}
              >
                <option value="">Select user…</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}{u.email ? ` (${u.email})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* FULL NAME */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Full Name</label>
            <input
              name="fullName"
              defaultValue={staffToEdit?.fullName || ""}
              required
              readOnly={isView}
              className={fieldCls()}
            />
          </div>

          {/* TEL 1 + TEL 2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Tel 1</label>
              <input
                name="tel1"
                defaultValue={staffToEdit?.tel1 || ""}
                required
                readOnly={isView}
                placeholder="07xxxxxxxx"
                className={fieldCls()}
              />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">
                Tel 2 <span className="text-gray-400">(optional)</span>
              </label>
              <input
                name="tel2"
                defaultValue={staffToEdit?.tel2 || ""}
                readOnly={isView}
                placeholder="07xxxxxxxx"
                className={fieldCls()}
              />
            </div>
          </div>

          {/* MPESA + BASE SALARY */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">
                M-Pesa No <span className="text-gray-400 font-normal text-xs">(for payments)</span>
              </label>
              <input
                name="mpesaNo"
                defaultValue={staffToEdit?.mpesaNo || ""}
                required
                readOnly={isView}
                placeholder="07xxxxxxxx"
                className={fieldCls()}
              />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">
                Base Salary (KSh)
              </label>
              <input
                name="baseSalary"
                type="number"
                defaultValue={staffToEdit?.baseSalary ?? 0}
                min="0"
                required
                readOnly={isView}
                className={fieldCls()}
              />
            </div>
          </div>

          {/* Shop display (read-only info) */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Shop</label>
            <div className={fieldCls()}>{activeShopName}</div>
          </div>

          {!isView && (
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-4 text-lg font-semibold rounded-2xl mt-4 transition-colors flex items-center justify-center gap-2"
            >
              {isPending
                ? <><Loader2 size={22} className="animate-spin" /> Saving…</>
                : isEdit ? "Update Staff" : "Add Staff"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}