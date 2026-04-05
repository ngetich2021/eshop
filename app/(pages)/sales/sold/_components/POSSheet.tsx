// app/sale/sold/_components/POSSheet.tsx
"use client";

import { useState, useRef } from "react";
import { useActionState } from "react";
import {
  ArrowLeft, Search, Plus, Minus, Trash2, Loader2, ShoppingCart, Package,
  User, Phone, CreditCard, X, PlusCircle, Lock, Store,
} from "lucide-react";
import { createSaleAction } from "./actions";

type ActionResult = { success: boolean; error?: string; saleId?: string };

type Product = {
  id: string; productName: string; sellingPrice: number; buyingPrice: number;
  discount: number; quantity: number; imageUrl: string | null; shopId: string; shopName: string;
};

type CartItem = {
  productId: string; productName: string; price: number;
  discount: number; quantity: number; maxQty: number;
};

type PaymentSplit = { id: string; method: string; amount: number };
type ShopOption  = { id: string; name: string; location: string; tel: string };
type StaffOption = { id: string; fullName: string };
type Profile     = { role: string; shopId: string | null; fullName: string };

type Props = {
  products: Product[];
  shops: ShopOption[];
  staffList: StaffOption[];
  profile: Profile;
  activeShopId: string;
  canSell: boolean;        // ← new
  onSuccess: (saleId: string) => void;
  onClose: () => void;
};

const PAYMENT_METHODS = [
  { value: "cash",   label: "Cash",    emoji: "💵" },
  { value: "mpesa",  label: "M-Pesa",  emoji: "📱" },
  { value: "bank",   label: "Bank",    emoji: "🏦" },
  { value: "card",   label: "Card",    emoji: "💳" },
  { value: "credit", label: "Credit",  emoji: "🤝" },
];

function genId() { return Math.random().toString(36).slice(2, 9); }

