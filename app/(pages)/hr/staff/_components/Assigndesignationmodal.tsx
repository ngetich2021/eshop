// app/hr/staff/_components/AssignDesignationModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Three tabs:
//   1. Designation — pick a preset designation (copies its section list)
//   2. Sections    — fine-tune which top-level sections this person can see
//   3. Role Tier   — user / staff / admin account-level tier
// ─────────────────────────────────────────────────────────────────────────────
"use client";

import { useState, useTransition }  from "react";
import { X, Loader2, RotateCcw, ShieldCheck, ToggleLeft, ToggleRight, Lock, Unlock } from "lucide-react";
import {
  assignDesignationAction,
  removeDesignationAction,
  assignStaffRoleAction,
  saveAllowedRoutesAction,
} from "./actions";
import { NAV_SECTIONS } from "@/lib/permissions";

type Staff = {
  id:            string;
  userId:        string;
  fullName:      string;
  role:          string;
  designation:   string | null;
  allowedRoutes: string[];
  shopId:        string;
};

type RoleRecord = {
  id:            string;
  name:          string;
  description:   string;
  allowedRoutes: string[];
};

type Props = {
  staff:        Staff;
  roles:        RoleRecord[];
  activeShopId: string;
  onClose:      () => void;
  onSuccess:    () => void;
};

const BADGE_COLORS: Record<string, string> = {
  manager:     "bg-purple-100 text-purple-700 border-purple-300",
  supervisor:  "bg-blue-100 text-blue-700 border-blue-300",
  cashier:     "bg-emerald-100 text-emerald-700 border-emerald-300",
  accountant:  "bg-amber-100 text-amber-700 border-amber-300",
  sales:       "bg-pink-100 text-pink-700 border-pink-300",
  storekeeper: "bg-orange-100 text-orange-700 border-orange-300",
};
function badgeCls(name: string) {
  return BADGE_COLORS[name.toLowerCase()] ?? "bg-indigo-100 text-indigo-700 border-indigo-300";
}

const ROLE_TIERS = ["user", "staff", "admin"] as const;
type RoleTier  = typeof ROLE_TIERS[number];
type ActiveTab = "designation" | "sections" | "role";

