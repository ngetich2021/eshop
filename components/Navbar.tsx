// components/Navbar.tsx
"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";

import { RiDashboard3Line } from "react-icons/ri";
import { FaUserShield, FaShop } from "react-icons/fa6";
import { FaMoneyBillTrendUp } from "react-icons/fa6";
import { MdVideogameAsset } from "react-icons/md";
import { IoIosNotificationsOutline, IoIosLogOut } from "react-icons/io";
import { IoChevronDown, IoChevronUp } from "react-icons/io5";
import { AiFillProduct } from "react-icons/ai";
import { FcSalesPerformance } from "react-icons/fc";
import { SiAwssecretsmanager } from "react-icons/si";
import { GiBuyCard } from "react-icons/gi";
import { ShieldOff, Menu, X, ChevronRight } from "lucide-react";

import { parseAllowedRoutes, isRouteAllowed } from "@/lib/permissions";
import Profile from "./Profile";

// ── CSS custom properties injected once ───────────────────────────────────────
const SIDEBAR_EXPANDED = 240;
const SIDEBAR_COLLAPSED = 64;
const TOPBAR_HEIGHT = 56;

// ── Types ─────────────────────────────────────────────────────────────────────
type SubLink = { title: string; href: string };
type NavLink =
  | { id: number; title: string; sectionPrefix: string; href: string; icon: React.ReactNode; submenu?: never }
  | { id: number; title: string; sectionPrefix: string; icon: React.ReactNode; submenu: SubLink[]; href?: never };

const ALL_NAV_LINKS: NavLink[] = [
  { id: 1,  title: "dashboard",  sectionPrefix: "/dashboard", href: "/dashboard", icon: <RiDashboard3Line size={20} /> },
  { id: 2,  title: "inventory",  sectionPrefix: "/inventory", icon: <AiFillProduct size={20} />,
    submenu: [{ title: "products", href: "/inventory/products" }, { title: "adjust stock", href: "/inventory/stock" }] },
  { id: 3,  title: "sales",      sectionPrefix: "/sales",    icon: <FcSalesPerformance size={20} />,
    submenu: [{ title: "sold", href: "/sales/sold" }, { title: "quote", href: "/sales/quote" }] },
  { id: 4,  title: "finance",    sectionPrefix: "/finance",  icon: <FaMoneyBillTrendUp size={20} />,
    submenu: [
      { title: "payments", href: "/finance/payments" }, { title: "expenses", href: "/finance/expenses" },
      { title: "credit",   href: "/finance/credit"   }, { title: "advance",  href: "/finance/advance"  },
      { title: "salary",   href: "/finance/salary"   }, { title: "wallet",   href: "/finance/wallet"   },
      { title: "margin",   href: "/finance/margin"   },
    ],
  },
  { id: 5,  title: "suppliers",  sectionPrefix: "/suppliers", href: "/suppliers",  icon: <FaUserShield size={20} /> },
  { id: 6,  title: "hr",         sectionPrefix: "/hr",        icon: <SiAwssecretsmanager size={20} />,
    submenu: [
      { title: "staff",      href: "/hr/staff"  }, { title: "payroll",    href: "/hr/payrol" },
      { title: "advance",    href: "/hr/advance" }, { title: "salary",    href: "/hr/salary"  },
      { title: "login info", href: "/hr/logs"   },
    ],
  },
  { id: 7,  title: "reports",    sectionPrefix: "/reports", href: "/reports", icon: <RiDashboard3Line size={20} /> },
  { id: 8,  title: "assets",     sectionPrefix: "/assets",  href: "/assets",  icon: <MdVideogameAsset size={20} /> },
  { id: 9,  title: "buy",        sectionPrefix: "/buy",     href: "/buy",     icon: <GiBuyCard size={20} /> },
  { id: 10, title: "shops",      sectionPrefix: "/shops",   href: "/shops",   icon: <FaShop size={20} /> },
];

function filterNavLinks(role: string, allowedRoutes: string[]): NavLink[] {
  if (role === "admin") return ALL_NAV_LINKS;
  if (role !== "staff") return [];
  return ALL_NAV_LINKS.filter((link) => isRouteAllowed(link.sectionPrefix, role, allowedRoutes));
}

// ── Tooltip for collapsed icons ───────────────────────────────────────────────
function IconTooltip({ label }: { label: string }) {
  return (
    <span className="
      absolute left-full ml-3 top-1/2 -translate-y-1/2
      bg-gray-900 text-white text-xs font-semibold
      px-2.5 py-1.5 rounded-lg whitespace-nowrap
      opacity-0 group-hover:opacity-100 pointer-events-none
      transition-opacity duration-150 z-[999]
      shadow-lg
    ">
      {label}
      <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
    </span>
  );
}