export default function POSSheet({
  products, shops, staffList, profile, activeShopId, canSell, onSuccess, onClose,
}: Props) {
  const [search, setSearch]           = useState("");
  const [cart, setCart]               = useState<CartItem[]>([]);
  const [mobileTab, setMobileTab]     = useState<"products" | "cart">("products");
  const [customerName, setCustomerName]       = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [splits, setSplits]           = useState<PaymentSplit[]>([{ id: genId(), method: "", amount: 0 }]);
  const [downPayment, setDownPayment] = useState(0);
  const [dueDate, setDueDate]         = useState("");
  const [browseShopId, setBrowseShopId] = useState<string | null>(null); // shop being previewed
  const formRef = useRef<HTMLFormElement>(null);

  // Products split: active shop (sellable) vs other shops (view-only)
  const activeShopProducts  = products.filter(p => p.shopId === activeShopId);
  const otherShops          = shops.filter(s => s.id !== activeShopId);

  // What to show in the product grid
  const viewingShopId       = browseShopId ?? activeShopId;
  const viewingProducts     = products.filter(p => p.shopId === viewingShopId);
  const isViewingOtherShop  = viewingShopId !== activeShopId;

  const filteredProducts = viewingProducts.filter(p =>
    p.productName.toLowerCase().includes(search.toLowerCase())
  );

  const total        = cart.reduce((s, c) => s + (c.price - c.discount) * c.quantity, 0);
  const totalItems   = cart.reduce((s, c) => s + c.quantity, 0);
  const shopName     = shops.find(s => s.id === activeShopId)?.name ?? "";

  const hasCredit      = splits.some(s => s.method === "credit");
  const totalAllocated = splits.reduce((s, sp) => s + (sp.amount || 0), 0);
  const remaining      = total - totalAllocated;
  const isBalanced     = Math.abs(remaining) < 0.01;

  const addToCart = (product: Product) => {
    // Cannot add to cart from another shop
    if (product.shopId !== activeShopId) return;
    setCart(prev => {
      const existing = prev.find(c => c.productId === product.id);
      if (existing) {
        if (existing.quantity >= existing.maxQty) return prev;
        return prev.map(c => c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, {
        productId: product.id, productName: product.productName,
        price: product.sellingPrice, discount: product.discount ?? 0,
        quantity: 1, maxQty: product.quantity,
      }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart(prev => prev.map(c => {
      if (c.productId !== productId) return c;
      return { ...c, quantity: Math.max(1, Math.min(c.maxQty, c.quantity + delta)) };
    }));
  };

  const setQtyDirect = (productId: string, value: string) => {
    const parsed = parseInt(value, 10);
    setCart(prev => prev.map(c => {
      if (c.productId !== productId) return c;
      if (isNaN(parsed) || parsed < 1) return { ...c, quantity: 1 };
      return { ...c, quantity: Math.min(c.maxQty, parsed) };
    }));
  };

  const removeFromCart = (productId: string) =>
    setCart(prev => prev.filter(c => c.productId !== productId));

  const addSplit = () => {
    const allocated = splits.reduce((s, sp) => s + (sp.amount || 0), 0);
    setSplits(prev => [...prev, { id: genId(), method: "", amount: Math.max(0, total - allocated) }]);
  };
  const removeSplit = (id: string) => setSplits(prev => prev.filter(s => s.id !== id));
  const updateSplit = (id: string, field: keyof Omit<PaymentSplit, "id">, value: string | number) => {
    setSplits(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  };
  const autoFillRemaining = (id: string) => {
    const otherTotal = splits.filter(s => s.id !== id).reduce((acc, s) => acc + (s.amount || 0), 0);
    setSplits(prev => prev.map(s => s.id === id ? { ...s, amount: Math.max(0, total - otherTotal) } : s));
  };

  const [state, submitAction, isPending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      if (!canSell) return { success: false, error: "You are not authorised to sell in this shop." };
      formData.set("itemsJson", JSON.stringify(
        cart.map(c => ({ productId: c.productId, quantity: c.quantity, price: c.price, discount: c.discount }))
      ));
      formData.set("shopId", activeShopId);
      formData.set("paymentMethod", splits.length === 1 ? splits[0].method : (hasCredit ? "credit" : "split"));
      formData.set("splitsJson", JSON.stringify(splits));
      formData.set("customerName", customerName);
      formData.set("customerContact", customerContact);
      if (hasCredit) {
        formData.set("downPayment", String(splits.filter(s => s.method !== "credit").reduce((a, s) => a + s.amount, 0)));
        if (dueDate) formData.set("dueDate", dueDate);
      }
      const res = await createSaleAction(prev, formData);
      if (res.success && res.saleId) onSuccess(res.saleId);
      return res;
    },
    { success: false }
  );

  const canSubmit = canSell && cart.length > 0 &&
    splits.every(s => s.method) &&
    (splits.length === 1 ? splits[0].amount > 0 : isBalanced);

  /* ── SHOP BROWSER TABS (other shops) ─────────────────────── */
  const ShopBrowser = otherShops.length > 0 && (
    <div className="flex gap-1.5 px-4 pt-3 pb-0 overflow-x-auto shrink-0 flex-wrap">
      <button
        onClick={() => setBrowseShopId(null)}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-colors whitespace-nowrap ${
          !browseShopId
            ? "bg-green-600 text-white border-green-600"
            : "bg-white text-gray-600 border-gray-300 hover:border-green-400"
        }`}
      >
        <Store size={11} /> {shopName} <span className="text-[0.6rem] opacity-70">(selling)</span>
      </button>
      {otherShops.map(s => (
        <button
          key={s.id}
          onClick={() => setBrowseShopId(s.id)}
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border transition-colors whitespace-nowrap ${
            browseShopId === s.id
              ? "bg-slate-700 text-white border-slate-700"
              : "bg-white text-gray-600 border-gray-300 hover:border-slate-400"
          }`}
        >
          <Lock size={10} className="opacity-60" /> {s.name} <span className="text-[0.6rem] opacity-60">(view)</span>
        </button>
      ))}
    </div>
  );

  /* ── CART PANEL ─────────────────────────────────────────── */
  const CartPanel = (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b bg-gray-50 shrink-0">
        <div className="text-sm font-semibold text-gray-600">Cart ({totalItems} items)</div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cart.length === 0 && (
          <div className="py-16 text-center text-gray-400 text-sm">
            <ShoppingCart size={40} className="mx-auto mb-2 opacity-30" />
            {canSell
              ? "Click products to add to cart"
              : <span className="text-rose-400">View-only mode — switch to your shop to sell</span>
            }
          </div>
        )}
        {cart.map(item => (
          <div key={item.productId} className="bg-white border rounded-xl p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate">{item.productName}</div>
                <div className="text-xs text-gray-500">
                  KSh {(item.price - item.discount).toLocaleString()} × {item.quantity} =
                  <span className="font-bold text-green-700 ml-1">
                    KSh {((item.price - item.discount) * item.quantity).toLocaleString()}
                  </span>
                </div>
              </div>
              <button type="button" onClick={() => removeFromCart(item.productId)}
                className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center shrink-0">
                <Trash2 size={12} />
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <button type="button" onClick={() => updateQty(item.productId, -1)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center shrink-0">
                <Minus size={13} />
              </button>
              <input type="number" min={1} max={item.maxQty} value={item.quantity}
                onChange={e => setQtyDirect(item.productId, e.target.value)}
                className="w-14 text-center text-sm font-bold border border-gray-200 rounded-lg py-1 outline-none focus:border-green-400" />
              <button type="button" onClick={() => updateQty(item.productId, 1)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center shrink-0">
                <Plus size={13} />
              </button>
              <span className="text-xs text-gray-400 ml-1">/ {item.maxQty}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="border-t p-4 bg-gray-50 space-y-3 shrink-0 overflow-y-auto max-h-[60vh]">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-600">Total</span>
          <span className="text-2xl font-bold text-gray-900">KSh {total.toLocaleString()}</span>
        </div>

        {state?.error && (
          <div className="bg-red-100 text-red-700 text-sm px-3 py-2 rounded-lg text-center">{state.error}</div>
        )}

        <form ref={formRef} action={submitAction} className="space-y-3">
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 space-y-2">
            <p className="text-xs font-bold text-blue-700 flex items-center gap-1.5"><User size={12} /> Customer Info <span className="font-normal text-blue-500">(optional)</span></p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={customerName} onChange={e => setCustomerName(e.target.value)}
                  name="customerName" placeholder="Customer name"
                  className="w-full pl-7 pr-2 py-2 border border-gray-300 rounded-lg text-xs focus:border-blue-400 outline-none" />
              </div>
              <div className="relative flex-1">
                <Phone size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={customerContact} onChange={e => setCustomerContact(e.target.value)}
                  name="customerContact" placeholder="Phone / contact"
                  className="w-full pl-7 pr-2 py-2 border border-gray-300 rounded-lg text-xs focus:border-blue-400 outline-none" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5"><CreditCard size={12} /> Payment Method(s)</p>
              {splits.length < 4 && (
                <button type="button" onClick={addSplit}
                  className="flex items-center gap-1 text-xs text-green-700 font-semibold hover:text-green-800">
                  <PlusCircle size={13} /> Split
                </button>
              )}
            </div>
            {splits.map((sp) => (
              <div key={sp.id} className="flex gap-2 items-center">
                <select value={sp.method} onChange={e => updateSplit(sp.id, "method", e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-xs min-w-0">
                  <option value="">Method...</option>
                  {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.emoji} {m.label}</option>)}
                </select>
                <div className="relative">
                  <input type="number" min={0} max={total} step={1}
                    value={sp.amount || ""}
                    onChange={e => updateSplit(sp.id, "amount", Number(e.target.value))}
                    onFocus={() => { if (!sp.amount) autoFillRemaining(sp.id); }}
                    placeholder="Amount"
                    className="w-28 border border-gray-300 rounded-lg px-2 py-2 text-xs text-right pr-6" />
                  <button type="button" onClick={() => autoFillRemaining(sp.id)}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-[10px]" title="Auto-fill">↺</button>
                </div>
                {splits.length > 1 && (
                  <button type="button" onClick={() => removeSplit(sp.id)}
                    className="w-7 h-7 rounded-full bg-red-50 hover:bg-red-100 text-red-400 flex items-center justify-center shrink-0">
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            {splits.length > 1 && (
              <div className={`flex justify-between items-center text-xs px-3 py-2 rounded-lg font-semibold ${
                isBalanced ? "bg-green-50 text-green-700 border border-green-200" :
                remaining > 0 ? "bg-amber-50 text-amber-700 border border-amber-200" :
                "bg-red-50 text-red-700 border border-red-200"
              }`}>
                <span>{isBalanced ? "✓ Balanced" : remaining > 0 ? "Remaining:" : "Over by:"}</span>
                <span>{isBalanced ? "" : `KSh ${Math.abs(remaining).toLocaleString()}`}</span>
              </div>
            )}
          </div>

          {hasCredit && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 space-y-2.5">
              <p className="text-xs font-semibold text-orange-700 flex items-center gap-1.5">🏦 Credit Terms</p>
              <div>
                <label className="text-xs text-gray-600 font-medium block mb-1">Due Date (optional)</label>
                <input name="dueDate" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs" />
              </div>
              <div className="text-xs text-orange-600 bg-orange-100 rounded-lg px-3 py-2">
                💡 Credit balance: <span className="font-bold">KSh {Math.max(0, splits.find(s => s.method === "credit")?.amount ?? 0).toLocaleString()}</span> will be tracked
              </div>
            </div>
          )}

          <button type="submit" disabled={isPending || !canSubmit}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white py-3 font-bold rounded-xl flex items-center justify-center gap-2 text-sm">
            {isPending
              ? <Loader2 size={18} className="animate-spin" />
              : !canSell
              ? <><Lock size={16} /> Not authorised to sell here</>
              : hasCredit
              ? "🤝 Record Credit Sale"
              : `💳 Complete Sale · KSh ${total.toLocaleString()}`
            }
          </button>
        </form>
      </div>
    </div>
  );

  /* ── PRODUCT GRID ─────────────────────────────────────────── */
  const ProductGrid = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Shop browser tabs */}
      {ShopBrowser}

      {/* View-only banner when browsing another shop */}
      {isViewingOtherShop && (
        <div className="mx-4 mt-2 mb-0 flex items-center gap-2 rounded-xl bg-slate-100 border border-slate-200 px-3 py-2 text-xs text-slate-600 font-medium shrink-0">
          <Lock size={12} className="text-slate-400 shrink-0" />
          Viewing <span className="font-bold mx-1">{shops.find(s => s.id === viewingShopId)?.name}</span> — products here are for reference only. Switch back to <span className="font-bold mx-1">{shopName}</span> to add to cart.
        </div>
      )}

      <div className="p-4 pb-2 border-b shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm outline-none focus:border-green-500" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 md:grid-cols-3 gap-3 content-start">
        {filteredProducts.map(product => {
          const inCart     = cart.find(c => c.productId === product.id);
          const outOfStock = product.quantity === 0;
          const isOtherShop = product.shopId !== activeShopId;

          return (
            <button key={product.id} type="button"
              onClick={() => { if (!outOfStock && !isOtherShop) addToCart(product); }}
              disabled={outOfStock || isOtherShop}
              title={isOtherShop ? `From ${product.shopName} — view only` : undefined}
              className={`relative rounded-xl border p-3 text-left transition-all ${
                isOtherShop
                  ? "opacity-60 cursor-not-allowed border-slate-200 bg-slate-50"
                  : outOfStock
                  ? "opacity-40 cursor-not-allowed border-gray-200"
                  : inCart
                  ? "border-green-500 bg-green-50 shadow-sm"
                  : "border-gray-200 hover:border-green-400 hover:shadow-sm"
              }`}
            >
              {product.imageUrl
                ? <img src={product.imageUrl} alt={product.productName} className="w-full h-20 object-cover rounded-lg mb-2" />
                : <div className="w-full h-20 bg-gray-100 rounded-lg mb-2 flex items-center justify-center text-2xl">📦</div>
              }
              <div className="text-sm font-semibold text-gray-800 truncate">{product.productName}</div>
              <div className="text-sm font-bold text-green-700 mt-0.5">KSh {product.sellingPrice.toLocaleString()}</div>
              <div className={`text-xs mt-0.5 ${product.quantity <= 5 ? "text-red-500 font-medium" : "text-gray-400"}`}>
                Stock: {product.quantity}
              </div>
              {isOtherShop && (
                <div className="absolute top-2 left-2 bg-slate-600 text-white text-[0.6rem] rounded-full px-1.5 py-0.5 font-bold flex items-center gap-0.5">
                  <Lock size={8} /> view
                </div>
              )}
              {inCart && !isOtherShop && (
                <div className="absolute top-2 right-2 bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {inCart.quantity}
                </div>
              )}
            </button>
          );
        })}
        {filteredProducts.length === 0 && (
          <div className="col-span-2 md:col-span-3 py-20 text-center text-gray-400">No products found</div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
      <div className="w-full max-w-5xl h-full bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 border-b px-4 py-3 bg-white shrink-0">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 shrink-0"><ArrowLeft size={22} /></button>
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <ShoppingCart size={20} className="text-green-600" /> Make Sale
          </h2>
          <div className="ml-auto flex items-center gap-2 flex-wrap justify-end">
            <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg hidden sm:inline">{shopName || "—"}</span>
            {!canSell && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-full px-3 py-1">
                <Lock size={11} /> View only
              </span>
            )}
            <span className="text-sm text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg hidden sm:inline">👤 {profile.fullName}</span>
          </div>
        </div>

        <div className="flex border-b md:hidden shrink-0">
          <button onClick={() => setMobileTab("products")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${mobileTab === "products" ? "border-b-2 border-green-600 text-green-700" : "text-gray-500"}`}>
            <Package size={16} /> Products
          </button>
          <button onClick={() => setMobileTab("cart")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-semibold transition-colors ${mobileTab === "cart" ? "border-b-2 border-green-600 text-green-700" : "text-gray-500"}`}>
            <ShoppingCart size={16} /> Cart
            {totalItems > 0 && (
              <span className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">{totalItems}</span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-hidden md:hidden">{mobileTab === "products" ? ProductGrid : CartPanel}</div>
        <div className="hidden md:flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden border-r">{ProductGrid}</div>
          <div className="w-full max-w-sm flex flex-col overflow-hidden">{CartPanel}</div>
        </div>
      </div>
    </div>
  );
}