export default function AssignDesignationModal({
  staff, roles, activeShopId, onClose, onSuccess,
}: Props) {
  const [selectedDesig, setSelectedDesig] = useState<string>(staff.designation ?? "");
  const [selectedTier,  setSelectedTier]  = useState<RoleTier>((staff.role as RoleTier) ?? "staff");
  const [activeTab,     setActiveTab]     = useState<ActiveTab>("designation");
  const [error,         setError]         = useState<string | null>(null);

  // Sections tab: start from the staff member's current allowedRoutes
  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    () => new Set(staff.allowedRoutes)
  );

  const [isSavingDesig,   startDesig]  = useTransition();
  const [isRemovingDesig, startRemove] = useTransition();
  const [isSavingRole,    startRole]   = useTransition();
  const [isSavingSections, startSections] = useTransition();

  // Routes that the SELECTED designation template would grant
  const previewRoutes = roles.find((r) => r.name === selectedDesig)?.allowedRoutes ?? [];

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSaveDesignation = () => {
    if (!selectedDesig) { setError("Please select a designation"); return; }
    setError(null);
    startDesig(async () => {
      const res = await assignDesignationAction({ staffUserId: staff.userId, designation: selectedDesig, shopId: activeShopId });
      if (res.success) onSuccess();
      else setError(res.error ?? "Failed");
    });
  };

  const handleRemoveDesignation = () => {
    setError(null);
    startRemove(async () => {
      const res = await removeDesignationAction({ staffUserId: staff.userId, shopId: activeShopId });
      if (res.success) onSuccess();
      else setError(res.error ?? "Failed");
    });
  };

  const handleSaveRoleTier = () => {
    setError(null);
    startRole(async () => {
      const res = await assignStaffRoleAction({ staffUserId: staff.userId, roleName: selectedTier, shopId: activeShopId });
      if (res.success) onSuccess();
      else setError(res.error ?? "Failed");
    });
  };

  const handleSaveSections = () => {
    setError(null);
    startSections(async () => {
      const res = await saveAllowedRoutesAction({
        staffUserId:   staff.userId,
        allowedRoutes: Array.from(selectedSections),
        shopId:        activeShopId,
      });
      if (res.success) onSuccess();
      else setError(res.error ?? "Failed");
    });
  };

  const toggleSection = (prefix: string) =>
    setSelectedSections((prev) => {
      const next = new Set(prev);
      next.has(prefix) ? next.delete(prefix) : next.add(prefix);
      return next;
    });

  const tabs: { key: ActiveTab; label: string; emoji: string }[] = [
    { key: "designation", label: "Designation", emoji: "🏷️" },
    { key: "sections",    label: "Sections",    emoji: "🔐" },
    { key: "role",        label: "Role Tier",   emoji: "🔑" },
  ];

  return (
    <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b bg-gradient-to-r from-green-50 to-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-xl">
              <ShieldCheck size={20} className="text-green-700" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg leading-tight">Manage Access</h3>
              <p className="text-sm text-gray-500">{staff.fullName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b flex-shrink-0">
          {tabs.map((t) => (
            <button key={t.key}
              onClick={() => { setActiveTab(t.key); setError(null); }}
              className={`flex-1 py-3 text-xs font-medium transition-colors border-b-2 ${
                activeTab === t.key
                  ? "border-green-600 text-green-700"
                  : "border-transparent text-gray-500 hover:text-gray-800"
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-xl text-sm flex items-center gap-2">
              ⚠️ {error}
            </div>
          )}

          {/* ══ TAB: DESIGNATION ══════════════════════════════════════════ */}
          {activeTab === "designation" && (
            <>
              {/* Current */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Current designation</p>
                  {staff.designation ? (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badgeCls(staff.designation)}`}>
                      <ShieldCheck size={11} /> {staff.designation}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 italic">None assigned</span>
                  )}
                </div>
                {staff.designation && (
                  <button type="button" onClick={handleRemoveDesignation} disabled={isRemovingDesig}
                    className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600 border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors">
                    {isRemovingDesig ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                    Remove
                  </button>
                )}
              </div>

              {/* Picker */}
              {roles.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
                  <ShieldCheck size={32} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm font-medium text-gray-500">No designations defined yet</p>
                  <p className="text-xs text-gray-400 mt-1">Create one in the Designations tab first.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {roles.map((r) => {
                    const isSelected = selectedDesig === r.name;
                    return (
                      <button key={r.id} type="button"
                        onClick={() => setSelectedDesig(r.name)}
                        className={`w-full flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                          isSelected ? `${badgeCls(r.name)} border-current` : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? "border-current" : "border-gray-300"}`}>
                          {isSelected && <div className="w-2 h-2 rounded-full bg-current" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold capitalize text-sm">{r.name}</p>
                          <p className="text-xs opacity-75 mt-0.5">{r.description}</p>
                        </div>
                        <span className="flex-shrink-0 text-xs bg-white/70 border border-current/20 px-1.5 py-0.5 rounded-full font-medium">
                          {r.allowedRoutes.length} sections
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Preview */}
              {selectedDesig && previewRoutes.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 space-y-2">
                  <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                    <Unlock size={12} /> Sections this designation grants ({previewRoutes.length}):
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {previewRoutes.map((r) => {
                      const section = NAV_SECTIONS.find((s) => s.prefix === r);
                      return (
                        <span key={r} className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded font-mono flex items-center gap-1">
                          {section?.emoji} {section?.label ?? r}
                        </span>
                      );
                    })}
                  </div>
                  <p className="text-xs text-blue-500">
                    You can fine-tune individual sections in the <strong>Sections</strong> tab after assigning.
                  </p>
                </div>
              )}

              {selectedDesig && previewRoutes.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700 flex items-center gap-1.5">
                  <Lock size={12} /> This designation has no sections configured yet.
                </div>
              )}

              {selectedDesig && selectedDesig !== staff.designation && (
                <div className={`rounded-xl px-4 py-3 text-sm font-medium border ${badgeCls(selectedDesig)}`}>
                  ✓ Will assign <strong className="capitalize">{selectedDesig}</strong> with{" "}
                  <strong>{previewRoutes.length}</strong> section{previewRoutes.length !== 1 ? "s" : ""}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose}
                  className="flex-1 border border-gray-300 rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="button" onClick={handleSaveDesignation}
                  disabled={isSavingDesig || !selectedDesig || selectedDesig === staff.designation || roles.length === 0}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  {isSavingDesig ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : "Assign Designation"}
                </button>
              </div>
            </>
          )}

          {/* ══ TAB: SECTIONS ════════════════════════════════════════════ */}
          {activeTab === "sections" && (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-700">
                <strong>Fine-tune section access</strong> for <strong>{staff.fullName}</strong> individually.
                Toggle a section on to grant access to it and all its sub-pages.
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  <span className="text-green-700 font-bold">{selectedSections.size}</span>
                  <span className="text-gray-400"> / {NAV_SECTIONS.length} sections allowed</span>
                </p>
                <div className="flex gap-2">
                  <button type="button"
                    onClick={() => setSelectedSections(new Set(NAV_SECTIONS.map((s) => s.prefix)))}
                    className="text-xs text-green-700 border border-green-200 hover:border-green-400 px-2.5 py-1 rounded-lg">
                    All
                  </button>
                  <button type="button"
                    onClick={() => setSelectedSections(new Set())}
                    className="text-xs text-red-600 border border-red-200 hover:border-red-400 px-2.5 py-1 rounded-lg">
                    None
                  </button>
                </div>
              </div>

              {selectedSections.size === 0 && (
                <p className="text-xs text-amber-600 flex items-center gap-1">
                  ⚠️ No sections selected — this staff member won&apos;t be able to access anything.
                </p>
              )}

              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {NAV_SECTIONS.map((section) => {
                  const isOn = selectedSections.has(section.prefix);
                  return (
                    <button
                      key={section.key}
                      type="button"
                      onClick={() => toggleSection(section.prefix)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all ${
                        isOn
                          ? "bg-green-50 border-green-400"
                          : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {isOn
                        ? <ToggleRight size={22} className="text-green-600 flex-shrink-0" />
                        : <ToggleLeft  size={22} className="text-gray-400 flex-shrink-0" />}
                      <span className={`text-xl leading-none flex-shrink-0 ${isOn ? "" : "grayscale opacity-50"}`}>
                        {section.emoji}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold capitalize ${isOn ? "text-green-800" : "text-gray-700"}`}>
                          {section.label}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{section.description}</p>
                      </div>
                      <span className={`flex-shrink-0 text-xs font-mono px-2 py-0.5 rounded ${
                        isOn ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {section.prefix}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose}
                  className="flex-1 border border-gray-300 rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="button" onClick={handleSaveSections} disabled={isSavingSections}
                  className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  {isSavingSections
                    ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
                    : `Save — ${selectedSections.size} section${selectedSections.size !== 1 ? "s" : ""} allowed`}
                </button>
              </div>
            </>
          )}

          {/* ══ TAB: ROLE TIER ═══════════════════════════════════════════ */}
          {activeTab === "role" && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
                <strong>Role tiers</strong> control account-level access.{" "}
                <strong>user</strong> = no access,{" "}
                <strong>staff</strong> = scoped by allowed sections,{" "}
                <strong>admin</strong> = full access everywhere.
              </div>

              <div className="space-y-2">
                {ROLE_TIERS.map((tier) => {
                  const isSelected = selectedTier === tier;
                  const tierCls = {
                    user:  "bg-gray-100 text-gray-700 border-gray-300",
                    staff: "bg-green-100 text-green-700 border-green-300",
                    admin: "bg-purple-100 text-purple-700 border-purple-300",
                  }[tier];
                  const desc = {
                    user:  "No access to any protected page.",
                    staff: "Access limited to allowed sections only.",
                    admin: "Full unrestricted access to all pages.",
                  }[tier];
                  return (
                    <button key={tier} type="button" onClick={() => setSelectedTier(tier)}
                      className={`w-full flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                        isSelected ? `${tierCls} border-current` : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? "border-current" : "border-gray-300"}`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-current" />}
                      </div>
                      <div>
                        <p className="font-semibold capitalize text-sm">{tier}</p>
                        <p className="text-xs opacity-70 mt-0.5">{desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              {selectedTier !== staff.role && (
                <div className="rounded-xl px-4 py-3 text-sm font-medium border bg-violet-50 text-violet-700 border-violet-200">
                  ✓ Will change: <strong className="capitalize">{staff.role}</strong> → <strong className="capitalize">{selectedTier}</strong>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={onClose}
                  className="flex-1 border border-gray-300 rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="button" onClick={handleSaveRoleTier}
                  disabled={isSavingRole || selectedTier === staff.role}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300 disabled:cursor-not-allowed text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  {isSavingRole ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : "Update Role Tier"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}