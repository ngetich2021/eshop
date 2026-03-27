"use client";

import { useState } from "react";
import { Search, Plus, Edit2, Trash2, Eye, Loader2, Store, MapPin, ExternalLink } from "lucide-react";
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
  shopId: string;
  shopName: string;
  shopLocation: string;
  buyingPrice: number;
  subCategoryId: string;
  categoryId: string;
  outOfStockLimit: number;
  isOwnShop: boolean;
};

type Props = {
  activeShop: { id: string; name: string; location: string };
  activeShopId: string;
  isStaff: boolean;
  isAdmin: boolean;
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
  activeShop,
  activeShopId,
  isStaff,
  isAdmin,
  stats,
  products,
  categories,
  subCategories,
}: Props) {
  const router = useRouter();

  const canManage = !isStaff;

  const [search, setSearch] = useState("");
  const [showProductForm, setShowProductForm] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit" | "view">("add");
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "this" | "other">("all");

  const ownCount = products.filter((p) => p.isOwnShop).length;
  const otherCount = products.filter((p) => !p.isOwnShop).length;

  const filtered = products.filter((p) => {
    const matchSearch = p.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchFilter =
      activeFilter === "all" ||
      (activeFilter === "this" && p.isOwnShop) ||
      (activeFilter === "other" && !p.isOwnShop);
    return matchSearch && matchFilter;
  });

  const openModal = (mode: "add" | "edit" | "view", product?: Product) => {
    if (!canManage || (product && !product.isOwnShop)) mode = "view";
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

        {/* ── Active Shop Banner ───────────────────────────────────────────── */}
        <div className="flex items-center gap-4 rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50 to-violet-50 px-5 py-3.5 shadow-sm">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 shadow">
            <Store size={18} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-400">Active Shop</p>
            <p className="font-bold text-indigo-900 truncate">{activeShop.name}</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1 text-xs text-gray-500 shadow-sm shrink-0">
            <MapPin size={11} />
            {activeShop.location}
          </div>
          {isStaff && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200 shrink-0">
              Staff View
            </span>
          )}
          {isAdmin && (
            <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 border border-purple-200 shrink-0">
              Admin View
            </span>
          )}
        </div>

        {/* ── Stats ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Stat label="This shop products" value={stats.totalProducts} />
          <Stat label="Stock Value" value={stats.productValue.toLocaleString()} />
          <Stat label="Total sold" value={stats.totalSold} />
          <Stat label="Total returned" value={stats.totalReturned} />
          <Stat label="Out of stock" value={stats.outOfStock} variant="danger" />
          <Stat label="Slow selling" value={stats.slowSelling} variant="warning" />
        </div>

        {/* ── Filter tabs + Search + Buttons ────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Filter pills */}
            {([
              { key: "all",   label: `All (${products.length})` },
              { key: "this",  label: `This Shop (${ownCount})` },
              { key: "other", label: `Other Shops (${otherCount})` },
            ] as const).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveFilter(key)}
                className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeFilter === key
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-indigo-400"
                }`}
              >
                {label}
              </button>
            ))}

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="w-56 rounded-lg border border-gray-300 pl-10 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Action buttons — hidden for staff */}
          {canManage && (
            <div className="flex gap-3 shrink-0">
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
          )}
        </div>

        {/* ── Info strip for cross-shop context ─────────────────────────────── */}
        {otherCount > 0 && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5 text-xs text-blue-700 font-medium flex items-center gap-2">
            <ExternalLink size={13} />
            Products from other shops are shown for reference only — you can view and refer customers but cannot sell them here.
          </div>
        )}

        {/* ── Table ─────────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto rounded-xl border bg-white shadow">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3.5 text-left font-semibold text-gray-700">S/NO</th>
                <th className="px-6 py-3.5 text-left font-semibold text-gray-700">Image</th>
                <th className="px-6 py-3.5 text-left font-semibold text-gray-700">Name</th>
                <th className="px-6 py-3.5 text-left font-semibold text-gray-700">Category</th>
                <th className="px-6 py-3.5 text-right font-semibold text-gray-700">Buying</th>
                <th className="px-6 py-3.5 text-right font-semibold text-gray-700">Price</th>
                <th className="px-6 py-3.5 text-right font-semibold text-gray-700">Discount</th>
                <th className="px-6 py-3.5 text-right font-semibold text-gray-700">Cost</th>
                <th className="px-6 py-3.5 text-center font-semibold text-gray-700">Quantity</th>
                <th className="px-6 py-3.5 text-left font-semibold text-gray-700">Shop</th>
                <th className="px-6 py-3.5 text-center font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p, i) => {
                const cost = p.price - p.discount;
                const isOutOfStock = p.quantity === 0;
                const isLowStock = p.quantity > 0 && p.quantity <= p.outOfStockLimit;
                const isExternal = !p.isOwnShop;

                return (
                  <tr
                    key={p.id}
                    onClick={() => openModal("view", p)}
                    className={`cursor-pointer transition-colors ${
                      isExternal
                        ? "bg-indigo-50/40 hover:bg-indigo-50"
                        : isOutOfStock
                        ? "bg-red-50/50 hover:bg-red-50"
                        : isLowStock
                        ? "bg-yellow-50/50 hover:bg-yellow-50"
                        : "hover:bg-gray-50"
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
                          className={`rounded object-cover ${isExternal ? "opacity-75" : ""}`}
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center text-xs text-gray-400">—</div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold">{p.name}</div>
                      {isExternal && (
                        <div className="text-xs text-indigo-500 font-medium mt-0.5 flex items-center gap-1">
                          <ExternalLink size={10} /> Available at {p.shopName}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">{p.category}</td>
                    <td className="px-6 py-4 text-right">{isExternal ? "—" : p.buyingPrice.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">{p.price.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      {p.discount > 0 ? <span className="text-red-600">-{p.discount}</span> : "—"}
                    </td>
                    <td className="px-6 py-4 text-right font-medium">{isExternal ? "—" : cost.toLocaleString()}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-bold text-base">{isExternal ? "—" : p.quantity}</span>
                        {!isExternal && isOutOfStock && <span className="text-xs text-red-700 font-medium">(OUT OF STOCK)</span>}
                        {!isExternal && isLowStock && <span className="text-xs text-yellow-700 font-medium">(Low Stock)</span>}
                        {isExternal && <span className="text-xs text-indigo-500 font-medium">See {p.shopName}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4">{p.shopName}</td>
                    <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-4 justify-center">
                        {/* View — always available */}
                        <button
                          onClick={() => openModal("view", p)}
                          className="text-emerald-600 hover:text-emerald-800"
                          title="View"
                        >
                          <Eye size={18} />
                        </button>

                        {/* Edit — only own shop products, only if canManage */}
                        {canManage && p.isOwnShop && (
                          <button
                            onClick={() => openModal("edit", p)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                        )}

                        {/* Delete — only own shop products, only if canManage */}
                        {canManage && p.isOwnShop && (
                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={deletingId === p.id}
                            className="text-red-600 hover:text-red-800 disabled:opacity-60"
                            title="Delete"
                          >
                            {deletingId === p.id ? (
                              <Loader2 size={18} className="animate-spin" />
                            ) : (
                              <Trash2 size={18} />
                            )}
                          </button>
                        )}
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
          productToEdit={
            selectedProduct
              ? {
                  id: selectedProduct.id,
                  name: selectedProduct.name,
                  serialNo: selectedProduct.serialNo || null,
                  price: selectedProduct.price,
                  discount: selectedProduct.discount,
                  buyingPrice: selectedProduct.buyingPrice,
                  quantity: selectedProduct.quantity,
                  outOfStockLimit: selectedProduct.outOfStockLimit,
                  subCategoryId: selectedProduct.subCategoryId,
                  categoryId: selectedProduct.categoryId,
                  image: selectedProduct.image,
                }
              : undefined
          }
          onSuccess={handleSuccess}
          onClose={closeModal}
        />
      )}

      {showCategoryManager && canManage && (
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
  const color =
    variant === "danger"
      ? "text-red-700"
      : variant === "warning"
      ? "text-amber-700"
      : "text-gray-900";
  return (
    <div className="rounded-lg border bg-white p-4 text-center shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}