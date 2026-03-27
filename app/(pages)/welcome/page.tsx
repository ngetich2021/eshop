// app/shops/page.tsx
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import ShopPortal from "./_components/Shopportal";

const shopSelect = {
  id: true,
  name: true,
  tel: true,
  location: true,
  wallet: { select: { balance: true } },
  staffs: {
    select: {
      id: true, userId: true, fullName: true,
      tel1: true, tel2: true, mpesaNo: true, baseSalary: true,
    },
  },
  sales: { select: { soldById: true, totalAmount: true, createdAt: true } },
  expenses: { select: { amount: true } },
  buys: { select: { totalAmount: true } },
  margins: { select: { value: true } },
  credits: { select: { status: true } },
} as const;

export default async function ShopsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  // ── Staff: they have exactly one shop — show portal which sets cookie + redirects ──
  const staffRecord = await prisma.staff.findFirst({
    where: { userId },
    select: {
      shop: { select: shopSelect },
      user: { select: { id: true, name: true } },
    },
  });

  if (staffRecord?.shop) {
    // Render ShopPortal in staff mode.
    // The client useEffect calls selectShopAction (a Server Action) which
    // writes the cookie and redirects — cookies CANNOT be set here in a
    // Server Component, only inside Server Actions or Route Handlers.
    return (
      <ShopPortal
        role="staff"
        user={staffRecord.user}
        staffShop={staffRecord.shop}
      />
    );
  }

  // ── Owner: show all their shops so they can pick one ─────────────────────
  const ownerUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      shops: { select: shopSelect },
    },
  });

  if (!ownerUser) redirect("/login");

  // Owner with no shops yet
  if (ownerUser.shops.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">No shops found. Please create a shop first.</p>
      </div>
    );
  }

  return <ShopPortal role="owner" user={ownerUser} />;
}