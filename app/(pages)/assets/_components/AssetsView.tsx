"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Search, Plus, Loader2, MoreVertical, Package, Eye, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import Image from "next/image";
import AssetFormSideSheet from "./AssetFormSideSheet";
import { deleteAssetAction } from "./actions";

type Asset = { id: string; itemName: string; imageUrl: string | null; cost: number; shop: string; shopId: string; date: string };
type ActiveShop = { id: string; name: string; location: string };
type Props = { activeShop: ActiveShop; stats: { totalAssets: number; totalValue: number }; assets: Asset[]; shopId: string };

// ── Portal dropdown hook ──────────────────────────────────────────────────────
type DDState = { id: string | null; top: number; left: number };

function useTableDropdown() {
  const [dd, setDd]   = useState<DDState>({ id: null, top: 0, left: 0 });
  const menuRef       = useRef<HTMLDivElement | null>(null);
  const close         = useCallback(() => setDd({ id: null, top: 0, left: 0 }), []);

  useEffect(() => {
    if (!dd.id) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dd.id, close]);

  const open = useCallback((id: string, e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (dd.id === id) { close(); return; }
    const r  = e.currentTarget.getBoundingClientRect();
    const dw = 176, gap = 6;
    const dh = menuRef.current?.offsetHeight ?? 130;
    let top  = r.bottom + gap;
    let left = r.right - dw;
    if (top + dh > window.innerHeight - gap) top  = r.top - dh - gap;
    if (top < gap)                            top  = gap;
    if (left < gap)                           left = gap;
    if (left + dw > window.innerWidth - gap)  left = window.innerWidth - dw - gap;
    setDd({ id, top, left });
  }, [dd.id, close]);

  return { dd, open, close, menuRef };
}

