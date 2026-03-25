"use client";

import { useState } from "react";
import { Search, Plus, Edit2, Trash2, Eye, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import CategoryManager from "./CategoryManager";
import { deleteProductAction } from "./actions";
import ProductFormSideSheet from "./ProductFormModal";

type Product = {
  id: string;
  name: string;
  serialNo: string;
  image: string | null;
  category: string;
  subcategory: string;
  price: number;
  discount: number;
  quantity: number;
  shop: string;
  buyingPrice: number;
  subCategoryId: string;
  categoryId: string;
  outOfStockLimit: number;
};

type Props = {
  stats: {
    totalProducts: number;
    productValue: number;
    totalSold: number;
    totalReturned: number;
    outOfStock: number;
    slowSelling: number;
  };
  products: Product[];
  categories: { id: string; name: string }[];
  subCategories: { id: string; name: string; categoryId: string }[];
};

export default function ProductsView({
  stats,
  products,
  categories,
  subCategories,
}: Props) {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view">("add");
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = products.filter((p) =>
    `${p.name} ${p.category} ${p.subcategory}`.toLowerCase().includes(search.toLowerCase())
  );

  const openModal = (mode: "add" | "edit" | "view", product?: Product) => {
    setModalMode(mode);
    setSelectedProduct(product);
    setShowProductForm(true);
  };

  const closeModal = () => {
    setShowProductForm(false);
    setSelectedProduct(undefined);
  };

  const handleSuccess = () => {
    closeModal();
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    setDeletingId(id);
    const res = await deleteProductAction(id);
    setDeletingId(null);
    if (res.success) router.refresh();
    else alert(res.error || "Delete failed");
  };

  return (
    <div className="min-h-screen bg-gray-50/80 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-screen-2xl space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="Total products" value={stats.totalProducts} />
          <Stat label="Product Value" value={stats.productValue.toLocaleString()} />
          <Stat label="Total products sold" value={stats.totalSold} />
          <Stat label="Total products returned" value={stats.totalReturned} />
          <Stat label="Products out of stock" value={stats.outOfStock} variant="danger" />
          <Stat label="slow selling products" value={stats.slowSelling} variant="warning" />
        </div>

        {/* Search + Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products..."
              className="w-full rounded-lg border border-gray-300 pl-10 py-2.5 text-sm focus:border-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowCategoryManager(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus size={16} /> Categories
            </button>
            <button
              onClick={() => openModal("add")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-green-700"
            >
              <Plus size={16} /> Product
            </button>
          </div>
        </div>

        {/* TABLE - FULL CODE WITH STRONG YELLOW */}
        <div className="overflow-x-auto rounded-xl border bg-white shadow">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3.5 text-left font-semibold text-gray-700">S/NO</th>
                <th className="px-6 py-3.5 text-left font-semibold text-gray-700">Image</th>
                <th className="px-6 py-3.5 text-left font-semibold text-gray-700">name</th>
                <th className="px-6 py-3.5 text-left font-semibold text-gray-700">category</th>
                <th className="px-6 py-3.5 text-right font-semibold text-gray-700">buying</th>
                <th className="px-6 py-3.5 text-right font-semibold text-gray-700">price</th>
                <th className="px-6 py-3.5 text-right font-semibold text-gray-700">discount</th>
                <th className="px-6 py-3.5 text-right font-semibold text-gray-700">cost</th>
                <th className="px-6 py-3.5 text-center font-semibold text-gray-700">quantity</th>
                <th className="px-6 py-3.5 text-left font-semibold text-gray-700">shop</th>
                <th className="px-6 py-3.5 text-center font-semibold text-gray-700">actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p, i) => {
                const cost = p.price - p.discount;

                // EXACT LOGIC: Red = quantity === 0, Yellow = 1 ≤ quantity ≤ outOfStockLimit
                const isOutOfStock = p.quantity === 0;
                const isLowStock = p.quantity > 0 && p.quantity <= p.outOfStockLimit;

                return (
                  <tr
                    key={p.id}
                    onClick={() => openModal("view", p)}
                    className={`group cursor-pointer transition-all border-l-4 font-medium ${
                      isOutOfStock
                        ? "bg-red-400 text-red-950 border-red-700"
                        : isLowStock
                        ? "bg-yellow-400 text-yellow-950 border-yellow-700"
                        : "text-gray-700"
                    }`}
                  >
                    <td className="px-6 py-4">{i + 1}</td>
                    <td className="px-6 py-4">
                      {p.image ? (
                        <Image
                          src={p.image}
                          alt=""
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded object-cover ring-1 ring-gray-200"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-400">—</div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-semibold">{p.name}</td>
                    <td className="px-6 py-4">{p.category}</td>
                    <td className="px-6 py-4 text-right">{p.buyingPrice.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">{p.price.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      {p.discount > 0 ? <span className="text-red-600">-{p.discount}</span> : "—"}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">{cost.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-base">{p.quantity}</span>
                        {isOutOfStock && <span className="text-xs text-red-700 font-medium">(OUT OF STOCK)</span>}
                        {isLowStock && <span className="text-xs text-yellow-700 font-medium">(Low Stock)</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">{p.shop}</td>
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-4 justify-center">
                        <button
                          onClick={() => openModal("view", p)}
                          className="text-emerald-600 hover:text-emerald-800"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => openModal("edit", p)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deletingId === p.id}
                          className="text-red-600 hover:text-red-800 disabled:opacity-60"
                        >
                          {deletingId === p.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={11} className="py-20 text-center text-gray-500">
                    No matching products
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showProductForm && (
        <ProductFormSideSheet
          key={modalMode + (selectedProduct?.id || "new")}
          categories={categories}
          subCategories={subCategories}
          mode={modalMode}
          productToEdit={selectedProduct || undefined}
          onSuccess={handleSuccess}
          onClose={closeModal}
        />
      )}

      {showCategoryManager && (
        <CategoryManager
          categories={categories}
          subCategories={subCategories}
          onClose={() => setShowCategoryManager(false)}
        />
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  variant = "default",
}: {
  label: string;
  value: string | number;
  variant?: "default" | "danger" | "warning";
}) {
  const color = variant === "danger" ? "text-red-700" : variant === "warning" ? "text-amber-700" : "text-gray-900";
  return (
    <div className="rounded-lg border bg-white p-4 text-center shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`mt-1.5 text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}