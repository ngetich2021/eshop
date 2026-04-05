"use client";

import { useState } from "react";
import { Search, Plus, Edit2, Trash2, Eye, Loader2, Store, MapPin, ExternalLink, Package } from "lucide-react";
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
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
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
    <>
      <style>{`
        /* ── Sticky column — NO hard border, fully seamless ── */
        .products-table .col-sticky {
          position: sticky;
          left: 0;
          z-index: 10;
          /* background set inline per-row so it always matches the row color */
        }
        .products-table thead .col-sticky {
          z-index: 20;
        }

        /*
          The "ghost shadow" trick:
          A very soft, wide box-shadow on the right side of the sticky cell only.
          It bleeds into the scrollable columns but fades to nothing quickly,
          so it reads as depth/continuity rather than a border wall.
          No ::after pseudo-element, no colored line — just air.
        */
        .products-table .col-sticky {
          box-shadow: 6px 0 18px -6px rgba(0,0,0,0.06);
          clip-path: inset(0px -30px 0px 0px); /* let the shadow escape to the right */
        }

        /* Right-edge hint: very gentle gradient to signal more content */
        .table-scroll-wrap {
          position: relative;
        }
        .table-scroll-wrap::after {
          content: '';
          position: absolute;
          top: 0; right: 0; bottom: 0;
          width: 48px;
          background: linear-gradient(to right, transparent, rgba(248,250,252,0.7));
          pointer-events: none;
          z-index: 5;
          border-radius: 0 16px 16px 0;
        }

        /* Image hover zoom */
        .product-img-wrap img {
          transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1);
        }
        .product-img-wrap:hover img {
          transform: scale(1.15);
        }

        /* Row slide-in */
        @keyframes rowIn {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .products-table tbody tr {
          animation: rowIn 0.22s ease both;
        }

        /* Tabular numbers */
        .price-chip { font-variant-numeric: tabular-nums; }

        /* Stock pill */
        .stock-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border-radius: 999px;
          padding: 2px 8px;
          font-size: 0.7rem;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
      `}</style>

      <div className="min-h-screen bg-slate-50/80 px-3 py-5 md:px-6">
        <div className="mx-auto max-w-screen-2xl space-y-5">

          {/* ── Active Shop Banner ── */}
          <div className="flex items-center gap-4 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-violet-50 to-purple-50 px-5 py-3.5 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-md">
              <Store size={18} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.62rem] font-semibold uppercase tracking-widest text-indigo-400">Active Shop</p>
              <p className="font-bold text-indigo-900 truncate">{activeShop.name}</p>
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur px-3 py-1.5 text-xs text-gray-500 shadow-sm shrink-0 border border-gray-100">
              <MapPin size={11} className="text-indigo-400" />
              {activeShop.location}
            </div>
            {isStaff && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200 shrink-0">
                Staff View
              </span>
            )}
            {isAdmin && (
              <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700 border border-purple-200 shrink-0">
                Admin
              </span>
            )}
          </div>

          {/* ── Stats ── */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat label="Products" value={stats.totalProducts} />
            <Stat label="Stock Value" value={`${stats.productValue.toLocaleString()}`} />
            <Stat label="Total Sold" value={stats.totalSold} />
            <Stat label="Returned" value={stats.totalReturned} />
            <Stat label="Out of Stock" value={stats.outOfStock} variant="danger" />
            <Stat label="Slow Selling" value={stats.slowSelling} variant="warning" />
          </div>

          {/* ── Filter + Search + Buttons ── */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              {([
                { key: "all",   label: `All (${products.length})` },
                { key: "this",  label: `This Shop (${ownCount})` },
                { key: "other", label: `Other (${otherCount})` },
              ] as const).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-all duration-150 ${
                    activeFilter === key
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200"
                      : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                  }`}
                >
                  {label}
                </button>
              ))}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search products…"
                  className="w-52 rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-xs focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 shadow-sm transition"
                />
              </div>
            </div>

            {canManage && (
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setShowCategoryManager(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 shadow-sm transition"
                >
                  <Plus size={14} /> Categories
                </button>
                <button
                  onClick={() => openModal("add")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm transition"
                >
                  <Plus size={14} /> Product
                </button>
              </div>
            )}
          </div>

          {otherCount > 0 && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5 text-xs text-blue-700 font-medium flex items-center gap-2">
              <ExternalLink size={12} />
              Products from other shops are for reference only — view and refer customers but cannot sell here.
            </div>
          )}

          {/* ── Table ── */}
          <div className="table-scroll-wrap rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="products-table w-full min-w-[960px] text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200">
                    {/* STICKY: S/NO + Name + Image */}
                    <th className="col-sticky px-4 py-3.5 text-left" style={{ backgroundColor: "#f8fafc" }}>
                      <div className="flex items-center gap-4">
                        <span className="text-[0.7rem] font-bold uppercase tracking-widest text-gray-400 w-5">#</span>
                        <span className="text-[0.7rem] font-bold uppercase tracking-widest text-gray-400">Product</span>
                      </div>
                    </th>
                    {/* Scrollable columns */}
                    {["Category", "Buying", "Price", "Discount", "Cost", "Qty", "Shop", "Actions"].map((h) => (
                      <th key={h} className={`px-4 py-3.5 text-[0.7rem] font-bold uppercase tracking-widest text-gray-400 whitespace-nowrap ${
                        ["Buying","Price","Discount","Cost"].includes(h) ? "text-right" :
                        ["Qty","Actions"].includes(h) ? "text-center" : "text-left"
                      }`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {filtered.map((p, i) => {
                    const cost = p.price - p.discount;
                    const isOutOfStock = p.quantity === 0;
                    const isLowStock = p.quantity > 0 && p.quantity <= p.outOfStockLimit;
                    const isExternal = !p.isOwnShop;

                    // Concrete colors so sticky td mirrors them exactly (Tailwind opacity variants don't work on sticky bg)
                    const stickyBg = isExternal ? "#eef2ff" : isOutOfStock ? "#fef2f2" : isLowStock ? "#fffbeb" : "#ffffff";
                    const stickyHover = isExternal ? "#e0e7ff" : isOutOfStock ? "#fee2e2" : isLowStock ? "#fef3c7" : "#f8fafc";

                    const rowBg = isExternal
                      ? "bg-indigo-50/60 hover:bg-indigo-100/60"
                      : isOutOfStock
                      ? "bg-red-50 hover:bg-red-50/80"
                      : isLowStock
                      ? "bg-amber-50 hover:bg-amber-50/80"
                      : "bg-white hover:bg-slate-50";

                    return (
                      <tr
                        key={p.id}
                        onClick={() => openModal("view", p)}
                        className={`cursor-pointer transition-colors duration-100 group ${rowBg}`}
                        style={{ animationDelay: `${i * 0.03}s` }}
                        onMouseEnter={(e) => {
                          const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky");
                          if (td) td.style.backgroundColor = stickyHover;
                        }}
                        onMouseLeave={(e) => {
                          const td = e.currentTarget.querySelector<HTMLElement>(".col-sticky");
                          if (td) td.style.backgroundColor = stickyBg;
                        }}
                      >
                        {/* ── STICKY CELL: index + image + name ── */}
                        <td className="col-sticky px-4 py-3" style={{ backgroundColor: stickyBg }}>
                          <div className="flex items-center gap-3">
                            {/* Row number */}
                            <span className="text-[0.72rem] font-bold text-gray-300 w-5 text-center tabular-nums shrink-0">
                              {i + 1}
                            </span>

                            {/* Product image — circular, zooms on hover */}
                            <div className="product-img-wrap relative h-11 w-11 shrink-0 rounded-xl overflow-hidden border-2 border-white shadow-md ring-1 ring-gray-100">
                              {p.image ? (
                                <Image
                                  src={p.image}
                                  alt={p.name}
                                  fill
                                  sizes="44px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className={`w-full h-full flex items-center justify-center text-xs font-bold
                                  ${isExternal ? "bg-indigo-100 text-indigo-400" : "bg-gray-100 text-gray-300"}`}>
                                  <Package size={16} />
                                </div>
                              )}
                              {/* External badge overlay */}
                              {isExternal && (
                                <div className="absolute inset-0 bg-indigo-600/10 flex items-end justify-end p-0.5">
                                  <div className="rounded-sm bg-indigo-500/80 p-px">
                                    <ExternalLink size={7} className="text-white" />
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Name block */}
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-800 truncate max-w-[140px] text-[0.82rem] leading-tight">
                                {p.name}
                              </p>
                              {isExternal ? (
                                <p className="text-[0.65rem] text-indigo-500 font-semibold mt-0.5 flex items-center gap-1 whitespace-nowrap">
                                  <ExternalLink size={9} /> {p.shopName}
                                </p>
                              ) : (
                                <p className="text-[0.65rem] text-gray-400 mt-0.5 truncate max-w-[140px]">
                                  {p.serialNo || p.subcategory || "—"}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-4 py-3">
                          <span className="inline-block rounded-lg bg-gray-100 px-2.5 py-1 text-[0.72rem] font-semibold text-gray-600">
                            {p.category}
                          </span>
                        </td>

                        {/* Buying */}
                        <td className="px-4 py-3 text-right">
                          <span className="price-chip text-[0.78rem] text-gray-500">
                            {isExternal ? <span className="text-gray-300">—</span> : p.buyingPrice.toLocaleString()}
                          </span>
                        </td>

                        {/* Price */}
                        <td className="px-4 py-3 text-right">
                          <span className="price-chip text-[0.82rem] font-bold text-gray-800">
                            {p.price.toLocaleString()}
                          </span>
                        </td>

                        {/* Discount */}
                        <td className="px-4 py-3 text-right">
                          {p.discount > 0 ? (
                            <span className="inline-block rounded-md bg-red-50 px-2 py-0.5 text-[0.72rem] font-bold text-red-600 border border-red-100">
                              -{p.discount.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-[0.78rem]">—</span>
                          )}
                        </td>

                        {/* Cost */}
                        <td className="px-4 py-3 text-right">
                          <span className={`price-chip text-[0.8rem] font-semibold ${isExternal ? "text-gray-300" : "text-emerald-700"}`}>
                            {isExternal ? "—" : cost.toLocaleString()}
                          </span>
                        </td>

                        {/* Quantity */}
                        <td className="px-4 py-3 text-center">
                          {isExternal ? (
                            <span className="stock-pill bg-indigo-50 text-indigo-500 border border-indigo-100">
                              <ExternalLink size={8} /> Other
                            </span>
                          ) : isOutOfStock ? (
                            <span className="stock-pill bg-red-100 text-red-700 border border-red-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                              Out
                            </span>
                          ) : isLowStock ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="price-chip text-[0.82rem] font-bold text-amber-700">{p.quantity}</span>
                              <span className="stock-pill bg-amber-50 text-amber-600 border border-amber-200">
                                Low
                              </span>
                            </div>
                          ) : (
                            <span className="price-chip text-[0.85rem] font-bold text-gray-700">{p.quantity}</span>
                          )}
                        </td>

                        {/* Shop */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Store size={11} className={isExternal ? "text-indigo-400" : "text-gray-300"} />
                            <span className={`text-[0.75rem] truncate max-w-[100px] ${isExternal ? "text-indigo-600 font-semibold" : "text-gray-500"}`}>
                              {p.shopName}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-2 justify-center">
                            <button
                              onClick={() => openModal("view", p)}
                              className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="View"
                            >
                              <Eye size={15} />
                            </button>
                            {canManage && p.isOwnShop && (
                              <button
                                onClick={() => openModal("edit", p)}
                                className="rounded-lg p-1.5 text-blue-500 hover:bg-blue-50 transition-colors"
                                title="Edit"
                              >
                                <Edit2 size={15} />
                              </button>
                            )}
                            {canManage && p.isOwnShop && (
                              <button
                                onClick={() => handleDelete(p.id)}
                                disabled={deletingId === p.id}
                                className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
                                title="Delete"
                              >
                                {deletingId === p.id ? (
                                  <Loader2 size={15} className="animate-spin" />
                                ) : (
                                  <Trash2 size={15} />
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
                      <td colSpan={10} className="py-24 text-center">
                        <div className="flex flex-col items-center gap-3 text-gray-300">
                          <Package size={40} strokeWidth={1} />
                          <p className="text-sm font-semibold text-gray-400">No matching products</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
    </>
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
  const valueColor =
    variant === "danger"  ? "text-red-600"   :
    variant === "warning" ? "text-amber-600" :
    "text-gray-900";
  const accent =
    variant === "danger"  ? "bg-red-500"   :
    variant === "warning" ? "bg-amber-400" :
    "bg-indigo-500";

  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white px-4 pt-4 pb-3 shadow-sm hover:shadow-md transition-shadow">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${accent}`} />
      <p className="text-[0.65rem] font-bold uppercase tracking-widest text-gray-400">{label}</p>
      <p className={`mt-1.5 text-2xl font-black tabular-nums ${valueColor}`}>{value}</p>
    </div>
  );
}