// app/hr/staff/_components/RoleFormModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Create / edit a Designation.
// The "allowed pages" picker now shows TOP-LEVEL NAV SECTIONS only —
// granting a section grants access to all its sub-routes automatically.
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { useState }          from "react";
import { X, ShieldCheck, Loader2, AlertCircle, ToggleLeft, ToggleRight } from "lucide-react";
import { saveRoleAction }    from "./actions";
import { NAV_SECTIONS }      from "@/lib/permissions";

type RoleRecord = { id: string; name: string; description: string; allowedRoutes: string[] };

type Props = {
  roleToEdit:   RoleRecord | null;
  activeShopId: string;
  onClose:      () => void;
  onSuccess:    () => void;
};

const RESERVED = ["user", "staff", "admin"];

function previewBadge(name: string) {
  const map: Record<string, string> = {
    manager:    "bg-purple-100 text-purple-700",
    supervisor: "bg-blue-100 text-blue-700",
    cashier:    "bg-emerald-100 text-emerald-700",
    accountant: "bg-amber-100 text-amber-700",
    sales:      "bg-pink-100 text-pink-700",
    storekeeper:"bg-orange-100 text-orange-700",
  };
  return map[name.toLowerCase()] ?? "bg-indigo-100 text-indigo-700";
}

export default function RoleFormModal({ roleToEdit, activeShopId, onClose, onSuccess }: Props) {
  const isEdit = !!roleToEdit;

  const [nameVal,     setNameVal]     = useState(roleToEdit?.name        ?? "");
  const [description, setDescription] = useState(roleToEdit?.description ?? "");
  const [isPending,   setIsPending]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  // Allowed sections: stored as the section's `prefix` string
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(roleToEdit?.allowedRoutes ?? [])
  );

  const isReserved  = RESERVED.includes(nameVal.toLowerCase().trim());
  const displayError = isReserved ? `"${nameVal}" is a reserved name` : error;

  const toggleSection = (prefix: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(prefix) ? next.delete(prefix) : next.add(prefix);
      return next;
    });

  const selectAll  = () => setSelected(new Set(NAV_SECTIONS.map((s) => s.prefix)));
  const clearAll   = () => setSelected(new Set());

  const handleSubmit = async () => {
    if (isReserved || !nameVal.trim() || !description.trim()) {
      setError("Name and description are required.");
      return;
    }
    setIsPending(true);
    setError(null);
    const res = await saveRoleAction({
      roleId:        roleToEdit?.id,
      name:          nameVal,
      description,
      shopId:        activeShopId,
      allowedRoutes: Array.from(selected),
    });
    setIsPending(false);
    if (res.success) onSuccess();
    else setError(res.error ?? "Failed to save");
  };

  const fieldCls = "w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:border-green-500 outline-none transition-colors";

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b bg-gradient-to-r from-green-50 to-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-xl">
              <ShieldCheck size={20} className="text-green-700" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">
              {isEdit ? "Edit Designation" : "Create Designation"}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {displayError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2">
              <AlertCircle size={15} className="flex-shrink-0" /> {displayError}
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 text-xs text-amber-700">
            Reserved names (cannot be used): <strong>user</strong>, <strong>staff</strong>, <strong>admin</strong>
          </div>

          {/* Name */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Designation Name</label>
            <input
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              placeholder="e.g. cashier, manager, supervisor…"
              className={`${fieldCls} ${isReserved ? "border-red-400 bg-red-50" : ""}`}
            />
            {nameVal.trim() && !isReserved && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-400">Preview:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${previewBadge(nameVal)}`}>
                  {nameVal.trim()}
                </span>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">
              Description <span className="text-gray-400 font-normal ml-1">(what can this role do?)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Describe the responsibilities…"
              className={`${fieldCls} resize-none`}
            />
          </div>

          {/* ── Section picker ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold text-gray-700">Allowed Sections</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Toggle which top-level sections this designation can access.
                  Enabling a section grants all its sub-pages too.
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={selectAll}
                  className="text-xs text-green-700 border border-green-200 hover:border-green-400 px-2.5 py-1 rounded-lg transition-colors">
                  All
                </button>
                <button type="button" onClick={clearAll}
                  className="text-xs text-red-600 border border-red-200 hover:border-red-400 px-2.5 py-1 rounded-lg transition-colors">
                  None
                </button>
              </div>
            </div>

            {selected.size === 0 && (
              <p className="text-xs text-amber-600 mb-3 flex items-center gap-1">
                ⚠️ No sections selected — staff with this designation won&apos;t see any navigation items.
              </p>
            )}

            <div className="grid grid-cols-1 gap-2">
              {NAV_SECTIONS.map((section) => {
                const isOn = selected.has(section.prefix);
                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => toggleSection(section.prefix)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                      isOn
                        ? "bg-green-50 border-green-400"
                        : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {/* Toggle icon */}
                    <div className="flex-shrink-0">
                      {isOn
                        ? <ToggleRight size={24} className="text-green-600" />
                        : <ToggleLeft  size={24} className="text-gray-400" />
                      }
                    </div>

                    {/* Emoji */}
                    <span className={`text-xl leading-none ${isOn ? "" : "grayscale opacity-50"}`}>
                      {section.emoji}
                    </span>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold capitalize ${isOn ? "text-green-800" : "text-gray-700"}`}>
                        {section.label}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{section.description}</p>
                    </div>

                    {/* Prefix badge */}
                    <span className={`flex-shrink-0 text-xs font-mono px-2 py-0.5 rounded ${
                      isOn ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}>
                      {section.prefix}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0 bg-gray-50">
          <button type="button" onClick={onClose}
            className="flex-1 border border-gray-300 rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-100">
            Cancel
          </button>
          <button type="button" onClick={handleSubmit}
            disabled={isPending || isReserved || !nameVal.trim() || !description.trim()}
            className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            {isPending
              ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
              : isEdit
              ? `Update  (${selected.size} section${selected.size !== 1 ? "s" : ""})`
              : `Create  (${selected.size} section${selected.size !== 1 ? "s" : ""})`}
          </button>
        </div>
      </div>
    </div>
  );
}