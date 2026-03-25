// app/sale/quote/_components/QuotePOSSheet.tsx
"use client";

import { useState, useRef } from "react";
import { useActionState } from "react";
import { ArrowLeft, Search, Plus, Minus, Trash2, Loader2, FileText, Package } from "lucide-react";
import Image from "next/image";
import { saveQuoteAction } from "./actions";

type ActionResult = { success: boolean; error?: string };

type Product = {
  id: string;
  productName: string;
  sellingPrice: number;
  buyingPrice: number;
  discount: number;
  quantity: number;
  imageUrl: string | null;
  shopId: string;
  shopName: string;
};

type CartItem = {
  productId: string;
  productName: string;
  price: number;
  discount: number;
  quantity: number;
  maxQty: number;
};

type EditQuote = {
  id: string;
  soldById: string;
  customerName: string;
  customerContact: string;
  items: { id: string; productName: string; quantity: number; price: number; discount: number }[];
  amount: number;
  shopId: string;
};

type ShopOption = { id: string; name: string; location: string; tel: string };

type Profile = {
  role: string;
  shopId: string | null;
  fullName: string;
};

type Props = {
  editQuote?: EditQuote;
  products: Product[];
  shops: ShopOption[];
  profile: Profile;
  onSuccess: () => void;
  onClose: () => void;
};

