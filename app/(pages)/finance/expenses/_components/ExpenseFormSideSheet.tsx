// app/expense/_components/ExpenseFormSideSheet.tsx
"use client";

import { ArrowLeft, Loader2, Eye, Wallet } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { useActionState } from "react";
import { saveExpenseAction } from "./actions";

type ActionResult = { success: boolean; error?: string };

type ExpenseToEdit = {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  paidById: string;
  shopId: string;
};

type Props = {
  mode: "add" | "edit" | "view";
  expenseToEdit?: ExpenseToEdit | null;
  shopId: string;
  walletBalance: number;
  currentUserName: string;
  onSuccess: () => void;
  onClose: () => void;
};

const PRESET_CATEGORIES = [
  "Food & Drinks",
  "Transport",
  "Utilities",
  "Rent",
  "Supplies",
  "Maintenance",
  "Marketing",
  "Staff Welfare",
  "Others",
];

export default function ExpenseFormSideSheet({
  mode,
  expenseToEdit,
  shopId,
  walletBalance,
  currentUserName,
  onSuccess,
  onClose,
}: Props) {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const formRef = useRef<HTMLFormElement>(null);

  const [categorySelection, setCategorySelection] = useState<string>(
    expenseToEdit?.category ?? ""
  );
  const [customCategory, setCustomCategory] = useState("");

  const isCustom = categorySelection === "Others";
  const effectiveCategory = isCustom ? customCategory : categorySelection;

  const [state, submitAction, isPending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      formData.set("shopId", shopId);
      // Override category with the effective value
      formData.set("category", effectiveCategory);
      return await saveExpenseAction(prev, formData);
    },
    { success: false }
  );

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state?.success, onSuccess]);

  const inputCls = `w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base`;
  const viewCls = `${inputCls} bg-gray-50 cursor-not-allowed`;
  const editCls = `${inputCls} focus:border-green-400 focus:ring-2 focus:ring-green-100 outline-none`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
      <div className="w-full max-w-[380px] md:max-w-[520px] lg:max-w-[680px] h-full bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center gap-4 border-b px-6 py-5">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={26} />
          </button>
          <h2 className="text-2xl font-semibold flex items-center gap-3">
            {isView ? (
              <><Eye size={28} className="text-gray-600" /> View Expense</>
            ) : isEdit ? "Edit Expense" : "Add Expense"}
          </h2>
        </div>

        <form
          ref={formRef}
          action={submitAction}
          className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 space-y-8"
        >
          {expenseToEdit?.id && (
            <input type="hidden" name="expenseId" value={expenseToEdit.id} />
          )}

          {/* Wallet balance info */}
          {!isView && (
            <div
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${
                walletBalance > 0
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <Wallet size={18} className={walletBalance > 0 ? "text-emerald-600" : "text-red-600"} />
              <div>
                <p className={`text-sm font-semibold ${walletBalance > 0 ? "text-emerald-700" : "text-red-700"}`}>
                  Wallet Balance: KSh {walletBalance.toLocaleString()}
                </p>
                {walletBalance <= 0 && (
                  <p className="text-xs text-red-600 mt-0.5">No funds available</p>
                )}
              </div>
            </div>
          )}

          {state?.error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-2xl text-center font-medium">
              {state.error}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Description:</label>
            <input
              name="description"
              defaultValue={expenseToEdit?.description || ""}
              required
              readOnly={isView}
              placeholder="e.g. lunch for the team"
              className={isView ? viewCls : editCls}
            />
          </div>

          {/* Amount + Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Amount (KSh):</label>
              <input
                name="amount"
                type="number"
                defaultValue={expenseToEdit?.amount || ""}
                required
                readOnly={isView}
                max={walletBalance}
                className={isView ? viewCls : editCls}
              />
              {!isView && (
                <p className="text-xs text-gray-500 mt-1">
                  Max: KSh {walletBalance.toLocaleString()}
                </p>
              )}
            </div>

            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Category:</label>
              {isView ? (
                <input
                  readOnly
                  value={expenseToEdit?.category || "—"}
                  className={viewCls}
                />
              ) : (
                <>
                  <select
                    value={categorySelection}
                    onChange={(e) => {
                      setCategorySelection(e.target.value);
                      setCustomCategory("");
                    }}
                    className={editCls}
                  >
                    <option value="">Select category</option>
                    {PRESET_CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {isCustom && (
                    <input
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Type custom category..."
                      className={`${editCls} mt-2`}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Spent By — always session user, read-only display */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Spent By:</label>
            <input
              readOnly
              value={currentUserName}
              className={`${inputCls} bg-blue-50 border-blue-200 cursor-not-allowed text-blue-800 font-medium`}
            />
            <p className="text-xs text-gray-500 mt-1">Automatically recorded as you (signed-in user)</p>
          </div>

          {!isView && (
            <button
              type="submit"
              disabled={isPending || walletBalance <= 0}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-4 text-xl font-semibold rounded-2xl flex items-center justify-center gap-2"
            >
              {isPending ? (
                <Loader2 size={24} className="animate-spin" />
              ) : isEdit ? "Update Expense" : "Add Expense"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}