// app/staff/advance/_components/AdvanceFormSideSheet.tsx
"use client";

import { ArrowLeft, Loader2, Eye, TrendingUp, Info } from "lucide-react";
import { useRef, useEffect, useState, useTransition } from "react";
import { useActionState } from "react";
import { getAvailableAdvanceAction, saveAdvanceAction } from "./actions";

type ActionResult = { success: boolean; error?: string };

type AdvanceToEdit = {
  id: string;
  staffId: string;
  staffName: string;
  amount: number;
  date: string;
  reason: string | null;
  status: string;
  shopId: string;
  baseSalary: number;
};

type CurrentStaff = {
  id: string;
  fullName: string;
  baseSalary: number;
};

type Props = {
  mode: "add" | "edit" | "view";
  advanceToEdit?: AdvanceToEdit | null;
  shopId: string;
  isManager: boolean;
  currentStaff?: CurrentStaff | null;   // The logged-in user's staff record
  onSuccess: () => void;
  onClose: () => void;
};

export default function AdvanceFormSideSheet({
  mode,
  advanceToEdit,
  shopId,
  isManager,
  currentStaff,
  onSuccess,
  onClose,
}: Props) {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const formRef = useRef<HTMLFormElement>(null);

  // For view/edit: show the staff the advance belongs to
  // For add: always use the current logged-in user's staff record
  const displayStaff = (isEdit || isView) && advanceToEdit
    ? { id: advanceToEdit.staffId, fullName: advanceToEdit.staffName, baseSalary: advanceToEdit.baseSalary }
    : currentStaff;

  const [availableInfo, setAvailableInfo] = useState<{
    maxAdvance: number;
    taken: number;
    available: number;
    baseSalary: number;
  } | null>(null);
  const [loadingInfo, startLoading] = useTransition();

  const [state, submitAction, isPending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      formData.set("shopId", shopId);
      const res = await saveAdvanceAction(prev, formData);
      return res;
    },
    { success: false }
  );

  useEffect(() => {
    if (state?.success) onSuccess();
  }, [state?.success, onSuccess]);

  // Load available advance info
  useEffect(() => {
    const staffId = displayStaff?.id;
    if (!staffId) return;
    startLoading(async () => {
      const info = await getAvailableAdvanceAction(staffId, shopId, advanceToEdit?.id);
      setAvailableInfo(info);
    });
  }, [displayStaff?.id, shopId, advanceToEdit?.id]);

  const inputCls = (extra = "") =>
    `w-full border rounded-2xl px-5 py-3.5 text-base transition-colors outline-none ${
      isView
        ? "border-gray-200 bg-gray-50 cursor-not-allowed text-gray-600"
        : "border-gray-200 bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
    } ${extra}`;

  // No staff record = can't request
  if (!isView && !isEdit && !currentStaff) {
    return (
      <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
        <div className="w-full max-w-[380px] md:max-w-[520px] h-full bg-white shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center gap-4 px-6 py-5 border-b">
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 border border-gray-100">
              <ArrowLeft size={22} />
            </button>
            <h2 className="text-lg font-bold text-gray-900">Request Advance</h2>
          </div>
          <div className="flex-1 flex items-center justify-center p-8 text-center">
            <div>
              <div className="text-4xl mb-4">🚫</div>
              <p className="text-gray-600 font-medium">No staff record found</p>
              <p className="text-sm text-gray-400 mt-2">
                You must be registered as a staff member in this shop to request an advance.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-[380px] md:max-w-[520px] lg:max-w-[680px] h-full bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-white">
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white transition-colors shadow-sm border border-gray-100"
          >
            <ArrowLeft size={22} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              {isView ? <Eye size={20} className="text-blue-600" /> : <TrendingUp size={20} className="text-blue-600" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {isView ? "View Advance" : isEdit ? "Edit Advance" : "Request Advance"}
              </h2>
              <p className="text-xs text-gray-500">
                {isView ? "Advance request details"
                  : isEdit ? "Update advance request"
                  : "Max 40% of monthly salary"}
              </p>
            </div>
          </div>
        </div>

        <form ref={formRef} action={submitAction} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {advanceToEdit?.id && (
            <input type="hidden" name="advanceId" value={advanceToEdit.id} />
          )}

          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium">
              ⚠️ {state.error}
            </div>
          )}

          {/* STAFF — always read-only, always current user (or advance owner for view/edit) */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">Staff Member</label>
            <div className={inputCls("bg-blue-50 border-blue-200")}>
              {displayStaff?.fullName ?? "—"}
              {displayStaff?.baseSalary
                ? ` — KSh ${displayStaff.baseSalary.toLocaleString()} salary`
                : ""}
            </div>
            {/* Hidden staffId not needed here — server resolves from session for new requests */}
          </div>

          {/* ADVANCE INFO BANNER */}
          {displayStaff && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
                <Info size={16} /> Advance Allowance (This Month)
              </div>
              {loadingInfo ? (
                <div className="flex items-center gap-2 text-xs text-blue-600">
                  <Loader2 size={14} className="animate-spin" /> Loading...
                </div>
              ) : availableInfo ? (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Base Salary</div>
                    <div className="font-bold text-gray-900 text-sm">KSh {availableInfo.baseSalary.toLocaleString()}</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 text-center shadow-sm">
                    <div className="text-xs text-gray-500 mb-1">Max (40%)</div>
                    <div className="font-bold text-blue-700 text-sm">KSh {availableInfo.maxAdvance.toLocaleString()}</div>
                  </div>
                  <div className={`rounded-xl p-3 text-center shadow-sm ${availableInfo.available > 0 ? "bg-green-50" : "bg-red-50"}`}>
                    <div className="text-xs text-gray-500 mb-1">Available</div>
                    <div className={`font-bold text-sm ${availableInfo.available > 0 ? "text-green-700" : "text-red-600"}`}>
                      KSh {availableInfo.available.toLocaleString()}
                    </div>
                  </div>
                </div>
              ) : null}
              {availableInfo && availableInfo.taken > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
                  ⚡ KSh {availableInfo.taken.toLocaleString()} already taken this month
                </p>
              )}
            </div>
          )}

          {/* AMOUNT + DATE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">Amount (KSh)</label>
              <input
                name="amount"
                type="number"
                defaultValue={advanceToEdit?.amount || ""}
                required
                readOnly={isView}
                placeholder="0"
                max={availableInfo?.available}
                className={inputCls()}
              />
              {availableInfo && !isView && (
                <p className="text-xs text-gray-500 mt-1">Max: KSh {availableInfo.available.toLocaleString()}</p>
              )}
            </div>
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">Date</label>
              <input
                name="date"
                type="date"
                defaultValue={advanceToEdit?.date || new Date().toISOString().split("T")[0]}
                required
                readOnly={isView}
                className={inputCls()}
              />
            </div>
          </div>

          {/* REASON */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">Reason</label>
            <textarea
              name="reason"
              defaultValue={advanceToEdit?.reason || ""}
              readOnly={isView}
              placeholder="e.g. school fees, medical emergency..."
              rows={3}
              className={inputCls("resize-none")}
            />
          </div>

          {/* STATUS — only managers can update */}
          {(isView || (isEdit && isManager)) && (
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">Status</label>
              <select
                name="status"
                defaultValue={advanceToEdit?.status || "requested"}
                disabled={isView || !isManager}
                className={inputCls()}
              >
                <option value="requested">Requested</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="paid">Paid</option>
              </select>
            </div>
          )}

          {!isView && (
            <button
              type="submit"
              disabled={isPending || (!isEdit && (availableInfo?.available ?? 1) === 0)}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-4 text-base font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-sm mt-4"
            >
              {isPending ? (
                <Loader2 size={20} className="animate-spin" />
              ) : isEdit ? "Update Advance" : "Request Advance"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}