export default function QuotePOSSheet({
  editQuote,
  products,
  shops,
  profile,
  onSuccess,
  onClose,
}: Props) {
  const isAdmin = profile.role?.toLowerCase().trim() === "admin";
  const defaultShopId = editQuote?.shopId ?? profile.shopId ?? shops[0]?.id ?? "";

  const [selectedShopId, setSelectedShopId] = useState(defaultShopId);
  const [search, setSearch] = useState("");
  const [mobileTab, setMobileTab] = useState<"products" | "cart">("products");
  const formRef = useRef<HTMLFormElement>(null);

  const [cart, setCart] = useState<CartItem[]>(() => {
    if (!editQuote) return [];
    return editQuote.items.map((item) => {
      const product = products.find((p) => p.productName === item.productName);
      return {
        productId: product?.id ?? "",
        productName: item.productName,
        price: item.price,
        discount: item.discount,
        quantity: item.quantity,
        maxQty: product?.quantity ?? item.quantity,
      };
    });
  });

  const shopProducts = products.filter((p) => p.shopId === selectedShopId);
  const filteredProducts = shopProducts.filter((p) =>
    p.productName.toLowerCase().includes(search.toLowerCase())
  );

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.productId === product.id);
      if (existing) {
        if (existing.quantity >= existing.maxQty) return prev;
        return prev.map((c) =>
          c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.productName,
          price: product.sellingPrice,
          discount: product.discount ?? 0,
          quantity: 1,
          maxQty: product.quantity,
        },
      ];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((c) => {
        if (c.productId !== productId) return c;
        const newQty = Math.max(1, Math.min(c.maxQty, c.quantity + delta));
        return { ...c, quantity: newQty };
      })
    );
  };

  const setQtyDirect = (productId: string, value: string) => {
    const parsed = parseInt(value, 10);
    setCart((prev) =>
      prev.map((c) => {
        if (c.productId !== productId) return c;
        if (isNaN(parsed) || parsed < 1) return { ...c, quantity: 1 };
        return { ...c, quantity: Math.min(c.maxQty, parsed) };
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  };

  const total = cart.reduce((sum, c) => sum + (c.price - c.discount) * c.quantity, 0);
  const totalItems = cart.reduce((sum, c) => sum + c.quantity, 0);
  const shopName = shops.find((s) => s.id === selectedShopId)?.name ?? "";

  const [state, submitAction, isPending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      formData.set(
        "itemsJson",
        JSON.stringify(
          cart.map((c) => ({
            productId: c.productId,
            quantity: c.quantity,
            price: c.price,
            discount: c.discount,
          }))
        )
      );
      formData.set("shopId", selectedShopId);
      if (editQuote?.id) formData.set("quoteId", editQuote.id);
      const res = await saveQuoteAction(prev, formData);
      if (res.success) onSuccess();
      return res;
    },
    { success: false }
  );

  /* ── CART PANEL ───────────────────────────────────────────── */
  const CartPanel = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-gray-50 shrink-0">
        <div className="text-sm font-semibold text-gray-600">Quote ({totalItems} items)</div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cart.length === 0 && (
          <div className="py-12 text-center text-gray-400 text-sm">
            <FileText size={40} className="mx-auto mb-2 opacity-30" />
            Click products to add to quote
          </div>
        )}
        {cart.map((item) => (
          <div key={item.productId} className="bg-white border rounded-xl p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{item.productName}</div>
                <div className="text-xs text-gray-500">
                  KSh {(item.price - item.discount).toLocaleString()} × {item.quantity} =
                  <span className="font-bold text-blue-700 ml-1">
                    KSh {((item.price - item.discount) * item.quantity).toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFromCart(item.productId)}
                className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center shrink-0"
              >
                <Trash2 size={12} />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => updateQty(item.productId, -1)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center shrink-0"
              >
                <Minus size={13} />
              </button>
              <input
                type="number"
                min={1}
                max={item.maxQty}
                value={item.quantity}
                onChange={(e) => setQtyDirect(item.productId, e.target.value)}
                className="w-14 text-center text-sm font-bold border border-gray-200 rounded-lg py-1 outline-none focus:border-blue-400"
              />
              <button
                type="button"
                onClick={() => updateQty(item.productId, 1)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center shrink-0"
              >
                <Plus size={13} />
              </button>
              <span className="text-xs text-gray-400 ml-1">/ {item.maxQty}</span>
            </div>
          </div>
        ))}
      </div>

      {/* TOTAL + CUSTOMER + SAVE — no payment method */}
      <div className="border-t p-4 bg-gray-50 space-y-3 shrink-0">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">Total</span>
          <span className="text-2xl font-bold text-gray-900">KSh {total.toLocaleString()}</span>
        </div>

        {state?.error && (
          <div className="bg-red-100 text-red-700 text-sm px-3 py-2 rounded-lg text-center">
            {state.error}
          </div>
        )}

        <form ref={formRef} action={submitAction} className="space-y-3">
          <input
            name="customerName"
            defaultValue={editQuote?.customerName ?? ""}
            placeholder="Customer name (optional)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
          />
          <input
            name="customerContact"
            defaultValue={editQuote?.customerContact ?? ""}
            placeholder="Customer contact (optional)"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
          />

          <button
            type="submit"
            disabled={isPending || cart.length === 0}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-3 font-bold rounded-xl flex items-center justify-center gap-2 text-base"
          >
            {isPending ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <><FileText size={18} /> {editQuote ? "Update Quote" : "Save Quote"}</>
            )}
          </button>
        </form>
      </div>
    </div>
  );

  /* ── PRODUCT GRID ─────────────────────────────────────────── */
  const ProductGrid = (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 gap-3 content-start">
        {filteredProducts.map((product) => {
          const inCart = cart.find((c) => c.productId === product.id);
          const outOfStock = product.quantity === 0;
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => { if (!outOfStock) addToCart(product); }}
              disabled={outOfStock}
              className={`relative rounded-xl border p-3 text-left transition-all ${
                outOfStock
                  ? "opacity-40 cursor-not-allowed border-gray-200"
                  : inCart
                  ? "border-blue-500 bg-blue-50 shadow-sm"
                  : "border-gray-200 hover:border-blue-400 hover:shadow-sm"
              }`}
            >
              {product.imageUrl ? (
                <div className="relative w-full h-20 rounded-lg mb-2 overflow-hidden">
                  <Image
                    src={product.imageUrl}
                    alt={product.productName}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
                </div>
              ) : (
                <div className="w-full h-20 bg-gray-100 rounded-lg mb-2 flex items-center justify-center text-gray-300 text-2xl">
                  📦
                </div>
              )}
              <div className="text-sm font-semibold text-gray-800 truncate">{product.productName}</div>
              <div className="text-sm font-bold text-blue-700 mt-0.5">
                KSh {product.sellingPrice.toLocaleString()}
              </div>
              <div className={`text-xs mt-0.5 ${product.quantity <= 5 ? "text-red-500 font-medium" : "text-gray-400"}`}>
                Stock: {product.quantity}
              </div>
              {inCart && (
                <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {inCart.quantity}
                </div>
              )}
            </button>
          );
        })}
        {filteredProducts.length === 0 && (
          <div className="col-span-2 md:col-span-3 py-20 text-center text-gray-400">
            No products found
          </div>
        )}
      </div>
    </div>
  );

  /* ── RENDER ───────────────────────────────────────────────── */
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
      <div className="w-full max-w-5xl h-full bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* HEADER */}
        <div className="flex items-center gap-3 border-b px-4 py-3 bg-white shrink-0">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 shrink-0">
            <ArrowLeft size={22} />
          </button>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText size={20} className="text-blue-600" />
            {editQuote ? "Edit Quote" : "New Quote"}
          </h2>
          <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
            {isAdmin && !profile.shopId ? (
              <select
                value={selectedShopId}
                onChange={(e) => { setSelectedShopId(e.target.value); setCart([]); }}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
              >
                <option value="">Select shop</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            ) : (
              <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg hidden sm:inline">
                {shopName || "—"}
              </span>
            )}
            <span className="text-sm text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg hidden sm:inline">
              👤 {profile.fullName}
            </span>
          </div>
        </div>

        {/* MOBILE TABS */}
        <div className="flex border-b md:hidden shrink-0">
          <button
            onClick={() => setMobileTab("products")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
              mobileTab === "products" ? "border-b-2 border-blue-600 text-blue-700" : "text-gray-500"
            }`}
          >
            <Package size={16} /> Products
          </button>
          <button
            onClick={() => setMobileTab("cart")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${
              mobileTab === "cart" ? "border-b-2 border-blue-600 text-blue-700" : "text-gray-500"
            }`}
          >
            <FileText size={16} /> Quote
            {totalItems > 0 && (
              <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                {totalItems}
              </span>
            )}
          </button>
        </div>

        {/* MOBILE CONTENT */}
        <div className="flex-1 overflow-hidden md:hidden">
          {mobileTab === "products" ? ProductGrid : CartPanel}
        </div>

        {/* DESKTOP SIDE-BY-SIDE */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden border-r">{ProductGrid}</div>
          <div className="w-full max-w-sm flex flex-col overflow-hidden">{CartPanel}</div>
        </div>

      </div>
    </div>
  );
}