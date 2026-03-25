"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";

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

// Discriminated union — page.tsx decides which role to pass
type Props =
  | { role: "owner"; user: OwnerUser }
  | { role: "staff"; user: { id: string; name: string | null }; staffShop: Shop };

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
  if (amount >= 1)   return { bg: "#ca8a04", glow: "#ca8a0455", label: "1 – 999"  };
  return               { bg: "#dc2626", glow: "#dc262655", label: "No Sales"  };
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
      display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16,
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ width: 44, height: 44, border: "3px solid rgba(99,102,241,0.15)", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a" }}>
        Welcome back, <span style={{ color: "#6366f1" }}>{name?.split(" ")[0] ?? "there"}</span>
      </div>
      <div style={{ fontSize: "0.82rem", color: "#64748b" }}>
        Taking you to <strong style={{ color: "#0f172a" }}>{shopName}</strong>…
      </div>
    </div>
  );
}

// ─── SHOP CARD ────────────────────────────────────────────────────────────────
function ShopCard({ shop, index, onClick }: { shop: Shop; index: number; onClick: (s: Shop) => void }) {
  const total = shopTodaySales(shop);
  const t = tier(total);
  const [hov, setHov] = useState(false);

  return (
    <button
      onClick={() => onClick(shop)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.75)",
        backdropFilter: "blur(16px)",
        borderRadius: 18,
        borderTop: `3px solid ${t.bg}`,
        border: `1.5px solid ${hov ? t.bg + "55" : "rgba(99,102,241,0.12)"}`,
        padding: "20px 18px 16px",
        textAlign: "left",
        cursor: "pointer",
        transform: hov ? "translateY(-6px) scale(1.02)" : "none",
        boxShadow: hov
          ? `0 20px 48px ${t.glow}, 0 4px 16px rgba(0,0,0,0.07)`
          : "0 2px 16px rgba(99,102,241,0.07), 0 1px 4px rgba(0,0,0,0.04)",
        transition: "all 0.22s cubic-bezier(.34,1.56,.64,1)",
        opacity: 0,
        animation: "fadeUp 0.38s ease forwards",
        animationDelay: `${index * 0.08}s`,
        minWidth: 0,
      }}
    >
      <div style={{ fontWeight: 800, fontSize: "1.05rem", color: "#0f172a", letterSpacing: "-0.02em", marginBottom: 3 }}>{shop.name}</div>
      <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: 10 }}>{shop.tel}</div>
      <div style={{ fontSize: "0.72rem", color: "#475569", fontWeight: 600, marginBottom: 14 }}>📍 {shop.location}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
        <div style={{ background: `${t.bg}18`, border: `1px solid ${t.bg}40`, borderRadius: 8, padding: "4px 10px", fontSize: "0.7rem", color: t.bg, fontWeight: 800 }}>
          Today: {kes(total)}
        </div>
        <div style={{ background: "rgba(99,102,241,0.08)", borderRadius: 7, padding: "3px 8px", fontSize: "0.67rem", color: "#6366f1", fontWeight: 700 }}>
          {shop.staffs.length} staff
        </div>
      </div>
    </button>
  );
}