export default function AssetsView({ activeShop, stats, assets, shopId }: Props) {
  const router = useRouter();
  const [search, setSearch]         = useState("");
  const [showForm, setShowForm]     = useState(false);
  const [mode, setMode]             = useState<"add" | "edit" | "view">("add");
  const [selected, setSelected]     = useState<Asset | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { dd, open, close, menuRef } = useTableDropdown();

  const ddAsset = dd.id ? assets.find((a) => a.id === dd.id) : null;

  const openModal  = (m: "add" | "edit" | "view", a?: Asset) => { setMode(m); setSelected(a); setShowForm(true); close(); };
  const closeModal = () => { setShowForm(false); setSelected(undefined); };
  const handleSuccess = () => { closeModal(); router.refresh(); };

  const handleDelete = async (id: string) => {
    close();
    if (!confirm("Delete this asset?")) return;
    setDeletingId(id);
    const res = await deleteAssetAction(id);
    setDeletingId(null);
    if (res.success) router.refresh(); else alert(res.error || "Delete failed");
  };

  const filtered = assets.filter((a) => `${a.itemName} ${a.shop}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      <style>{`
        .assets-table .col-sticky {
          position: sticky; left: 0; z-index: 10;
          box-shadow: 6px 0 18px -6px rgba(0,0,0,0.06);
          clip-path: inset(0px -30px 0px 0px);
        }
        .assets-table thead .col-sticky { z-index: 20; }
        .table-scroll-wrap { position: relative; }
        .table-scroll-wrap::after {
          content: ''; position: absolute; top: 0; right: 0; bottom: 0; width: 48px;
          background: linear-gradient(to right, transparent, rgba(248,250,252,0.7));
          pointer-events: none; z-index: 5; border-radius: 0 16px 16px 0;
        }
        .asset-img img { transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1); }
        .asset-img:hover img { transform: scale(1.12); }
        @keyframes rowIn { from { opacity: 0; transform: translateX(-5px); } to { opacity: 1; transform: translateX(0); } }
        .assets-table tbody tr { animation: rowIn 0.2s ease both; }
        @keyframes ddIn { from { opacity:0; transform:scale(0.95) translateY(-4px); } to { opacity:1; transform:scale(1) translateY(0); } }
        .dd-menu { animation: ddIn 0.12s ease both; transform-origin: top right; }
      `}</style>

      <div className="min-h-screen bg-slate-50/80 px-3 py-5 md:px-6">
        <div className="mx-auto max-w-screen-2xl space-y-5">

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-bold text-gray-700">{activeShop.name}</span>
            <span>·</span>
            <span>{activeShop.location}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Total Assets", value: stats.totalAssets,                          accent: "bg-indigo-500" },
              { label: "Total Value",  value: `KSh ${stats.totalValue.toLocaleString()}`, accent: "bg-emerald-500" },
            ].map((s) => (
              <div key={s.label} className="relative overflow-hidden rounded-xl border border-gray-100 bg-white px-4 pt-4 pb-3 shadow-sm">
                <div className={`absolute top-0 left-0 right-0 h-0.5 ${s.accent}`} />
                <p className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
                <p className="mt-1.5 text-2xl font-black tabular-nums text-gray-900">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search assets…"
                className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs focus:border-indigo-400 focus:outline-none shadow-sm transition" />
            </div>
            <button onClick={() => openModal("add")}
              className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 shadow-sm transition shrink-0">
              <Plus size={14} /> Add Asset
            </button>
          </div>

          <div className="table-scroll-wrap rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="assets-table w-full min-w-[620px] text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200">
                    <th className="col-sticky px-4 py-3.5 text-left" style={{ backgroundColor: "#f8fafc" }}>
                      <div className="flex items-center gap-3">
                        <span className="text-[0.7rem] font-bold uppercase tracking-widest text-gray-400 w-5">#</span>
                        <span className="text-[0.7rem] font-bold uppercase tracking-widest text-gray-400">Asset</span>
                      </div>
                    </th>
                    {["Date", "Cost (KSh)", "Actions"].map((h) => (
                      <th key={h} className={`px-4 py-3.5 text-[0.7rem] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap ${h === "Actions" ? "text-center" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((a, i) => (
                    <tr key={a.id}
                      onClick={() => openModal("view", a)}
                      className="cursor-pointer bg-white hover:bg-slate-50 transition-colors duration-100"
                      style={{ animationDelay: `${i * 0.025}s` }}
                      onMouseEnter={(e) => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#f8fafc"; }}
                      onMouseLeave={(e) => { const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky"); if (td) td.style.backgroundColor = "#ffffff"; }}
                    >
                      <td className="col-sticky px-4 py-3" style={{ backgroundColor: "#ffffff" }}>
                        <div className="flex items-center gap-3">
                          <span className="text-[0.72rem] font-bold text-gray-300 w-5 text-center tabular-nums shrink-0">{i + 1}</span>
                          <div className="asset-img relative h-10 w-10 shrink-0 rounded-xl overflow-hidden border-2 border-white shadow-md ring-1 ring-gray-100">
                            {a.imageUrl ? (
                              <Image src={a.imageUrl} alt={a.itemName} fill sizes="40px" className="object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                <Package size={14} className="text-gray-300" />
                              </div>
                            )}
                          </div>
                          <p className="font-semibold text-gray-800 truncate max-w-[160px] text-[0.82rem]">{a.itemName}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className="text-[0.75rem] text-gray-400 whitespace-nowrap">{a.date}</span></td>
                      <td className="px-4 py-3"><span className="tabular-nums text-[0.82rem] font-bold text-gray-800">{a.cost.toLocaleString()}</span></td>
                      <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <button onClick={(e) => open(a.id, e)}
                          className={`rounded-lg p-1.5 transition-colors ${dd.id === a.id ? "bg-gray-200 text-gray-700" : "hover:bg-gray-100 text-gray-400"}`}>
                          <MoreVertical size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={4} className="py-24 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-300"><Package size={40} strokeWidth={1} />
                        <p className="text-sm font-semibold text-gray-400">No assets found</p></div>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ROOT-LEVEL DROPDOWN PORTAL */}
      {dd.id && ddAsset && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} className="dd-menu fixed z-[99999] w-[176px] bg-white rounded-2xl shadow-2xl border border-gray-100 py-1.5 overflow-hidden"
          style={{ top: dd.top, left: dd.left }}>
          <div className="px-3 py-2 border-b border-gray-50 mb-1">
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400">Actions</p>
            <p className="text-xs font-semibold text-gray-700 truncate">{ddAsset.itemName}</p>
          </div>
          <button onClick={() => openModal("view", ddAsset)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 text-blue-600"><Eye size={12} /></span> View
          </button>
          <button onClick={() => openModal("edit", ddAsset)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-violet-50 hover:text-violet-700 transition-colors">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-50 text-violet-600"><Pencil size={12} /></span> Edit
          </button>
          <div className="my-1 border-t border-gray-100" />
          <button onClick={() => handleDelete(ddAsset.id)} disabled={deletingId === ddAsset.id}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-50 text-red-500">
              {deletingId === ddAsset.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
            </span> Delete
          </button>
        </div>,
        document.body
      )}

      {showForm && (
        <AssetFormSideSheet key={mode + (selected?.id || "new")} mode={mode}
          assetToEdit={selected ?? null} shopId={shopId}
          onSuccess={handleSuccess} onClose={closeModal} />
      )}
    </>
  );
}