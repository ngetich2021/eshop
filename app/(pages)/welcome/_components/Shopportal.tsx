// app/shops/_components/Shopportal.tsx
"use client";

import { useState, useMemo, useEffect, useTransition } from "react";
import { selectShopAction } from "./actions";
import { signOut } from "next-auth/react";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type StaffMember = {
  id: string;
  userId: string;
  fullName: string;
  tel1: string;
  tel2: string | null;
  mpesaNo: string | null;
  baseSalary: number;
};

type Sale = {
  soldById: string;
  totalAmount: number;
  createdAt: Date | string;
};

type Shop = {
  id: string;
  name: string;
  tel: string;
  location: string;
  wallet: { balance: number } | null;
  staffs: StaffMember[];
  sales: Sale[];
  expenses: { amount: number }[];
  buys: { totalAmount: number }[];
  margins: { value: number }[];
  credits: { status: string }[];
};

type OwnerUser = {
  id: string;
  name: string | null;
  shops: Shop[];
};

type Props =
  | {
      role: "owner";
      user: OwnerUser;
      selectAction?: (id: string) => Promise<void>;
    }
  | {
      role: "staff";
      user: { id: string; name: string | null };
      staffShop: Shop;
      selectAction?: (id: string) => Promise<void>;
    };

// ─── SIGN OUT BUTTON ──────────────────────────────────────────────────────────
export const SignOutButton = () => {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
    >
      <span>Sign Out</span>
      <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4V7m-4 4V7" />
      </svg>
    </button>
  );
};

// ─── UTILS ────────────────────────────────────────────────────────────────────
const kes = (n: number) => `KES ${Number(n || 0).toLocaleString()}`;

const isToday = (date: Date | string) => {
  const d = new Date(date);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
};

const tier = (amount: number) => {
  if (amount > 1000) return { bg: "#16a34a", glow: "#16a34a55", label: "Above 1K" };
  if (amount >= 1)   return { bg: "#ca8a04", glow: "#ca8a0455", label: "1 – 999" };
  return               { bg: "#dc2626", glow: "#dc262655", label: "No Sales" };
};

const shopTodaySales = (shop: Shop) =>
  shop.sales
    .filter((s) => isToday(s.createdAt))
    .reduce((sum, s) => sum + s.totalAmount, 0);

// ─── REDIRECTING SCREEN ───────────────────────────────────────────────────────
function RedirectingScreen({ name, shopName }: { name: string | null; shopName: string }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f0f4ff 0%, #fafcff 40%, #f5f0ff 100%)",
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 16,
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ width: 40, height: 40, border: "3px solid rgba(99,102,241,0.15)", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a" }}>
        Welcome back, <span style={{ color: "#6366f1" }}>{name?.split(" ")[0] ?? "there"}</span>
      </div>
      <div style={{ fontSize: "0.8rem", color: "#64748b" }}>
        Taking you to <strong style={{ color: "#0f172a" }}>{shopName}</strong>…
      </div>
    </div>
  );
}

// ─── SELECTING SCREEN ─────────────────────────────────────────────────────────
function SelectingScreen({ shopName }: { shopName: string }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f0f4ff 0%, #fafcff 40%, #f5f0ff 100%)",
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 16,
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ width: 40, height: 40, border: "3px solid rgba(99,102,241,0.15)", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0f172a" }}>
        Opening <span style={{ color: "#6366f1" }}>{shopName}</span>…
      </div>
      <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Setting up your dashboard</div>
    </div>
  );
}

