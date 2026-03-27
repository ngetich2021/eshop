// app/payroll/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { resolveActiveShop } from "@/lib/active-shop";
import PayrollView from "./_components/PayrollView";

export const revalidate = 0;

export default async function PayrollPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { activeShopId, activeShop, isStaff, isAdmin } = await resolveActiveShop(session.user.id);

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { role: true },
  });
  const role = profile?.role?.toLowerCase().trim();
  const isManager = role === "manager" || isAdmin;

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  // Get all staff for this shop
  const staffList = await prisma.staff.findMany({
    where: { shopId: activeShopId },
    select: { id: true, fullName: true, baseSalary: true },
    orderBy: { fullName: "asc" },
  });

  // Get approved/paid advances this month for each staff
  const advancesThisMonth = await prisma.advance.findMany({
    where: {
      shopId: activeShopId,
      status: { in: ["approved", "paid"] },
      date: { gte: monthStart, lte: monthEnd },
    },
    select: { staffId: true, amount: true },
  });

  const advanceByStaff: Record<string, number> = {};
  for (const adv of advancesThisMonth) {
    advanceByStaff[adv.staffId] = (advanceByStaff[adv.staffId] ?? 0) + adv.amount;
  }

  // Auto-generate payroll records for this month if not already present
  const existingPayrolls = await prisma.payroll.findMany({
    where: {
      shopId: activeShopId,
      createdAt: { gte: monthStart, lte: monthEnd },
    },
    select: { staffId: true },
  });
  const existingIds = new Set(existingPayrolls.map((p) => p.staffId));

  const toCreate = staffList.filter((s) => !existingIds.has(s.id));
  if (toCreate.length > 0) {
    await prisma.payroll.createMany({
      data: toCreate.map((s) => {
        const advances = advanceByStaff[s.id] ?? 0;
        return {
          staffId: s.id,
          shopId: activeShopId,
          salary: s.baseSalary,
          payable: Math.max(0, s.baseSalary - advances),
          status: "pending",
        };
      }),
    });
  } else {
    // Update payable for existing payrolls (advances may have changed)
    for (const existing of await prisma.payroll.findMany({
      where: { shopId: activeShopId, createdAt: { gte: monthStart, lte: monthEnd }, status: "pending" },
      select: { id: true, staffId: true, salary: true },
    })) {
      const advances = advanceByStaff[existing.staffId] ?? 0;
      await prisma.payroll.update({
        where: { id: existing.id },
        data: { payable: Math.max(0, existing.salary - advances) },
      });
    }
  }

  // Fetch all payroll records for this shop
  const raw = await prisma.payroll.findMany({
    where: { shopId: activeShopId },
    select: {
      id: true,
      salary: true,
      payable: true,
      status: true,
      shopId: true,
      staffId: true,
      staff: { select: { fullName: true } },
      shop: { select: { name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const payrolls = raw.map((p) => ({
    id: p.id,
    staffName: p.staff.fullName,
    staffId: p.staffId,
    salary: p.salary,
    payable: p.payable,
    advances: (p.salary - p.payable),
    status: p.status,
    shop: p.shop.name,
    shopId: p.shopId,
    date: p.createdAt.toISOString().split("T")[0],
    isCurrentMonth: p.createdAt >= monthStart && p.createdAt <= monthEnd,
  }));

  const totalDue = payrolls.filter((p) => p.status === "pending").reduce((s, p) => s + p.payable, 0);
  const totalSalary = payrolls.reduce((s, p) => s + p.salary, 0);
  const totalPayable = payrolls.reduce((s, p) => s + p.payable, 0);
  const totalDeductions = payrolls.reduce((s, p) => s + p.advances, 0);

  return (
    <PayrollView
      activeShop={activeShop}
      isManager={isManager}
      currentMonth={currentMonth}
      stats={{ totalPayrolls: payrolls.length, totalDue, totalSalary, totalPayable, totalDeductions }}
      payrolls={payrolls}
      staffList={staffList.map((s) => ({ id: s.id, fullName: s.fullName }))}
    />
  );
}