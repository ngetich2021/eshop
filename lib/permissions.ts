// lib/permissions.ts
// Single source of truth for nav sections and route permission checks.
// allowedRoutes is a string[] of route PREFIXES, e.g. ["/sales", "/finance"]

export type NavSection = {
  key:         string;
  label:       string;
  prefix:      string;   // must start with "/"
  emoji:       string;
  description: string;
};

export const NAV_SECTIONS: NavSection[] = [
  { key: "dashboard",  label: "Dashboard",      prefix: "/dashboard",  emoji: "🏠", description: "Main dashboard and summary stats"                     },
  { key: "inventory",  label: "Inventory",      prefix: "/inventory",  emoji: "📦", description: "Products and stock adjustments"                       },
  { key: "sales",      label: "Sales",          prefix: "/sales",      emoji: "💰", description: "Sales records and quotations"                         },
  { key: "finance",    label: "Finance",        prefix: "/finance",    emoji: "💳", description: "Payments, expenses, credit, salary, wallet, margin"   },
  { key: "suppliers",  label: "Suppliers",      prefix: "/suppliers",  emoji: "🚚", description: "Supplier management"                                  },
  { key: "hr",         label: "HR",             prefix: "/hr",         emoji: "👥", description: "Staff, payroll, advances, salary, login logs"         },
  { key: "reports",    label: "Reports",        prefix: "/reports",    emoji: "📊", description: "Business reports and analytics"                       },
  { key: "assets",     label: "Assets",         prefix: "/assets",     emoji: "🏷️", description: "Shop asset management"                               },
  { key: "buy",        label: "Buy / Purchases",prefix: "/buy",        emoji: "🛒", description: "Purchase orders from suppliers"                       },
  { key: "shops",      label: "Shops",          prefix: "/shops",      emoji: "🏪", description: "Shop management (admin only)"                         },
];

/**
 * Parse allowedRoutes from whatever shape the DB / session token returns.
 */
export function parseAllowedRoutes(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as string[]; } catch { return []; }
  }
  return [];
}

/**
 * Can this user access `pathname`?
 *
 * - admin  → always true
 * - staff  → true when pathname starts with one of their allowedRoutes prefixes
 * - others → always false
 *
 * NOTE: /dashboard is handled as "always allowed" in middleware directly,
 * so it doesn't need to appear in every staff member's allowedRoutes.
 */
export function isRouteAllowed(
  pathname:      string,
  role:          string,
  allowedRoutes: string[],
): boolean {
  const r = role.toLowerCase().trim();
  if (r === "admin") return true;
  if (r !== "staff") return false;

  return allowedRoutes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
}

/**
 * Return only the NAV_SECTIONS a user is permitted to see in the sidebar.
 * /dashboard is always included for authenticated staff.
 */
export function visibleSections(
  role:          string,
  allowedRoutes: string[],
): NavSection[] {
  const r = role.toLowerCase().trim();
  if (r === "admin") return NAV_SECTIONS;
  if (r !== "staff") return [];

  return NAV_SECTIONS.filter(
    (s) =>
      s.prefix === "/dashboard" ||           // always show dashboard link
      allowedRoutes.includes(s.prefix)
  );
}