// ─── SHOP CARD ────────────────────────────────────────────────────────────────
function ShopCard({
  shop, index, onClick, loading,
}: {
  shop: Shop;
  index: number;
  onClick: (s: Shop) => void;
  loading: boolean;
}) {
  const total = shopTodaySales(shop);
  const t = tier(total);
  const [hov, setHov] = useState(false);

  return (
    <button
      onClick={() => !loading && onClick(shop)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      disabled={loading}
      style={{
        background: hov ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.75)",
        backdropFilter: "blur(16px)",
        borderRadius: 14,
        borderTop: `3px solid ${t.bg}`,
        border: `1.5px solid ${hov ? t.bg + "55" : "rgba(99,102,241,0.12)"}`,
        padding: "12px 12px 10px",
        textAlign: "left",
        cursor: loading ? "not-allowed" : "pointer",
        transform: hov && !loading ? "translateY(-4px) scale(1.02)" : "none",
        boxShadow: hov
          ? `0 16px 36px ${t.glow}, 0 4px 12px rgba(0,0,0,0.07)`
          : "0 2px 12px rgba(99,102,241,0.07), 0 1px 4px rgba(0,0,0,0.04)",
        transition: "all 0.22s cubic-bezier(.34,1.56,.64,1)",
        opacity: loading ? 0.6 : 1,
        animation: "fadeUp 0.38s ease forwards",
        animationDelay: `${index * 0.06}s`,
        minWidth: 0,
        width: "100%",
      }}
    >
      {/* Shop name */}
      <div style={{
        fontWeight: 800,
        fontSize: "clamp(0.78rem, 2.5vw, 1rem)",
        color: "#0f172a",
        letterSpacing: "-0.02em",
        marginBottom: 2,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        {shop.name}
      </div>

      {/* Tel */}
      <div style={{ fontSize: "clamp(0.62rem, 1.8vw, 0.72rem)", color: "#64748b", marginBottom: 6 }}>
        {shop.tel}
      </div>

      {/* Location */}
      <div style={{
        fontSize: "clamp(0.6rem, 1.8vw, 0.7rem)",
        color: "#475569",
        fontWeight: 600,
        marginBottom: 8,
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}>
        📍 {shop.location}
      </div>

      {/* Bottom row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
        <div style={{
          background: `${t.bg}18`,
          border: `1px solid ${t.bg}40`,
          borderRadius: 6,
          padding: "3px 7px",
          fontSize: "clamp(0.58rem, 1.6vw, 0.68rem)",
          color: t.bg,
          fontWeight: 800,
          whiteSpace: "nowrap",
        }}>
          {kes(total)}
        </div>
        <div style={{
          background: "rgba(99,102,241,0.08)",
          borderRadius: 6,
          padding: "3px 7px",
          fontSize: "clamp(0.56rem, 1.5vw, 0.65rem)",
          color: "#6366f1",
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}>
          {shop.staffs.length} staff
        </div>
      </div>
    </button>
  );
}

// ─── WELCOME PAGE ─────────────────────────────────────────────────────────────
function WelcomePage({
  user, onSelect, isPending,
}: {
  user: OwnerUser;
  onSelect: (s: Shop) => void;
  isPending: boolean;
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(
    () => user.shops.filter(
      (s) =>
        s.name.toLowerCase().includes(q.toLowerCase()) ||
        s.location.toLowerCase().includes(q.toLowerCase())
    ),
    [user.shops, q]
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f0f4ff 0%, #fafcff 40%, #f5f0ff 100%)",
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes drift  { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-20px) scale(1.05)} }
        input::placeholder { color: #aab4cc; }
        input:focus { outline: none; border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
      `}</style>

      {/* Background blobs — hidden on mobile for perf */}
      <div style={{ position: "fixed", top: -160, right: -100, width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", animation: "drift 12s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: -120, left: -80, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 70%)", animation: "drift 16s ease-in-out infinite reverse", pointerEvents: "none" }} />

      {/* ── HEADER ── */}
      <header style={{
        padding: "clamp(16px, 4vw, 32px) clamp(16px, 5vw, 44px) 0",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}>

        {/* Row 1: BizTrack badge + greeting on left, Sign Out pinned right */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: "clamp(0.52rem, 1.5vw, 0.62rem)",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#6366f1",
              fontWeight: 800,
              marginBottom: 4,
              background: "rgba(99,102,241,0.08)",
              display: "inline-block",
              padding: "2px 8px",
              borderRadius: 5,
            }}>
              BizTrack KE
            </div>
            <h1 style={{
              margin: 0,
              fontSize: "clamp(1.1rem, 4vw, 1.9rem)",
              fontWeight: 800,
              color: "#0f172a",
              letterSpacing: "-0.03em",
              lineHeight: 1.2,
            }}>
              Hey <span style={{ color: "#6366f1" }}>{user.name?.split(" ")[0] ?? "there"}</span>{" "}
              <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: "0.6em" }}>how is your day?</span>
            </h1>
          </div>

          {/* Sign Out — pinned to the right of the greeting row */}
          <div style={{ flexShrink: 0 }}>
            <SignOutButton />
          </div>
        </div>

        {/* Row 2: Welcome banner — centred */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{
            textAlign: "center",
            background: "rgba(255,255,255,0.7)",
            backdropFilter: "blur(12px)",
            borderRadius: 12,
            padding: "8px 20px",
            border: "1px solid rgba(99,102,241,0.12)",
            boxShadow: "0 2px 12px rgba(99,102,241,0.08)",
          }}>
            <div style={{ color: "#f43f5e", fontWeight: 800, fontSize: "clamp(0.7rem, 2vw, 0.85rem)" }}>
              Welcome to Shop Page
            </div>
            <div style={{ color: "#94a3b8", fontSize: "clamp(0.58rem, 1.5vw, 0.67rem)", marginTop: 3 }}>
              {new Date().toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
            </div>
          </div>
        </div>

      </header>

      {/* ── SEARCH + HINT ── */}
      <div style={{
        padding: "16px clamp(16px, 5vw, 44px) 0",
        display: "flex",
        alignItems: "center",
        gap: 10,
        flexWrap: "wrap",
        position: "relative",
      }}>
        <div style={{ position: "relative", flex: "1 1 160px", maxWidth: 280 }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#aab4cc", fontSize: "0.8rem" }}>🔍</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search shop or location…"
            style={{
              padding: "9px 12px 9px 32px",
              borderRadius: 10,
              border: "1.5px solid rgba(99,102,241,0.18)",
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(8px)",
              color: "#0f172a",
              fontSize: "clamp(0.72rem, 2vw, 0.82rem)",
              fontFamily: "inherit",
              width: "100%",
              boxShadow: "0 2px 10px rgba(99,102,241,0.07)",
              transition: "all 0.2s",
              boxSizing: "border-box",
            }}
          />
        </div>
        <span style={{
          color: "#6366f1",
          fontWeight: 700,
          fontSize: "clamp(0.62rem, 1.8vw, 0.78rem)",
          background: "rgba(99,102,241,0.08)",
          padding: "5px 10px",
          borderRadius: 7,
          whiteSpace: "nowrap",
        }}>
          👆 Tap a shop to visit
        </span>
      </div>

      {/* ── LEGEND ── */}
      <div style={{
        padding: "10px clamp(16px, 5vw, 44px) 0",
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        position: "relative",
      }}>
        {[
          { c: "#16a34a", l: "> KES 1,000" },
          { c: "#ca8a04", l: "KES 1–999" },
          { c: "#dc2626", l: "No Sales" },
        ].map(({ c, l }) => (
          <div key={c} style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: "rgba(255,255,255,0.75)",
            backdropFilter: "blur(8px)",
            border: `1px solid ${c}30`,
            borderRadius: 7,
            padding: "4px 9px",
            boxShadow: "0 1px 5px rgba(0,0,0,0.05)",
          }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: c, flexShrink: 0 }} />
            <span style={{ color: "#475569", fontSize: "clamp(0.58rem, 1.5vw, 0.67rem)", fontWeight: 600 }}>{l}</span>
          </div>
        ))}
      </div>

      {/* ── GRID ── */}
      <main style={{ padding: "16px clamp(16px, 5vw, 44px) 60px", position: "relative" }}>
        <div style={{
          display: "grid",
          // 2 columns on mobile, auto-fill with min 180px on larger screens
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "clamp(8px, 2vw, 14px)",
        }}
          // Override to auto-fill on md+
          className="shop-grid"
        >
          {filtered.map((shop, i) => (
            <ShopCard key={shop.id} shop={shop} index={i} onClick={onSelect} loading={isPending} />
          ))}
        </div>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", color: "#94a3b8", marginTop: 60, fontSize: "0.85rem" }}>
            No shops match your search.
          </div>
        )}
      </main>

      {/* Responsive grid override */}
      <style>{`
        @media (min-width: 640px) {
          .shop-grid { grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)) !important; }
        }
        @media (min-width: 1024px) {
          .shop-grid { grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)) !important; }
        }
      `}</style>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function ShopPortal(props: Props) {
  const [isPending, startTransition] = useTransition();
  const [selectingShop, setSelectingShop] = useState<Shop | null>(null);

  const resolvedAction = props.selectAction ?? selectShopAction;

  useEffect(() => {
    if (props.role === "staff") {
      startTransition(async () => {
        await resolvedAction(props.staffShop.id);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (props.role === "staff") {
    return <RedirectingScreen name={props.user.name} shopName={props.staffShop.name} />;
  }

  if (selectingShop) {
    return <SelectingScreen shopName={selectingShop.name} />;
  }

  const handleSelect = (shop: Shop) => {
    setSelectingShop(shop);
    startTransition(async () => {
      await resolvedAction(shop.id);
    });
  };

  return (
    <WelcomePage
      user={props.user}
      onSelect={handleSelect}
      isPending={isPending}
    />
  );
}