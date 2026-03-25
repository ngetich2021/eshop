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

  // ── Check if this user is a Staff member ──────────────────────────────────
  const staffRecord = await prisma.staff.findFirst({
    where: { userId },
    select: {
      shop: { select: shopSelect },
      user: { select: { id: true, name: true } },
    },
  });

  if (staffRecord?.shop) {
    return (
      <ShopPortal
        role="staff"
        user={staffRecord.user}
        staffShop={staffRecord.shop}
      />
    );
  }

  // ── Otherwise treat as owner ───────────────────────────────────────────────
  const ownerUser = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      shops: { select: shopSelect },
    },
  });

  if (!ownerUser) redirect("/login");

  return <ShopPortal role="owner" user={ownerUser} />;
}