// ─── WELCOME PAGE (owner only) ────────────────────────────────────────────────
function WelcomePage({ user, onSelect }: { user: OwnerUser; onSelect: (s: Shop) => void }) {
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
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #f0f4ff 0%, #fafcff 40%, #f5f0ff 100%)", fontFamily: "'DM Sans','Segoe UI',sans-serif", position: "relative", overflow: "hidden" }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes drift  { 0%,100%{transform:translate(0,0) scale(1)} 50%{transform:translate(30px,-20px) scale(1.05)} }
        input::placeholder { color: #aab4cc; }
        input:focus { border-color: #6366f1 !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.12); }
      `}</style>

      {/* Blobs */}
      <div style={{ position: "fixed", top: -160, right: -100, width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", animation: "drift 12s ease-in-out infinite", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: -120, left: -80, width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 70%)", animation: "drift 16s ease-in-out infinite reverse", pointerEvents: "none" }} />
      <div style={{ position: "fixed", top: "40%", left: "30%", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(236,72,153,0.06) 0%, transparent 70%)", pointerEvents: "none" }} />

      <header style={{ padding: "32px 44px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12, position: "relative" }}>
        <div>
          <div style={{ fontSize: "0.62rem", letterSpacing: "0.22em", textTransform: "uppercase", color: "#6366f1", fontWeight: 800, marginBottom: 7, background: "rgba(99,102,241,0.08)", display: "inline-block", padding: "3px 10px", borderRadius: 6 }}>BizTrack KE</div>
          <h1 style={{ margin: 0, fontSize: "clamp(1.4rem,3vw,2rem)", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.04em", lineHeight: 1.15 }}>
            Hey <span style={{ color: "#6366f1" }}>{user.name?.split(" ")[0] ?? "there"}</span>{" "}
            <span style={{ fontWeight: 400, color: "#94a3b8", fontSize: "0.65em" }}>how is your day?</span>
          </h1>
        </div>
        <div style={{ textAlign: "right", background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", borderRadius: 14, padding: "12px 18px", border: "1px solid rgba(99,102,241,0.12)", boxShadow: "0 2px 16px rgba(99,102,241,0.08)" }}>
          <div style={{ color: "#f43f5e", fontWeight: 800, fontSize: "0.88rem" }}>Welcome to Shop Page</div>
          <div style={{ color: "#94a3b8", fontSize: "0.68rem", marginTop: 4 }}>
            {new Date().toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </div>
        </div>
      </header>

      <div style={{ padding: "26px 44px 0", display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", position: "relative" }}>
        <div style={{ position: "relative" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#aab4cc" }}>🔍</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search shop or location…"
            style={{ padding: "11px 16px 11px 36px", borderRadius: 12, border: "1.5px solid rgba(99,102,241,0.18)", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(8px)", color: "#0f172a", fontSize: "0.83rem", outline: "none", fontFamily: "inherit", width: 240, boxShadow: "0 2px 12px rgba(99,102,241,0.07)", transition: "all 0.2s" }}
          />
        </div>
        <span style={{ color: "#6366f1", fontWeight: 700, fontSize: "0.82rem", background: "rgba(99,102,241,0.08)", padding: "6px 12px", borderRadius: 8 }}>👆 Click any shop to visit</span>
      </div>

      <div style={{ padding: "14px 44px 0", display: "flex", gap: 10, flexWrap: "wrap", position: "relative" }}>
        {[{ c: "#16a34a", l: "Today > KES 1,000" }, { c: "#ca8a04", l: "KES 1 – 999" }, { c: "#dc2626", l: "No Sales (KES 0)" }].map(({ c, l }) => (
          <div key={c} style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.75)", backdropFilter: "blur(8px)", border: `1px solid ${c}30`, borderRadius: 8, padding: "5px 12px", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
            <span style={{ color: "#475569", fontSize: "0.68rem", fontWeight: 600 }}>{l}</span>
          </div>
        ))}
      </div>

      <main style={{ padding: "22px 44px 60px", position: "relative" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(195px,1fr))", gap: 16 }}>
          {filtered.map((shop, i) => (
            <ShopCard key={shop.id} shop={shop} index={i} onClick={onSelect} />
          ))}
        </div>
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", color: "#94a3b8", marginTop: 80, fontSize: "0.9rem" }}>No shops match your search.</div>
        )}
      </main>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function ShopPortal(props: Props) {
  const router = useRouter();

  // Staff: fire redirect immediately on mount
  useEffect(() => {
    if (props.role === "staff") {
      router.replace(`/dashboard?shopId=${props.staffShop.id}`);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (props.role === "staff") {
    return <RedirectingScreen name={props.user.name} shopName={props.staffShop.name} />;
  }

  return (
    <WelcomePage
      user={props.user}
      onSelect={(shop) => router.push(`/dashboard?shopId=${shop.id}`)}
    />
  );
}