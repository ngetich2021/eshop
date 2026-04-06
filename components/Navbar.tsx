"use client";

/**
 * Navbar.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Top bar + collapsible desktop sidebar + mobile drawer.
 * Includes:
 *   • Globe language picker (10 languages, searchable)
 *   • Accessibility panel (font size, high contrast, reduced motion)
 *
 * Fix: NavList is defined outside Navbar so it is never remounted on re-render.
 *      useOutsideClick skips the toggle button itself to prevent double-fire.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type JSX,
} from "react";
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
import {
  ShieldOff,
  Menu,
  X,
  ChevronRight,
  Globe,
  Accessibility,
  Type,
  Contrast,
  Zap,
  Check,
  Search,
} from "lucide-react";

import { parseAllowedRoutes, isRouteAllowed } from "@/lib/permissions";
import Profile from "./Profile";
import {
  FontSize,
  Language,
  LANGUAGES,
  useAccessibility,
  useLanguage,
} from "./AppContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const SIDEBAR_EXPANDED  = 240 as const;
const SIDEBAR_COLLAPSED = 64  as const;
const TOPBAR_HEIGHT     = 56  as const;

// ─── Nav link types ───────────────────────────────────────────────────────────

interface SubLink {
  title: string;
  href:  string;
}

type NavLinkBase = {
  id:            number;
  title:         string;
  sectionPrefix: string;
  icon:          JSX.Element;
};

type SimpleNavLink = NavLinkBase & { href: string; submenu?: never };
type GroupNavLink  = NavLinkBase & { submenu: SubLink[]; href?: never };
type NavLink       = SimpleNavLink | GroupNavLink;

// ─── Static nav data ──────────────────────────────────────────────────────────

const ALL_NAV_LINKS: NavLink[] = [
  {
    id: 1, title: "dashboard", sectionPrefix: "/dashboard",
    href: "/dashboard", icon: <RiDashboard3Line size={20} />,
  },
  {
    id: 2, title: "inventory", sectionPrefix: "/inventory",
    icon: <AiFillProduct size={20} />,
    submenu: [
      { title: "products",     href: "/inventory/products" },
      { title: "adjust stock", href: "/inventory/stock"    },
    ],
  },
  {
    id: 3, title: "sales", sectionPrefix: "/sales",
    icon: <FcSalesPerformance size={20} />,
    submenu: [
      { title: "sold",  href: "/sales/sold"  },
      { title: "quote", href: "/sales/quote" },
    ],
  },
  {
    id: 4, title: "finance", sectionPrefix: "/finance",
    icon: <FaMoneyBillTrendUp size={20} />,
    submenu: [
      { title: "payments", href: "/finance/payments" },
      { title: "expenses", href: "/finance/expenses" },
      { title: "credit",   href: "/finance/credit"   },
      { title: "advance",  href: "/finance/advance"  },
      { title: "salary",   href: "/finance/salary"   },
      { title: "wallet",   href: "/finance/wallet"   },
      { title: "margin",   href: "/finance/margin"   },
    ],
  },
  {
    id: 5, title: "suppliers", sectionPrefix: "/suppliers",
    href: "/suppliers", icon: <FaUserShield size={20} />,
  },
  {
    id: 6, title: "hr", sectionPrefix: "/hr",
    icon: <SiAwssecretsmanager size={20} />,
    submenu: [
      { title: "staff",      href: "/hr/staff"  },
      { title: "payroll",    href: "/hr/payrol" },
      { title: "advance",    href: "/hr/advance"},
      { title: "salary",     href: "/hr/salary" },
      { title: "login info", href: "/hr/logs"   },
    ],
  },
  {
    id: 7, title: "reports", sectionPrefix: "/reports",
    href: "/reports", icon: <RiDashboard3Line size={20} />,
  },
  {
    id: 8, title: "assets", sectionPrefix: "/assets",
    href: "/assets", icon: <MdVideogameAsset size={20} />,
  },
  {
    id: 9, title: "buy", sectionPrefix: "/buy",
    href: "/buy", icon: <GiBuyCard size={20} />,
  },
  {
    id: 10, title: "shops", sectionPrefix: "/shops",
    href: "/shops", icon: <FaShop size={20} />,
  },
];

function filterNavLinks(role: string, allowedRoutes: string[]): NavLink[] {
  if (role === "admin") return ALL_NAV_LINKS;
  if (role !== "staff") return [];
  return ALL_NAV_LINKS.filter((link) =>
    isRouteAllowed(link.sectionPrefix, role, allowedRoutes),
  );
}

// ─── Collapsed tooltip ───────────────────────────────────────────────────────

function IconTooltip({ label }: { label: string }) {
  return (
    <span
      className="
        absolute left-full ml-3 top-1/2 -translate-y-1/2
        bg-gray-900 text-white text-xs font-semibold
        px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-lg z-[999]
        opacity-0 group-hover:opacity-100 pointer-events-none
        transition-opacity duration-150
      "
    >
      {label}
      <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
    </span>
  );
}

// ─── Outside-click hook ───────────────────────────────────────────────────────
// Skips the event if it originates inside `ignoreRef` (the toggle button),
// preventing the open→close→open double-fire on the same click.

function useOutsideClick(
  ref:       React.RefObject<HTMLElement | null>,
  ignoreRef: React.RefObject<HTMLElement | null>,
  enabled:   boolean,
  onClose:   () => void,
) {
  useEffect(() => {
    if (!enabled) return;
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      // Ignore clicks inside the panel itself
      if (ref.current?.contains(target)) return;
      // Ignore clicks on the toggle button (it handles open/close itself)
      if (ignoreRef.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, ignoreRef, enabled, onClose]);
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

interface ToggleProps {
  checked:  boolean;
  onChange: () => void;
  label:    string;
}

function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`
        relative flex-shrink-0 w-10 rounded-full transition-colors duration-200
        focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500
        ${checked ? "bg-indigo-600" : "bg-gray-200"}
      `}
      style={{ height: 22 }}
    >
      <span
        className="
          absolute top-0.5 left-0.5 w-4 h-4 rounded-full
          bg-white shadow transition-transform duration-200
        "
        style={{ transform: checked ? "translateX(18px)" : "translateX(0)" }}
      />
    </button>
  );
}

// ─── Language Picker ──────────────────────────────────────────────────────────

function LanguagePicker() {
  const { language, setLanguage, t } = useLanguage();
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");

  const panelRef  = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);

  useOutsideClick(panelRef, buttonRef, open, close);

  const toggle = useCallback(() => setOpen((p) => !p), []);

  const handleSelect = useCallback(
    (code: Language) => {
      setLanguage(code);
      close();
    },
    [setLanguage, close],
  );

  const currentLang = LANGUAGES.find((l) => l.code === language) ?? LANGUAGES[0];

  const filtered = query.trim()
    ? LANGUAGES.filter(
        (l) =>
          l.label.toLowerCase().includes(query.toLowerCase()) ||
          l.native.toLowerCase().includes(query.toLowerCase()),
      )
    : LANGUAGES;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={t("language")}
        aria-expanded={open}
        title={t("language")}
        className="
          flex items-center gap-1.5 px-2 py-1.5 rounded-lg
          hover:bg-gray-100 text-gray-600 hover:text-indigo-600
          transition-colors duration-150
        "
      >
        <Globe size={19} />
        <span className="hidden sm:block text-[0.72rem] font-semibold">
          {currentLang.flag} {currentLang.code.toUpperCase()}
        </span>
        <IoChevronDown size={11} className="hidden sm:block text-gray-400" />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={t("language")}
          className="
            absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl
            shadow-2xl border border-gray-100 z-[200] overflow-hidden
          "
        >
          {/* Header */}
          <div className="px-3 pt-3 pb-2 border-b border-gray-50">
            <p className="text-[0.68rem] font-bold text-gray-400 uppercase tracking-widest mb-2">
              {t("language")}
            </p>
            <label className="flex items-center gap-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
              <Search size={13} className="text-gray-400 flex-shrink-0" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("search_language")}
                autoFocus
                className="bg-transparent text-[0.75rem] text-gray-700 outline-none w-full placeholder:text-gray-400"
              />
            </label>
          </div>

          {/* List */}
          <ul role="listbox" className="max-h-56 overflow-y-auto py-1.5 px-1.5">
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-[0.73rem] text-gray-400 text-center">
                No results
              </li>
            )}
            {filtered.map((lang) => (
              <li key={lang.code} role="option" aria-selected={language === lang.code}>
                <button
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left
                    transition-colors duration-100
                    ${language === lang.code
                      ? "bg-indigo-50 text-indigo-700"
                      : "hover:bg-gray-50 text-gray-700"}
                  `}
                >
                  <span className="text-lg leading-none">{lang.flag}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-[0.78rem] font-semibold truncate">
                      {lang.native}
                    </span>
                    <span className="block text-[0.67rem] text-gray-400 truncate">
                      {lang.label}
                    </span>
                  </span>
                  {language === lang.code && (
                    <Check size={13} className="text-indigo-600 flex-shrink-0" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Accessibility Panel ──────────────────────────────────────────────────────

function AccessibilityPanel() {
  const { t } = useLanguage();
  const { a11y, setFontSize, toggleHighContrast, toggleReducedMotion } =
    useAccessibility();

  const [open, setOpen] = useState(false);

  const panelRef  = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close  = useCallback(() => setOpen(false), []);
  const toggle = useCallback(() => setOpen((p) => !p), []);

  useOutsideClick(panelRef, buttonRef, open, close);

  const isModified =
    a11y.highContrast || a11y.reducedMotion || a11y.fontSize !== "normal";

  const fontSizes: { key: FontSize; label: string }[] = [
    { key: "normal", label: t("normal")  },
    { key: "large",  label: t("large")   },
    { key: "xlarge", label: t("x_large") },
  ];

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={t("accessibility")}
        aria-expanded={open}
        title={t("accessibility")}
        className={`
          p-1.5 rounded-lg transition-colors duration-150
          ${isModified
            ? "bg-indigo-100 text-indigo-600"
            : "hover:bg-gray-100 text-gray-600 hover:text-indigo-600"}
        `}
      >
        <Accessibility size={19} />
      </button>

      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={t("accessibility")}
          className="
            absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl
            shadow-2xl border border-gray-100 z-[200] overflow-hidden
          "
        >
          <div className="px-4 pt-3 pb-2 border-b border-gray-50">
            <p className="text-[0.68rem] font-bold text-gray-400 uppercase tracking-widest">
              {t("accessibility")}
            </p>
          </div>

          <div className="p-3 space-y-4">
            {/* Font size */}
            <fieldset>
              <legend className="flex items-center gap-2 mb-2">
                <Type size={14} className="text-gray-500" aria-hidden="true" />
                <span className="text-[0.75rem] font-semibold text-gray-700">
                  {t("font_size")}
                </span>
              </legend>
              <div className="flex gap-2" role="group">
                {fontSizes.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFontSize(key)}
                    aria-pressed={a11y.fontSize === key}
                    className={`
                      flex-1 py-1.5 rounded-lg text-[0.72rem] font-semibold
                      transition-all duration-150
                      ${a11y.fontSize === key
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"}
                    `}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* High contrast */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Contrast size={14} className="text-gray-500" aria-hidden="true" />
                <span className="text-[0.75rem] font-semibold text-gray-700">
                  {t("high_contrast")}
                </span>
              </div>
              <Toggle
                checked={a11y.highContrast}
                onChange={toggleHighContrast}
                label={t("high_contrast")}
              />
            </div>

            {/* Reduced motion */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-gray-500" aria-hidden="true" />
                <span className="text-[0.75rem] font-semibold text-gray-700">
                  {t("reduced_motion")}
                </span>
              </div>
              <Toggle
                checked={a11y.reducedMotion}
                onChange={toggleReducedMotion}
                label={t("reduced_motion")}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Nav List (defined OUTSIDE Navbar to prevent remount on every render) ─────

interface NavListProps {
  visibleLinks: NavLink[];
  collapsed:    boolean;
  inDrawer:     boolean;
  isAdmin:      boolean;
  role:         string;
  openMenus:    Record<string, boolean>;
  isActive:     (href: string) => boolean;
  toggleSubmenu:(title: string) => void;
  t:            (key: string) => string;
}

function NavList({
  visibleLinks,
  collapsed,
  inDrawer,
  isAdmin,
  role,
  openMenus,
  isActive,
  toggleSubmenu,
  t,
}: NavListProps) {
  return (
    <ul className="flex flex-col gap-0.5 py-3 px-2 flex-1 overflow-y-auto">
      {visibleLinks.map((link) => {
        const hasSub       = link.submenu !== undefined;
        const isSubActive  = hasSub && (link.submenu ?? []).some((s) => isActive(s.href));
        const labelVisible = inDrawer || !collapsed;

        if (hasSub) {
          return (
            <li key={link.id} className="relative group">
              <button
                type="button"
                onClick={() => toggleSubmenu(link.title)}
                className={`
                  w-full flex items-center gap-3 rounded-xl px-3 py-2.5
                  transition-all duration-150
                  ${isSubActive
                    ? "bg-indigo-50 text-indigo-700 font-bold"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}
                  ${!labelVisible ? "justify-center" : "justify-between"}
                `}
              >
                <span className="flex items-center gap-3 min-w-0">
                  <span className="flex-shrink-0">{link.icon}</span>
                  {labelVisible && (
                    <span className="text-[0.8rem] font-semibold capitalize truncate">
                      {t(link.title)}
                    </span>
                  )}
                </span>
                {labelVisible && (
                  openMenus[link.title]
                    ? <IoChevronUp size={13} />
                    : <IoChevronDown size={13} />
                )}
              </button>

              {!labelVisible && <IconTooltip label={t(link.title)} />}

              {labelVisible && openMenus[link.title] && (
                <ul className="ml-9 mt-0.5 flex flex-col gap-0.5">
                  {(link.submenu ?? []).map((sub) => (
                    <li key={sub.href}>
                      <Link
                        href={sub.href}
                        className={`
                          flex items-center gap-2 rounded-lg px-3 py-2
                          text-[0.75rem] capitalize transition-all
                          ${isActive(sub.href)
                            ? "bg-indigo-100 text-indigo-700 font-semibold"
                            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"}
                        `}
                      >
                        <ChevronRight size={11} className="flex-shrink-0 opacity-50" />
                        {t(sub.title)}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        }

        // Simple link
        return (
          <li key={link.id} className="relative group">
            <Link
              href={link.href!}
              className={`
                flex items-center gap-3 rounded-xl px-3 py-2.5
                transition-all duration-150
                ${isActive(link.href!)
                  ? "bg-indigo-50 text-indigo-700 font-bold"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}
                ${!labelVisible ? "justify-center" : ""}
              `}
            >
              <span className="flex-shrink-0">{link.icon}</span>
              {labelVisible && (
                <span className="text-[0.8rem] font-semibold capitalize">
                  {t(link.title)}
                </span>
              )}
            </Link>
            {!labelVisible && <IconTooltip label={t(link.title)} />}
          </li>
        );
      })}

      {/* No access warning */}
      {!isAdmin && role === "staff" && visibleLinks.length === 0 &&
        (inDrawer || !collapsed) && (
        <li>
          <div className="flex items-start gap-2.5 px-3 py-3 rounded-xl bg-amber-50 border border-amber-200 mx-1">
            <ShieldOff size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <span className="text-[0.72rem] text-amber-700 font-medium leading-tight">
              {t("no_access")}
            </span>
          </div>
        </li>
      )}
    </ul>
  );
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────

export default function Navbar() {
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [openMenus,   setOpenMenus]   = useState<Record<string, boolean>>({});
  const [showProfile, setShowProfile] = useState(false);

  const pathname = usePathname();
  const { data: session } = useSession();
  const { t } = useLanguage();

  type SessionUser = {
    role?:          string;
    designation?:   string;
    allowedRoutes?: unknown;
    name?:          string | null;
    image?:         string | null;
  };

  const user          = session?.user as SessionUser | undefined;
  const role          = (user?.role ?? "user").toLowerCase().trim();
  const designation   = user?.designation ?? null;
  const allowedRoutes = parseAllowedRoutes(user?.allowedRoutes);
  const isAdmin       = role === "admin";

  const visibleLinks = filterNavLinks(role, allowedRoutes);

  const isActive = useCallback(
    (href: string) => pathname === href || pathname.startsWith(href + "/"),
    [pathname],
  );

  const toggleSubmenu = useCallback((title: string) => {
    setOpenMenus((prev) => ({ ...prev, [title]: !prev[title] }));
  }, []);

  // Sync sidebar CSS var
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-w",
      `${collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED}px`,
    );
  }, [collapsed]);

  // Auto-open submenu whose child is active
  useEffect(() => {
    setOpenMenus((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const link of visibleLinks) {
        if (
          link.submenu?.some(
            (sub) => pathname === sub.href || pathname.startsWith(sub.href + "/"),
          ) &&
          !prev[link.title]
        ) {
          next[link.title] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
    setMobileOpen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close profile on outside click
  useEffect(() => {
    if (!showProfile) return;
    const close = () => setShowProfile(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [showProfile]);

  // Close mobile drawer on outside click
  useEffect(() => {
    if (!mobileOpen) return;
    function handler(e: MouseEvent) {
      const drawer = document.getElementById("mobile-drawer");
      if (drawer && !drawer.contains(e.target as Node)) setMobileOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mobileOpen]);

  const handleToggleCollapse = useCallback(() => setCollapsed((p) => !p), []);
  const handleToggleMobile   = useCallback(() => setMobileOpen((p) => !p), []);
  const handleToggleProfile  = useCallback(
    (e: React.MouseEvent) => { e.stopPropagation(); setShowProfile((p) => !p); },
    [],
  );
  const handleSignOut = useCallback(() => signOut({ callbackUrl: "/" }), []);

  // Shared props for NavList (stable references only)
  const navListProps = {
    visibleLinks,
    collapsed,
    isAdmin,
    role,
    openMenus,
    isActive,
    toggleSubmenu,
    t,
  };

  return (
    <>
      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <header
        className="
          fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200
          flex items-center justify-between px-4 shadow-sm
        "
        style={{ height: TOPBAR_HEIGHT }}
      >
        {/* Left: logo + toggles */}
        <div className="flex items-center gap-3">
          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
            onClick={handleToggleMobile}
            aria-label={t("toggle_menu")}
            aria-expanded={mobileOpen}
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

          {/* Desktop collapse */}
          <button
            type="button"
            className="hidden md:flex p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            onClick={handleToggleCollapse}
            aria-label={t("collapse_sidebar")}
          >
            <Menu size={19} />
          </button>
        </div>

        {/* Right: lang + a11y + notifications + badge + avatar */}
        <div className="flex items-center gap-2">
          <LanguagePicker />
          <AccessibilityPanel />

          {/* Notifications */}
          <div className="relative">
            <button
              type="button"
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label={t("notifications")}
            >
              <IoIosNotificationsOutline size={22} className="text-gray-600" />
            </button>
            <span
              aria-label="20 notifications"
              className="
                absolute top-0.5 right-0.5 h-4 w-4 bg-red-500 text-white
                text-[0.55rem] font-bold rounded-full border border-white
                flex items-center justify-center pointer-events-none
              "
            >
              20
            </span>
          </div>

          {/* Role badge */}
          {session && (
            <div className="hidden sm:flex items-center gap-1.5">
              {isAdmin ? (
                <span className="text-[0.68rem] bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">
                  {t("admin")}
                </span>
              ) : designation ? (
                <span className="text-[0.68rem] bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full capitalize">
                  {designation}
                </span>
              ) : (
                <span className="text-[0.68rem] bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded-full capitalize">
                  {role}
                </span>
              )}
              {!isAdmin && role === "staff" && (
                <span className="text-[0.62rem] bg-blue-50 text-blue-600 font-medium px-1.5 py-0.5 rounded-full border border-blue-200">
                  {allowedRoutes.length}s
                </span>
              )}
            </div>
          )}

          {/* Greeting */}
          {session && (
            <span className="hidden md:block text-[0.78rem] font-semibold text-gray-700 whitespace-nowrap">
              {t("hey")}, {user?.name?.split(" ")[0]}
            </span>
          )}

          {/* Avatar */}
          {session && (
            <div className="relative">
              <button
                type="button"
                onClick={handleToggleProfile}
                className="
                  relative w-8 h-8 rounded-full overflow-hidden
                  border-2 border-gray-200 hover:border-indigo-400 transition-colors
                "
              >
                <Image
                  src={user?.image ?? "/branton_logo.png"}
                  alt="User avatar"
                  fill
                  className="object-cover"
                />
              </button>
              {showProfile && <Profile />}
            </div>
          )}
        </div>
      </header>

      {/* ── DESKTOP SIDEBAR ─────────────────────────────────────────────── */}
      <aside
        className="
          hidden md:flex flex-col fixed z-40 bg-white border-r border-gray-200
          transition-[width] duration-200 ease-in-out overflow-hidden
        "
        style={{
          top:    TOPBAR_HEIGHT,
          bottom: 0,
          width:  collapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED,
        }}
      >
        <NavList {...navListProps} inDrawer={false} />

        <div className="border-t border-gray-100 px-2 py-3">
          <button
            type="button"
            onClick={handleSignOut}
            className={`
              flex items-center gap-3 w-full rounded-xl px-3 py-2.5
              text-gray-500 hover:bg-red-50 hover:text-red-600
              transition-all duration-150
              ${collapsed ? "justify-center" : ""}
            `}
          >
            <IoIosLogOut size={20} className="flex-shrink-0" />
            {!collapsed && (
              <span className="text-[0.8rem] font-semibold">{t("logout")}</span>
            )}
          </button>
        </div>
      </aside>

      {/* ── MOBILE DRAWER ───────────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-[60] flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer */}
          <div
            id="mobile-drawer"
            className="relative z-10 flex flex-col bg-white shadow-2xl"
            style={{ width: SIDEBAR_EXPANDED }}
          >
            {/* Drawer header */}
            <div
              className="flex items-center justify-between px-4 border-b border-gray-100"
              style={{ height: TOPBAR_HEIGHT }}
            >
              <div className="flex items-center gap-2.5">
                <div className="relative h-8 w-8 flex-shrink-0">
                  <Image
                    src="/branton_logo.png"
                    alt="Logo"
                    fill
                    className="object-cover rounded-full border border-gray-300"
                  />
                </div>
                <span className="text-sm font-bold text-gray-800">Kwenik</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label={t("close_menu")}
              >
                <X size={18} />
              </button>
            </div>

            {/* Nav */}
            <div className="flex-1 overflow-y-auto">
              <NavList {...navListProps} inDrawer={true} />
            </div>

            {/* Logout */}
            <div className="border-t border-gray-100 px-2 py-3">
              <button
                type="button"
                onClick={handleSignOut}
                className="
                  flex items-center gap-3 w-full rounded-xl px-3 py-2.5
                  text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all
                "
              >
                <IoIosLogOut size={20} />
                <span className="text-[0.8rem] font-semibold">{t("logout")}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}