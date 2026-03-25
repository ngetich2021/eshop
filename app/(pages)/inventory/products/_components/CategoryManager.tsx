"use client";

import { ArrowLeft, Edit2, Plus, Trash2, Search, Loader2 } from "lucide-react";
import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  deleteCategoryAction,
  deleteSubCategoryAction,
  saveCategoryAction,
  saveSubCategoryAction,
} from "./actions";

type ActionResult = {
  success: boolean;
  error?: string;
  newId?: string;
};

type Props = {
  categories: { id: string; name: string }[];
  subCategories: { id: string; name: string; categoryId: string; category?: { name: string } }[];
  onClose: () => void;
};

export default function CategoryManager({ categories, subCategories, onClose }: Props) {
  const router = useRouter();

  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingSubId, setEditingSubId] = useState<string | null>(null);

  const [catSearch, setCatSearch] = useState("");
  const [subSearch, setSubSearch] = useState("");

  // ── LOADING STATES (ALL buttons disabled during any action) ──
  const [isCatProcessing, setIsCatProcessing] = useState(false);
  const [isSubProcessing, setIsSubProcessing] = useState(false);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);
  const [deletingSubId, setDeletingSubId] = useState<string | null>(null);

  const filteredCats = categories.filter((c) =>
    c.name.toLowerCase().includes(catSearch.toLowerCase())
  );

  const filteredSubs = subCategories.filter((s) =>
    s.name.toLowerCase().includes(subSearch.toLowerCase())
  );

  const handleCategorySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsCatProcessing(true);
    const formData = new FormData(e.currentTarget);
    const result = await saveCategoryAction({ success: false }, formData);
    setIsCatProcessing(false);

    if (result.success) {
      router.refresh();
      setEditingCatId(null);
    }
  };

  const handleSubCategorySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubProcessing(true);
    const formData = new FormData(e.currentTarget);
    const result = await saveSubCategoryAction({ success: false }, formData);
    setIsSubProcessing(false);

    if (result.success) {
      router.refresh();
      setEditingSubId(null);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Delete category? Subcategories will remain.")) return;
    setDeletingCatId(id);
    const res = await deleteCategoryAction(id);
    setDeletingCatId(null);
    if (res.success) router.refresh();
    else alert(res.error || "Delete failed");
  };

  const handleDeleteSubcategory = async (id: string) => {
    if (!confirm("Delete subcategory?")) return;
    setDeletingSubId(id);
    const res = await deleteSubCategoryAction(id);
    setDeletingSubId(null);
    if (res.success) router.refresh();
    else alert(res.error || "Delete failed");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex justify-end">
      <div className="h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center gap-4 border-b px-6 py-5">
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-gray-100">
            <ArrowLeft size={22} />
          </button>
          <h2 className="text-xl font-semibold">Manage Categories & Subcategories</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-10">
          {/* ==================== CATEGORIES ==================== */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-lg">Categories</h3>
              <button
                onClick={() => setEditingCatId("")}
                disabled={isCatProcessing}
                className="flex items-center gap-1.5 rounded bg-blue-600 px-4 py-2 text-white text-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Plus size={16} /> New
              </button>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                placeholder="Search categories..."
                className="w-full rounded-lg border border-gray-300 pl-10 py-2.5 text-sm focus:border-blue-500"
              />
            </div>

            {editingCatId !== null && (
              <form onSubmit={handleCategorySubmit} className="mb-6 flex gap-3">
                <input type="hidden" name="id" value={editingCatId} />
                <input
                  name="name"
                  defaultValue={categories.find((c) => c.id === editingCatId)?.name ?? ""}
                  placeholder="Category name"
                  required
                  disabled={isCatProcessing}
                  className="flex-1 rounded-lg border px-4 py-2.5 disabled:bg-gray-100"
                />
                <button
                  type="submit"
                  disabled={isCatProcessing}
                  className="rounded-lg bg-green-600 px-6 py-2.5 text-white font-medium hover:bg-green-700 disabled:bg-green-400 flex items-center gap-2"
                >
                  {isCatProcessing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Saving...
                    </>
                  ) : editingCatId ? (
                    "Update"
                  ) : (
                    "Add"
                  )}
                </button>
              </form>
            )}

            <div className="space-y-2">
              {filteredCats.map((c) => (
                <div key={c.id} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
                  <span className="font-medium">{c.name}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingCatId(c.id)}
                      disabled={isCatProcessing || deletingCatId !== null}
                      className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(c.id)}
                      disabled={deletingCatId === c.id || isCatProcessing}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50 flex items-center gap-1"
                    >
                      {deletingCatId === c.id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
              {filteredCats.length === 0 && catSearch && (
                <div className="py-8 text-center text-gray-500">No matching categories</div>
              )}
            </div>
          </section>

          {/* ==================== SUBCATEGORIES ==================== */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-lg">Subcategories</h3>
              <button
                onClick={() => setEditingSubId("")}
                disabled={isSubProcessing}
                className="flex items-center gap-1.5 rounded bg-blue-600 px-4 py-2 text-white text-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Plus size={16} /> New
              </button>
            </div>

            <div className="relative mb-6">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                value={subSearch}
                onChange={(e) => setSubSearch(e.target.value)}
                placeholder="Search subcategories..."
                className="w-full rounded-lg border border-gray-300 pl-10 py-2.5 text-sm focus:border-blue-500"
              />
            </div>

            {editingSubId !== null && (
              <form onSubmit={handleSubCategorySubmit} className="mb-6 grid gap-3 sm:grid-cols-2">
                <input type="hidden" name="id" value={editingSubId} />
                <select
                  name="categoryId"
                  required
                  disabled={isSubProcessing}
                  className="rounded-lg border px-4 py-2.5 disabled:bg-gray-100"
                >
                  <option value="">Select parent category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <div className="flex gap-3">
                  <input
                    name="name"
                    defaultValue={subCategories.find((s) => s.id === editingSubId)?.name ?? ""}
                    placeholder="Subcategory name"
                    required
                    disabled={isSubProcessing}
                    className="flex-1 rounded-lg border px-4 py-2.5 disabled:bg-gray-100"
                  />
                  <button
                    type="submit"
                    disabled={isSubProcessing}
                    className="rounded-lg bg-green-600 px-6 py-2.5 text-white font-medium hover:bg-green-700 disabled:bg-green-400 flex items-center gap-2"
                  >
                    {isSubProcessing ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Saving...
                      </>
                    ) : editingSubId ? (
                      "Update"
                    ) : (
                      "Add"
                    )}
                  </button>
                </div>
              </form>
            )}

            <div className="space-y-2">
              {filteredSubs.map((s) => (
                <div key={s.id} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
                  <div>
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-3 text-xs text-gray-500">({s.category?.name || "—"})</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingSubId(s.id)}
                      disabled={isSubProcessing || deletingSubId !== null}
                      className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteSubcategory(s.id)}
                      disabled={deletingSubId === s.id || isSubProcessing}
                      className="text-red-600 hover:text-red-800 disabled:opacity-50 flex items-center gap-1"
                    >
                      {deletingSubId === s.id ? (
                        <Loader2 size={18} className="animate-spin" />
                      ) : (
                        <Trash2 size={18} />
                      )}
                    </button>
                  </div>
                </div>
              ))}
              {filteredSubs.length === 0 && subSearch && (
                <div className="py-8 text-center text-gray-500">No matching subcategories</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}