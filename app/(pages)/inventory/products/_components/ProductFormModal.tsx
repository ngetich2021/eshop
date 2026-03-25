"use client";

import { ArrowLeft, Plus, X, Loader2, Eye } from "lucide-react";
import { useState, useRef, ChangeEvent, FormEvent, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useActionState } from "react";
import { saveProductAction, saveCategoryAction, saveSubCategoryAction } from "./actions";

type ActionResult = {
  success: boolean;
  error?: string;
};

type ProductToEdit = {
  id: string;
  name: string;
  serialNo: string | null;
  price: number;
  discount: number;
  buyingPrice: number;
  quantity: number;
  outOfStockLimit: number;
  subCategoryId: string;
  categoryId: string;
  image: string | null;
};

type Mode = "add" | "edit" | "view";

type Props = {
  categories: { id: string; name: string }[];
  subCategories: { id: string; name: string; categoryId: string }[];
  mode: Mode;
  productToEdit?: ProductToEdit | null;
  onSuccess: () => void;
  onClose: () => void;
};

export default function ProductFormSideSheet({
  categories,
  subCategories,
  mode,
  productToEdit,
  onSuccess,
  onClose,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const isView = mode === "view";

  // ✅ FIXED: State is initialized directly from props
  // No useEffect for syncing → no more React warning
  const [catId, setCatId] = useState(productToEdit?.categoryId || "");
  const [subId, setSubId] = useState(productToEdit?.subCategoryId || "");
  const [preview, setPreview] = useState<string | null>(productToEdit?.image || null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showSubcategoryModal, setShowSubcategoryModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const matchingSubs = subCategories.filter((s) => s.categoryId === catId);

  const [state, submitAction, isPending] = useActionState<ActionResult, FormData>(
    async (prevState, formData) => {
      const result = await saveProductAction(prevState, formData);
      return result;
    },
    { success: false }
  );

  useEffect(() => {
    if (state?.success) {
      onSuccess();
    }
  }, [state?.success, onSuccess]);

  const resetForm = () => {
    if (formRef.current) formRef.current.reset();
    setCatId("");
    setSubId("");
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  };

  const handleQuickCategory = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await saveCategoryAction({ success: false }, formData);
    if (result.success) {
      router.refresh();
      setShowCategoryModal(false);
    }
  };

  const handleQuickSubcategory = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const result = await saveSubCategoryAction({ success: false }, formData);
    if (result.success) {
      router.refresh();
      setShowSubcategoryModal(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
      <div className="w-full max-w-lg md:max-w-2xl lg:max-w-[1050px] h-full bg-white shadow-2xl flex flex-col overflow-hidden">
        
        <div className="flex items-center gap-4 border-b px-6 py-5">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={26} />
          </button>
          <h2 className="text-2xl font-semibold flex items-center gap-3">
            {mode === "view" ? (
              <>
                <Eye size={28} className="text-gray-600" /> View Product
              </>
            ) : mode === "edit" ? (
              "Edit Product"
            ) : (
              "Add Products"
            )}
          </h2>
        </div>

        <form
          ref={formRef}
          action={submitAction}
          className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 space-y-8"
        >
          {productToEdit?.id && <input type="hidden" name="productId" value={productToEdit.id} />}

          {state?.error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-2xl text-center font-medium">
              {state.error}
            </div>
          )}

          {/* Name + Serial no */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Name:</label>
              <input
                name="productName"
                defaultValue={productToEdit?.name || ""}
                required
                readOnly={isView}
                className={`w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`}
              />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Serial no:</label>
              <input
                name="serialNo"
                defaultValue={productToEdit?.serialNo || ""}
                readOnly={isView}
                className={`w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`}
              />
            </div>
          </div>

          {/* Category + subcategory */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Category:</label>
              <div className="flex gap-3">
                <select
                  value={catId}
                  onChange={(e) => {
                    if (!isView) {
                      setCatId(e.target.value);
                      setSubId("");
                    }
                  }}
                  required
                  disabled={isView}
                  className={`flex-1 border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`}
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {!isView && (
                  <button
                    type="button"
                    onClick={() => setShowCategoryModal(true)}
                    className="px-6 bg-green-600 text-white rounded-2xl hover:bg-green-700"
                  >
                    <Plus size={26} />
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">subcategory:</label>
              <div className="flex gap-3">
                <select
                  name="subCategoryId"
                  value={subId}
                  onChange={(e) => !isView && setSubId(e.target.value)}
                  required
                  disabled={isView || !catId}
                  className={`flex-1 border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`}
                >
                  <option value="">Select subcategory</option>
                  {matchingSubs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                {!isView && (
                  <button
                    type="button"
                    onClick={() => setShowSubcategoryModal(true)}
                    className="px-6 bg-green-600 text-white rounded-2xl hover:bg-green-700"
                  >
                    <Plus size={26} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Buying + Quantity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Buying:</label>
              <input
                name="buyingPrice"
                type="number"
                defaultValue={productToEdit?.buyingPrice || 0}
                min="0"
                required
                readOnly={isView}
                className={`w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`}
              />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Quantity:</label>
              <input
                name="quantity"
                type="number"
                defaultValue={productToEdit?.quantity ?? 1}
                min="0"
                required
                readOnly={isView || !!productToEdit}
                className={`w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${isView || !!productToEdit ? "bg-gray-50 cursor-not-allowed" : ""}`}
              />
            </div>
          </div>

          {/* Selling + Discount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Selling:</label>
              <input
                name="sellingPrice"
                type="number"
                defaultValue={productToEdit?.price || 0}
                min="1"
                required
                readOnly={isView}
                className={`w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`}
              />
            </div>
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Discount:</label>
              <input
                name="discount"
                type="number"
                defaultValue={productToEdit?.discount || 0}
                min="0"
                readOnly={isView}
                className={`w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`}
              />
            </div>
          </div>

          {/* Out of stock Limit */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Out of stock Limit:</label>
            <input
              name="outOfStockLimit"
              type="number"
              defaultValue={productToEdit?.outOfStockLimit ?? 5}
              min="0"
              readOnly={isView}
              className={`w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base ${isView ? "bg-gray-50 cursor-not-allowed" : ""}`}
            />
          </div>

          {/* Image */}
          <div className="flex flex-col items-center pt-4">
            <label className="block mb-3 text-sm font-medium text-gray-700">Image</label>
            <div
              onClick={() => !isView && fileInputRef.current?.click()}
              className={`w-40 h-40 bg-gray-100 border-2 border-gray-300 rounded-2xl flex items-center justify-center overflow-hidden relative ${
                !isView ? "cursor-pointer hover:border-green-500" : ""
              }`}
            >
              {preview ? (
                <Image src={preview} alt="preview" fill className="object-cover rounded-2xl" unoptimized />
              ) : (
                <Plus size={48} className="text-gray-400" />
              )}
              {preview && !isView && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute top-3 right-3 bg-black/70 text-white p-1 rounded-full"
                >
                  <X size={16} />
                </button>
              )}
            </div>
            {!isView && (
              <input
                ref={fileInputRef}
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleImageChange}
              />
            )}
          </div>

          {/* Submit Button - hidden in view mode */}
          {!isView && (
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-4 text-xl font-semibold rounded-2xl mt-6 transition-colors flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  Saving...
                </>
              ) : mode === "edit" ? (
                "Update product"
              ) : (
                "Add product"
              )}
            </button>
          )}
        </form>
      </div>

      {/* Quick Category Modal - only in add/edit */}
      {!isView && showCategoryModal && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-8">
            <div className="flex justify-between mb-6">
              <h3 className="text-xl font-semibold">Add Category</h3>
              <button onClick={() => setShowCategoryModal(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleQuickCategory}>
              <input name="name" required placeholder="Category name" className="w-full border rounded-2xl px-5 py-3 mb-6" />
              <button type="submit" className="w-full bg-green-600 text-white py-4 rounded-2xl font-medium">Add</button>
            </form>
          </div>
        </div>
      )}

      {/* Quick Subcategory Modal - only in add/edit */}
      {!isView && showSubcategoryModal && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-8">
            <div className="flex justify-between mb-6">
              <h3 className="text-xl font-semibold">Add Subcategory</h3>
              <button onClick={() => setShowSubcategoryModal(false)}>
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleQuickSubcategory}>
              <select name="categoryId" required className="w-full border rounded-2xl px-5 py-3 mb-4">
                <option value="">Select parent category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input name="name" required placeholder="Subcategory name" className="w-full border rounded-2xl px-5 py-3 mb-6" />
              <button type="submit" className="w-full bg-green-600 text-white py-4 rounded-2xl font-medium">Add</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}