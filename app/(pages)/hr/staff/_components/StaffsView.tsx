// app/hr/staff/_components/StaffsView.tsx
"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, Plus, Loader2, MoreVertical, Users, ShieldCheck, Pencil, Trash2, BadgeCheck, Lock, AlertTriangle, Eye } from "lucide-react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import StaffFormSideSheet from "./StaffFormSideSheet";
import { deleteRoleAction, deleteStaffAction } from "./actions";
import RoleFormModal from "./Roleformmodal";
import AssignDesignationModal from "./Assigndesignationmodal";

type Staff      = { id: string; userId: string; fullName: string; tel1: string; tel2: string | null; mpesaNo: string | null; baseSalary: number; date: string; shop: string; shopId: string; role: string; designation: string | null; allowedRoutes: string[] };
type UserOption = { id: string; fullName: string; email?: string };
type RoleRecord = { id: string; name: string; description: string; allowedRoutes: string[] };
type Props      = { stats: { totalStaff: number; totalSalary: number }; staffList: Staff[]; users: UserOption[]; activeShopId: string; activeShopName: string; isAdmin: boolean; roles: RoleRecord[] };
type Tab        = "staff" | "roles";

const DESIGNATION_BADGE: Record<string, string> = {
  manager: "bg-purple-100 text-purple-700", supervisor: "bg-blue-100 text-blue-700",
  cashier: "bg-emerald-100 text-emerald-700", accountant: "bg-amber-100 text-amber-700",
  sales: "bg-pink-100 text-pink-700", storekeeper: "bg-orange-100 text-orange-700",
  admin: "bg-red-100 text-red-700", staff: "bg-green-50 text-green-700",
};
const designationBadge = (name: string | null) =>
  !name || name === "staff" ? "bg-green-50 text-green-700" : DESIGNATION_BADGE[name.toLowerCase()] ?? "bg-indigo-100 text-indigo-700";

