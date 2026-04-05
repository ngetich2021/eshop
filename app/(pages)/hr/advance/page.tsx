// app/staff/advance/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { resolveActiveShop } from "@/lib/active-shop";
import AdvanceView from "../../finance/advance/_components/Advanceview";

export default async function AdvancePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { activeShopId, activeShop, isAdmin } = await resolveActiveShop(session.user.id);

  // Resolve role
  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { role: true },
  });
  const role = profile?.role?.toLowerCase().trim();
  const isManager = role === "manager" || isAdmin;

  // Current user's Staff record in this shop
  const currentStaff = await prisma.staff.findFirst({
    where: { userId: session.user.id, shopId: activeShopId },
    select: { id: true, fullName: true, baseSalary: true },
  });
  const isStaff = !!currentStaff && !isManager;

  // Managers see ALL advances for the shop; staff see only their own
  const raw = await prisma.advance.findMany({
    where: {
      shopId: activeShopId,
      ...(isStaff && currentStaff ? { staffId: currentStaff.id } : {}),
    },
    select: {
      id: true,
      amount: true,
      date: true,
      reason: true,
      status: true,
      transactionCode: true,
      shopId: true,
      staffId: true,
      staff: { select: { fullName: true, baseSalary: true } },
      shop: { select: { name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const advances = raw.map((a) => ({
    id: a.id,
    staffName: a.staff.fullName,
    staffId: a.staffId,
    amount: a.amount,
    date: a.date.toISOString().split("T")[0],
    reason: a.reason ?? null,
    status: a.status,
    transactionCode: a.transactionCode ?? null,
    shop: a.shop.name,
    shopId: a.shopId,
    baseSalary: a.staff.baseSalary,
    createdAt: a.createdAt.toISOString().split("T")[0],
  }));

  const totalAdvance = advances.reduce((s, a) => s + a.amount, 0);
  const pendingAdvance = advances
    .filter((a) => a.status === "requested" || a.status === "approved")
    .reduce((s, a) => s + a.amount, 0);
  const approvedCount = advances.filter((a) => a.status === "approved").length;

  return (
    <AdvanceView
      activeShop={activeShop}
      isStaff={isStaff}
      isAdmin={isAdmin}
      isManager={isManager}
      currentStaff={currentStaff}
      stats={{ totalAdvances: advances.length, totalAdvance, pendingAdvance, approvedCount }}
      advances={advances}
    />
  );
}