// ── Main Navbar ───────────────────────────────────────────────────────────────
export default function Navbar() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
  const [showProfile, setShowProfile] = useState(false);

  const pathname = usePathname();
  const { data: session } = useSession();

  const user          = session?.user as { role?: string; designation?: string; allowedRoutes?: unknown } | undefined;
  const role          = (user?.role ?? "user").toLowerCase().trim();
  const designation   = user?.designation ?? null;
  const allowedRoutes = parseAllowedRoutes(user?.allowedRoutes);
  const isAdmin       = role === "admin";

  const visibleLinks = filterNavLinks(role, allowedRoutes);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const toggleSubmenu = (title: string) =>
    setOpenMenus((prev) => ({ ...prev, [title]: !prev[title] }));

  // Keep --sidebar-w in sync — runs on mount AND every collapse toggle
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-w",
      `${collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED}px`
    );
  }, [collapsed]);

  // Auto-open submenu for active path
  useEffect(() => {
    visibleLinks.forEach((link) => {
      if (link.submenu?.some((sub) => isActive(sub.href))) {
        setOpenMenus((prev) => ({ ...prev, [link.title]: true }));
      }
    });
    setMobileOpen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (!showProfile) return;
    const close = () => setShowProfile(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showProfile]);

  // Close mobile drawer on outside click
  useEffect(() => {
    if (!mobileOpen) return;
    const close = (e: MouseEvent) => {
      const drawer = document.getElementById("mobile-drawer");
      if (drawer && !drawer.contains(e.target as Node)) setMobileOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [mobileOpen]);

  // ── Shared nav list ────────────────────────────────────────────────────────
  const NavList = ({ inDrawer = false }: { inDrawer?: boolean }) => (
    <ul className="flex flex-col gap-0.5 py-3 px-2 flex-1 overflow-y-auto">
      {visibleLinks.map((link) => {
        const hasSub = !!link.submenu;
        const isSubActive = hasSub && link.submenu?.some((s) => isActive(s.href));
        const showLabel = inDrawer || !collapsed;

        if (hasSub) {
          return (
            <li key={link.id} className="relative group">
              <button
                type="button"
                onClick={() => toggleSubmenu(link.title)}
                className={`
                  w-full flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150
                  ${isSubActive
                    ? "bg-indigo-50 text-indigo-700 font-bold"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}
                  ${!showLabel ? "justify-center" : "justify-between"}
                `}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="flex-shrink-0">{link.icon}</span>
                  {showLabel && (
                    <span className="text-[0.8rem] font-semibold capitalize truncate">{link.title}</span>
                  )}
                </div>
                {showLabel && (
                  openMenus[link.title] ? <IoChevronUp size={13} /> : <IoChevronDown size={13} />
                )}
              </button>

              {/* Tooltip when collapsed */}
              {!showLabel && <IconTooltip label={link.title} />}

              {/* Submenu */}
              {showLabel && openMenus[link.title] && (
                <ul className="ml-9 mt-0.5 flex flex-col gap-0.5">
                  {link.submenu!.map((sub) => (
                    <li key={sub.href}>
                      <Link
                        href={sub.href}
                        className={`
                          flex items-center gap-2 rounded-lg px-3 py-2 text-[0.75rem] capitalize transition-all
                          ${isActive(sub.href)
                            ? "bg-indigo-100 text-indigo-700 font-semibold"
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}
                        `}
                      >
                        <ChevronRight size={11} className="flex-shrink-0 opacity-50" />
                        {sub.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        }

        return (
          <li key={link.id} className="relative group">
            <Link
              href={link.href!}
              className={`
                flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-150
                ${isActive(link.href!)
                  ? "bg-indigo-50 text-indigo-700 font-bold"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}
                ${!showLabel ? "justify-center" : ""}
              `}
            >
              <span className="flex-shrink-0">{link.icon}</span>
              {showLabel && (
                <span className="text-[0.8rem] font-semibold capitalize">{link.title}</span>
              )}
            </Link>
            {!showLabel && <IconTooltip label={link.title} />}
          </li>
        );
      })}

      {/* No access warning */}
      {!isAdmin && role === "staff" && visibleLinks.length === 0 && (inDrawer || !collapsed) && (
        <li>
          <div className="flex items-start gap-2.5 px-3 py-3 rounded-xl bg-amber-50 border border-amber-200 mx-1">
            <ShieldOff size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <span className="text-[0.72rem] text-amber-700 font-medium leading-tight">
              No sections assigned. Contact your admin.
            </span>
          </div>
        </li>
      )}
    </ul>
  );

  return (
    <>
      {/* ── TOP BAR ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shadow-sm"
        style={{ height: TOPBAR_HEIGHT }}
      >
        {/* Left: logo + collapse toggle */}
        <div className="flex items-center gap-3">
          {/* Hamburger — mobile only */}
          <button
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
            onClick={() => setMobileOpen((p) => !p)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Logo */}
          <div className="relative h-9 w-9 flex-shrink-0">
            <Image
              src="/branton_logo.png"
              alt="Logo"
              fill
              className="object-cover rounded-full border border-gray-300"
            />
          </div>

          {/* Collapse toggle — desktop only */}
          <button
            className="hidden md:flex p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            onClick={() => setCollapsed((p) => !p)}
            aria-label="Collapse sidebar"
          >
            <Menu size={19} />
          </button>
        </div>

        {/* Right: notifications + badge + avatar */}
        <div className="flex items-center gap-3">
          {/* Notifications */}
          <div className="relative">
            <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <IoIosNotificationsOutline size={22} className="text-gray-600" />
            </button>
            <span className="absolute top-0.5 right-0.5 h-4 w-4 bg-red-500 text-white text-[0.55rem] font-bold rounded-full border border-white flex items-center justify-center">
              20
            </span>
          </div>

          {/* Role badge — hidden on very small screens */}
          {session && (
            <div className="hidden sm:flex items-center gap-1.5">
              {isAdmin ? (
                <span className="text-[0.68rem] bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">Admin</span>
              ) : designation ? (
                <span className="text-[0.68rem] bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full capitalize">{designation}</span>
              ) : (
                <span className="text-[0.68rem] bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded-full capitalize">{role}</span>
              )}
              {!isAdmin && role === "staff" && (
                <span className="text-[0.62rem] bg-blue-50 text-blue-600 font-medium px-1.5 py-0.5 rounded-full border border-blue-200">
                  {allowedRoutes.length}s
                </span>
              )}
            </div>
          )}

          {/* "Hey name" */}
          {session && (
            <span className="hidden md:block text-[0.78rem] font-semibold text-gray-700 whitespace-nowrap">
              Hey, {session.user?.name?.split(" ")[0]}
            </span>
          )}

          {/* Avatar */}
          {session && (
            <div className="relative">
              <button
                onClick={(e) => { e.stopPropagation(); setShowProfile((p) => !p); }}
                className="relative w-8 h-8 rounded-full overflow-hidden border-2 border-gray-200 hover:border-indigo-400 transition-colors"
              >
                <Image
                  src={session.user?.image ?? "/branton_logo.png"}
                  alt="User"
                  fill
                  className="object-cover"
                />
              </button>
              {showProfile && <Profile />}
            </div>
          )}
        </div>
      </header>

      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        className="
          hidden md:flex flex-col fixed z-40 bg-white border-r border-gray-200
          transition-[width] duration-200 ease-in-out overflow-hidden
        "
        style={{
          top: TOPBAR_HEIGHT,
          bottom: 0,
          width: collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED,
        }}
      >
        <NavList />

        {/* Logout */}
        <div className="border-t border-gray-100 px-2 py-3">
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className={`
              flex items-center gap-3 w-full rounded-xl px-3 py-2.5
              text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150
              ${collapsed ? "justify-center" : ""}
            `}
          >
            <IoIosLogOut size={20} className="flex-shrink-0" />
            {!collapsed && <span className="text-[0.8rem] font-semibold">Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── MOBILE DRAWER OVERLAY ── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[60] flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Drawer */}
          <div
            id="mobile-drawer"
            className="relative z-10 flex flex-col bg-white shadow-2xl"
            style={{ width: SIDEBAR_EXPANDED, top: 0, bottom: 0 }}
          >
            {/* Drawer header */}
            <div className="flex items-center justify-between px-4 border-b border-gray-100"
              style={{ height: TOPBAR_HEIGHT }}>
              <div className="flex items-center gap-2.5">
                <div className="relative h-8 w-8 flex-shrink-0">
                  <Image src="/branton_logo.png" alt="Logo" fill className="object-cover rounded-full border border-gray-300" />
                </div>
                <span className="text-sm font-bold text-gray-800">Kwenik</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
              >
                <X size={18} />
              </button>
            </div>

            {/* Nav list */}
            <div className="flex-1 overflow-y-auto">
              <NavList inDrawer />
            </div>

            {/* Logout */}
            <div className="border-t border-gray-100 px-2 py-3">
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all"
              >
                <IoIosLogOut size={20} />
                <span className="text-[0.8rem] font-semibold">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}