type DDState = { id: string | null; top: number; left: number };
function usePortalDropdown() {
  const [dd, setDd] = useState<DDState>({ id: null, top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement | null>(null);
  const close = useCallback(() => setDd({ id: null, top: 0, left: 0 }), []);
  useEffect(() => {
    if (!dd.id) return;
    const h = (e: MouseEvent) => { if (menuRef.current?.contains(e.target as Node)) return; close(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [dd.id, close]);
  const open = useCallback((id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (dd.id === id) { close(); return; }
    const r = e.currentTarget.getBoundingClientRect();
    const dw = 192, gap = 6, dh = menuRef.current?.offsetHeight ?? 180;
    let top = r.bottom + gap, left = r.right - dw;
    if (top + dh > window.innerHeight - gap) top = r.top - dh - gap;
    if (top < gap) top = gap; if (left < gap) left = gap;
    if (left + dw > window.innerWidth - gap) left = window.innerWidth - dw - gap;
    setDd({ id, top, left });
  }, [dd.id, close]);
  return { dd, open, close, menuRef };
}

export default function StaffsView({ stats, staffList, users, activeShopId, activeShopName, isAdmin, roles }: Props) {
  const router = useRouter();
  const [tab, setTab]                   = useState<Tab>("staff");
  const [search, setSearch]             = useState("");
  const [showForm, setShowForm]         = useState(false);
  const [mode, setMode]                 = useState<"add" | "edit" | "view">("add");
  const [selected, setSelected]         = useState<Staff | undefined>();
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [noShopWarn, setNoShopWarn]     = useState<string | null>(null);
  const [showAssign, setShowAssign]     = useState(false);
  const [assignTarget, setAssignTarget] = useState<Staff | null>(null);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole]   = useState<RoleRecord | null>(null);
  const [deletingRoleId, setDeletingRoleId] = useState<string | null>(null);
  const { dd, open, close, menuRef }    = usePortalDropdown();

  const openModal     = (m: "add" | "edit" | "view", s?: Staff) => { setMode(m); setSelected(s); setShowForm(true); close(); };
  const closeModal    = () => { setShowForm(false); setSelected(undefined); };
  const handleSuccess = () => { closeModal(); router.refresh(); };

  const tryOpenAssign = (s: Staff) => {
    close();
    if (!s.shopId) { setNoShopWarn(s.fullName); return; }
    setAssignTarget(s); setShowAssign(true);
  };

  const handleDelete = async (id: string) => {
    close();
    if (!confirm("Remove this staff member?")) return;
    setDeletingId(id);
    const res = await deleteStaffAction(id);
    setDeletingId(null);
    if (res.success) router.refresh(); else alert(res.error || "Delete failed");
  };

  const handleDeleteRole = async (id: string) => {
    if (!confirm("Delete this designation?")) return;
    setDeletingRoleId(id);
    const res = await deleteRoleAction({ roleId: id, shopId: activeShopId });
    setDeletingRoleId(null);
    if (res.success) router.refresh(); else alert(res.error || "Delete failed");
  };

  const filtered  = staffList.filter((s) => `${s.fullName} ${s.tel1} ${s.shop} ${s.designation ?? ""} ${s.role}`.toLowerCase().includes(search.toLowerCase()));
  const ddStaff   = dd.id ? staffList.find((s) => s.id === dd.id) : null;

  return (
    <>
      <style>{`
        .stf-table .col-sticky{position:sticky;left:0;z-index:10;box-shadow:6px 0 18px -6px rgba(0,0,0,0.06);clip-path:inset(0px -30px 0px 0px);}
        .stf-table thead .col-sticky{z-index:20;}
        .stf-scroll-wrap{position:relative}
        .stf-scroll-wrap::after{content:'';position:absolute;top:0;right:0;bottom:0;width:48px;background:linear-gradient(to right,transparent,rgba(248,250,252,0.7));pointer-events:none;z-index:5;border-radius:0 16px 16px 0}
        @keyframes rowIn{from{opacity:0;transform:translateX(-6px)}to{opacity:1;transform:translateX(0)}}
        .stf-table tbody tr{animation:rowIn 0.18s ease both}
        @keyframes ddIn{from{opacity:0;transform:scale(0.95) translateY(-4px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .dd-menu{animation:ddIn 0.12s ease both;transform-origin:top right}
      `}</style>

      <div className="min-h-screen bg-gray-50/80 px-3 py-5 md:px-6">
        <div className="mx-auto max-w-screen-2xl space-y-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Human Resources</h1>
            <p className="text-sm text-gray-500 mt-0.5">Shop: <span className="font-medium text-gray-700">{activeShopName}</span></p>
          </div>

          {noShopWarn && (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
              <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800">Cannot assign designation</p>
                <p className="text-xs text-amber-700 mt-0.5"><strong>{noShopWarn}</strong> has no shop assigned.</p>
              </div>
              <button onClick={() => setNoShopWarn(null)} className="text-amber-400 hover:text-amber-700 text-xl leading-none">&times;</button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Staff",          value: stats.totalStaff,                            accent: "bg-green-500" },
              { label: "Total Salary Payable", value: `KSh ${stats.totalSalary.toLocaleString()}`, accent: "bg-blue-500" },
            ].map((s) => (
              <div key={s.label} className="relative overflow-hidden rounded-xl border border-gray-100 bg-white px-4 pt-4 pb-3 shadow-sm text-center">
                <div className={`absolute top-0 left-0 right-0 h-0.5 ${s.accent}`} />
                <p className="text-[0.63rem] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className="mt-1 text-2xl font-black tabular-nums text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="flex gap-1 border-b border-gray-200">
            {([{ key: "staff" as Tab, label: "Staff", Icon: Users }, { key: "roles" as Tab, label: "Designations", Icon: ShieldCheck }]).map(({ key, label, Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${tab === key ? "border-green-600 text-green-700" : "border-transparent text-gray-500 hover:text-gray-800"}`}>
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>

          {/* ── STAFF TAB ── */}
          {tab === "staff" && (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, phone, designation…"
                    className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs focus:border-green-500 focus:outline-none shadow-sm transition" />
                </div>
                <button onClick={() => openModal("add")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 shadow-sm shrink-0 transition-colors">
                  <Plus size={14} /> Add Staff
                </button>
              </div>

              <div className="stf-scroll-wrap rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="stf-table w-full min-w-[1000px] text-sm border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-gray-200">
                        <th className="col-sticky px-4 py-3.5 text-left" style={{ backgroundColor: "#f8fafc" }}>
                          <div className="flex items-center gap-3">
                            <span className="text-[0.68rem] font-bold uppercase tracking-widest text-gray-400 w-5">#</span>
                            <span className="text-[0.68rem] font-bold uppercase tracking-widest text-gray-400">Full Name</span>
                          </div>
                        </th>
                        {["Tel 1","Tel 2","Role Tier","Designation","Base Salary","Date Added","Actions"].map((h) => (
                          <th key={h} className="px-4 py-3.5 text-[0.68rem] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filtered.map((s, i) => (
                        <tr key={s.id} onClick={() => openModal("view", s)}
                          className="cursor-pointer bg-white hover:bg-slate-50 transition-colors duration-100" style={{ animationDelay: `${i * 0.025}s` }}
                          onMouseEnter={(e) => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#f8fafc"; }}
                          onMouseLeave={(e) => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#ffffff"; }}
                        >
                          <td className="col-sticky px-4 py-3" style={{ backgroundColor: "#ffffff" }}>
                            <div className="flex items-center gap-3">
                              <span className="text-[0.7rem] font-bold text-gray-300 w-5 text-center tabular-nums shrink-0">{i + 1}</span>
                              <div className="w-8 h-8 shrink-0 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-black text-xs">{s.fullName.charAt(0)}</div>
                              <p className="font-semibold text-gray-800 truncate max-w-[130px] text-[0.82rem]">{s.fullName}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[0.78rem] text-gray-600">{s.tel1}</td>
                          <td className="px-4 py-3 text-[0.78rem] text-gray-500">{s.tel2 || "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[0.68rem] font-bold ${s.role === "admin" ? "bg-purple-50 text-purple-700 border-purple-100" : "bg-green-50 text-green-700 border-green-100"}`}>{s.role}</span>
                          </td>
                          <td className="px-4 py-3">
                            {s.designation ? <span className={`inline-block rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold capitalize ${designationBadge(s.designation)}`}>{s.designation}</span> : <span className="text-xs text-gray-400 italic">none</span>}
                          </td>
                          <td className="px-4 py-3"><span className="tabular-nums text-[0.82rem] font-bold text-gray-700">KSh {s.baseSalary.toLocaleString()}</span></td>
                          <td className="px-4 py-3 text-[0.73rem] text-gray-400 whitespace-nowrap">{s.date}</td>
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <button onClick={(e) => open(s.id, e)} className={`rounded-lg p-1.5 transition-colors ${dd.id === s.id ? "bg-gray-200 text-gray-700" : "hover:bg-gray-100 text-gray-400"}`}><MoreVertical size={15} /></button>
                          </td>
                        </tr>
                      ))}
                      {filtered.length === 0 && <tr><td colSpan={9} className="py-20 text-center text-gray-400 text-sm">No staff found for <strong>{activeShopName}</strong></td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {/* ── DESIGNATIONS TAB ── */}
          {tab === "roles" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Designation Definitions</p>
                  <p className="text-xs text-gray-400 mt-0.5">Editing a designation instantly updates all assigned staff.</p>
                </div>
                <button onClick={() => { setEditingRole(null); setShowRoleForm(true); }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 shadow-sm transition-colors">
                  <Plus size={14} /> New Designation
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {roles.map((r) => {
                  const assignedStaff = staffList.filter((s) => s.designation?.toLowerCase() === r.name.toLowerCase());
                  return (
                    <div key={r.id} className="bg-white rounded-xl border shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-green-600" /><span className="font-bold text-gray-900 capitalize">{r.name}</span></div>
                        <div className="flex gap-1">
                          <button onClick={() => { setEditingRole(r); setShowRoleForm(true); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"><Pencil size={14} /></button>
                          <button onClick={() => handleDeleteRole(r.id)} disabled={deletingRoleId === r.id} className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors">
                            {deletingRoleId === r.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed">{r.description}</p>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5 flex items-center gap-1"><Lock size={10} /> Allowed sections ({r.allowedRoutes.length}):</p>
                        {r.allowedRoutes.length > 0
                          ? <div className="flex flex-wrap gap-1">{r.allowedRoutes.map((route) => <span key={route} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-mono">{route}</span>)}</div>
                          : <p className="text-xs text-amber-600 italic">No sections assigned — edit to add some.</p>}
                      </div>
                      <div className="pt-2 border-t mt-auto">
                        <p className="text-xs font-medium text-gray-500 mb-2">Staff ({assignedStaff.length}):</p>
                        <div className="flex flex-wrap gap-1.5">
                          {assignedStaff.length === 0
                            ? <span className="text-xs text-gray-400 italic">None assigned</span>
                            : assignedStaff.map((s) => <span key={s.id} className="flex items-center gap-1 bg-green-50 text-green-700 text-xs px-2.5 py-1 rounded-full font-medium"><BadgeCheck size={11} />{s.fullName}</span>)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {roles.length === 0 && (
                  <div className="col-span-full py-20 text-center text-gray-400">
                    <ShieldCheck size={38} className="mx-auto mb-3 text-gray-200" />
                    <p className="font-medium">No designations yet</p>
                    <p className="text-sm mt-1">Click &ldquo;New Designation&rdquo; to create one.</p>
                  </div>
                )}
              </div>

              {/* Assign table */}
              <div className="bg-white rounded-xl border shadow-sm p-5">
                <h3 className="font-semibold text-gray-800 mb-1 flex items-center gap-2"><BadgeCheck size={16} className="text-green-600" /> Assign Designations</h3>
                <p className="text-xs text-gray-500 mb-4">Staff without a shop cannot be assigned a designation.</p>
                <div className="stf-scroll-wrap rounded-xl border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="stf-table w-full text-sm min-w-[600px] border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-gray-200">
                          <th className="col-sticky px-4 py-3 text-left text-[0.68rem] font-bold uppercase tracking-widest text-gray-400" style={{ backgroundColor: "#f8fafc" }}>Staff Member</th>
                          {["Role Tier","Designation",""].map((h) => <th key={h} className="px-4 py-3 text-left text-[0.68rem] font-bold uppercase tracking-widest text-gray-400">{h}</th>)}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {staffList.map((s, i) => (
                          <tr key={s.id} className="bg-white hover:bg-slate-50 transition-colors duration-100" style={{ animationDelay: `${i * 0.025}s` }}
                            onMouseEnter={(e) => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#f8fafc"; }}
                            onMouseLeave={(e) => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#ffffff"; }}
                          >
                            <td className="col-sticky px-4 py-3 font-medium text-[0.82rem]" style={{ backgroundColor: "#ffffff" }}>
                              {s.fullName}
                              {!s.shopId && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">no shop</span>}
                            </td>
                            <td className="px-4 py-3"><span className={`inline-block rounded-full border px-2.5 py-0.5 text-[0.68rem] font-bold ${s.role === "admin" ? "bg-purple-50 text-purple-700 border-purple-100" : "bg-green-50 text-green-700 border-green-100"}`}>{s.role}</span></td>
                            <td className="px-4 py-3">
                              {s.designation ? <span className={`inline-block rounded-full px-2.5 py-0.5 text-[0.68rem] font-bold capitalize ${designationBadge(s.designation)}`}>{s.designation}</span> : <span className="text-xs text-gray-400 italic">none</span>}
                            </td>
                            <td className="px-4 py-3 text-right">
                              {s.shopId
                                ? <button onClick={() => tryOpenAssign(s)} className="inline-flex items-center gap-1.5 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium px-3 py-1.5 rounded-lg transition-colors"><Pencil size={11} />{s.designation ? "Change" : "Assign"}</button>
                                : <span className="text-xs text-gray-400 italic flex items-center gap-1 justify-end"><AlertTriangle size={11} className="text-amber-400" /> assign shop first</span>}
                            </td>
                          </tr>
                        ))}
                        {staffList.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-gray-400 text-sm">No staff in this shop</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PORTAL DROPDOWN — renders at document.body, never clipped */}
      {dd.id && ddStaff && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} className="dd-menu fixed z-[99999] w-[192px] bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 overflow-hidden" style={{ top: dd.top, left: dd.left }}>
          <div className="px-3 py-2 border-b border-gray-50 mb-1">
            <p className="text-[0.63rem] font-bold uppercase tracking-widest text-gray-400">Staff</p>
            <p className="text-xs font-semibold text-gray-700 truncate">{ddStaff.fullName}</p>
            <p className="text-[0.63rem] text-gray-400 capitalize">{ddStaff.role}{ddStaff.designation ? ` · ${ddStaff.designation}` : ""}</p>
          </div>
          <button onClick={() => openModal("view", ddStaff)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Eye size={12} /></span> View Details
          </button>
          <button onClick={() => openModal("edit", ddStaff)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><Pencil size={12} /></span> Edit
          </button>
          <button onClick={() => tryOpenAssign(ddStaff)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><BadgeCheck size={12} /></span>
            {ddStaff.designation ? "Change Designation" : "Assign Designation"}
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button onClick={() => handleDelete(ddStaff.id)} disabled={deletingId === ddStaff.id}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-50 text-red-500">
              {deletingId === ddStaff.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            </span> Remove Staff
          </button>
        </div>,
        document.body
      )}

      {showForm && (
        <StaffFormSideSheet key={mode + (selected?.id || "new")} mode={mode} staffToEdit={selected}
          users={users} activeShopId={activeShopId} activeShopName={activeShopName}
          onSuccess={handleSuccess} onClose={closeModal} />
      )}
      {showAssign && assignTarget && (
        <AssignDesignationModal staff={assignTarget} roles={roles} activeShopId={activeShopId}
          onClose={() => { setShowAssign(false); setAssignTarget(null); }}
          onSuccess={() => { setShowAssign(false); setAssignTarget(null); router.refresh(); }} />
      )}
      {showRoleForm && (
        <RoleFormModal roleToEdit={editingRole} activeShopId={activeShopId}
          onClose={() => { setShowRoleForm(false); setEditingRole(null); }}
          onSuccess={() => { setShowRoleForm(false); setEditingRole(null); router.refresh(); }} />
      )}
    </>
  );
}