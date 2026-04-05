// app/salary/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { resolveActiveShop } from "@/lib/active-shop";
import { autoGenerateSalariesAction } from "../../finance/salary/_components/actions";
import SalaryView from "../../finance/salary/_components/SalaryView";

export const revalidate = 0; // Always fresh

export default async function SalaryPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { activeShopId, activeShop, isStaff, isAdmin } = await resolveActiveShop(session.user.id);

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { role: true },
  });
  const role = profile?.role?.toLowerCase().trim();
  const isManager = role === "manager" || isAdmin;

  // Auto-generate salary records for current month (idempotent — skips existing)
  await autoGenerateSalariesAction(activeShopId);

  // Fetch staff for this shop
  const staffList = await prisma.staff.findMany({
    where: { shopId: activeShopId },
    select: { id: true, fullName: true, baseSalary: true },
    orderBy: { fullName: "asc" },
  });

  // Current month string e.g. "2026-03"
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Fetch paid advances this month (to show deductions)
  const paidAdvances = await prisma.advance.findMany({
    where: {
      shopId: activeShopId,
      status: { in: ["approved", "paid"] },
      date: {
        gte: new Date(now.getFullYear(), now.getMonth(), 1),
        lte: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      },
    },
    select: { staffId: true, amount: true },
  });

  // Group advances by staffId
  const advanceByStaff: Record<string, number> = {};
  for (const adv of paidAdvances) {
    advanceByStaff[adv.staffId] = (advanceByStaff[adv.staffId] ?? 0) + adv.amount;
  }

  // Fetch payroll records this month (used to determine paid status)
  const payrollRecords = await prisma.payroll.findMany({
    where: { shopId: activeShopId },
    select: { staffId: true, status: true, payable: true },
  });
  const payrollByStaff: Record<string, { status: string; payable: number }> = {};
  for (const pr of payrollRecords) {
    // Latest payroll wins if multiple exist
    payrollByStaff[pr.staffId] = { status: pr.status, payable: pr.payable };
  }

  // Fetch salary records for active shop
  const raw = await prisma.salary.findMany({
    where: { shopId: activeShopId },
    select: {
      id: true,
      amount: true,
      month: true,
      status: true,
      shopId: true,
      staffId: true,
      staff: { select: { fullName: true, baseSalary: true } },
      shop: { select: { name: true } },
      createdAt: true,
    },
    orderBy: [{ month: "desc" }, { createdAt: "desc" }],
  });

  const salaries = raw.map((s) => {
    const advances = advanceByStaff[s.staffId] ?? 0;
    const payroll = payrollByStaff[s.staffId];
    // Status: if payroll is paid => paid, else if advance > 0 show deduction context, else pending
    const effectiveStatus = payroll?.status === "paid" ? "paid" : s.status;
    const netPayable = Math.max(0, s.amount - advances);

    return {
      id: s.id,
      staffName: s.staff.fullName,
      staffId: s.staffId,
      amount: s.amount,          // gross (base salary)
      advances,                  // total advance deductions this month
      netPayable,                // amount to actually pay
      month: s.month,
      status: effectiveStatus,
      shop: s.shop.name,
      shopId: s.shopId,
      date: s.createdAt.toISOString().split("T")[0],
      isCurrentMonth: s.month === currentMonth,
    };
  });

  const totalAmount = salaries.reduce((sum, s) => sum + s.amount, 0);
  const pendingAmount = salaries
    .filter((s) => s.status === "pending")
    .reduce((sum, s) => sum + s.netPayable, 0);
  const paidCount = salaries.filter((s) => s.status === "paid").length;
  const totalDeductions = salaries.reduce((sum, s) => sum + s.advances, 0);

  return (
    <SalaryView
      activeShop={activeShop}
      isStaff={isStaff}
      isAdmin={isAdmin}
      isManager={isManager}
      currentMonth={currentMonth}
      stats={{
        totalSalaries: salaries.length,
        totalAmount,
        pendingAmount,
        paidCount,
        totalDeductions,
      }}
      salaries={salaries}
      staffList={staffList}
    />
  );
}