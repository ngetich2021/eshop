"use client";

import { ArrowLeft, Loader2, Eye, Banknote } from "lucide-react";
import { useRef, useEffect } from "react";
import { useActionState } from "react";
import { savePayrollAction } from "./actions";

type ActionResult = { success: boolean; error?: string };
type StaffOption = { id: string; fullName: string };
type ShopOption = { id: string; name: string };
type PayrollToEdit = { id: string; staffId: string; salary: number; payable: number; status: string; shopId: string };

type Props = {
  mode: "add" | "edit" | "view";
  payrollToEdit?: PayrollToEdit | null;
  staffList: StaffOption[];
  shops: ShopOption[];
  onSuccess: () => void;
  onClose: () => void;
};

export default function PayrollFormSideSheet({ mode, payrollToEdit, staffList, shops, onSuccess, onClose }: Props) {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const formRef = useRef<HTMLFormElement>(null);

  const [state, submitAction, isPending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => await savePayrollAction(prev, formData),
    { success: false }
  );
  useEffect(() => { if (state?.success) onSuccess(); }, [state?.success, onSuccess]);

  const inputCls = () =>
    `w-full border rounded-2xl px-5 py-3.5 text-base transition-colors outline-none ${
      isView ? "border-gray-200 bg-gray-50 cursor-not-allowed text-gray-600"
             : "border-gray-200 bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
    }`;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-[420px] md:max-w-[540px] lg:max-w-[680px] h-full bg-white shadow-2xl flex flex-col">
        <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-white">
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-white transition-colors shadow-sm border border-gray-100">
            <ArrowLeft size={22} />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-xl">
              {isView ? <Eye size={20} className="text-indigo-600" /> : <Banknote size={20} className="text-indigo-600" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {isView ? "View Payroll" : isEdit ? "Edit Payroll" : "Add Payroll"}
              </h2>
              <p className="text-xs text-gray-500">
                {isView ? "Payroll details" : isEdit ? "Update payroll record" : "Create new payroll record"}
              </p>
            </div>
          </div>
        </div>

        <form ref={formRef} action={submitAction} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {payrollToEdit?.id && <input type="hidden" name="payrollId" value={payrollToEdit.id} />}

          {state?.error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm font-medium">
              ⚠️ {state.error}
            </div>
          )}

          {/* STAFF */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">Staff Member</label>
            {isEdit ? (
              <div className={inputCls()}>
                {staffList.find((s) => s.id === payrollToEdit?.staffId)?.fullName}
                <input type="hidden" name="staffId" value={payrollToEdit?.staffId} />
              </div>
            ) : (
              <select name="staffId" defaultValue={payrollToEdit?.staffId || ""} required disabled={isView} className={inputCls()}>
                <option value="">Select staff member</option>
                {staffList.map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
              </select>
            )}
          </div>

          {/* SHOP */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">Shop</label>
            <select name="shopId" defaultValue={payrollToEdit?.shopId || ""} required disabled={isView} className={inputCls()}>
              <option value="">Select shop</option>
              {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* SALARY + PAYABLE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">Gross Salary (KSh)</label>
              <input name="salary" type="number" defaultValue={payrollToEdit?.salary || ""} required readOnly={isView}
                placeholder="0" className={inputCls()} />
            </div>
            <div>
              <label className="block mb-2 text-sm font-semibold text-gray-700">Payable (KSh)</label>
              <input name="payable" type="number" defaultValue={payrollToEdit?.payable || ""} required readOnly={isView}
                placeholder="0" className={inputCls()} />
            </div>
          </div>

          {/* DEDUCTIONS INFO */}
          {!isView && (
            <div className="bg-indigo-50 rounded-2xl px-4 py-3 text-xs text-indigo-700">
              💡 Payable = Salary after deductions (NHIF, NSSF, tax, advances, etc.)
            </div>
          )}

          {/* STATUS */}
          <div>
            <label className="block mb-2 text-sm font-semibold text-gray-700">Status</label>
            <select name="status" defaultValue={payrollToEdit?.status || "pending"} disabled={isView} className={inputCls()}>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>

          {!isView && (
            <button type="submit" disabled={isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white py-4 text-base font-bold rounded-2xl flex items-center justify-center gap-2 transition-colors shadow-sm mt-4">
              {isPending ? <Loader2 size={20} className="animate-spin" /> : isEdit ? "Update Payroll" : "Save Payroll"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}