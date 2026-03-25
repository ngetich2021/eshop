import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import SalaryView from "./_components/SalaryView";

export default async function SalaryPage() {
  const session = await auth();
  if (!session?.user?.id)
    return <div className="min-h-screen flex items-center justify-center">Please sign in</div>;

  const userId = session.user.id;
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { role: true } });
  const isAdmin = profile?.role?.toLowerCase().trim() === "admin";

  const [staffList, shops, raw] = await Promise.all([
    prisma.staff.findMany({ select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
    prisma.shop.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.salary.findMany({
      where: isAdmin ? undefined : { shop: { userId } },
      select: {
        id: true, amount: true, month: true, status: true, shopId: true, staffId: true,
        staff: { select: { fullName: true } },
        shop: { select: { name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const salaries = raw.map((s) => ({
    id: s.id,
    staffName: s.staff.fullName,
    staffId: s.staffId,
    amount: s.amount,
    month: s.month,
    status: s.status,
    shop: s.shop.name,
    shopId: s.shopId,
    date: s.createdAt.toISOString().split("T")[0],
  }));

  const totalAmount = salaries.reduce((sum, s) => sum + s.amount, 0);
  const pendingAmount = salaries.filter((s) => s.status === "pending").reduce((sum, s) => sum + s.amount, 0);
  const paidCount = salaries.filter((s) => s.status === "paid").length;

  return (
    <SalaryView
      stats={{ totalSalaries: salaries.length, totalAmount, pendingAmount, paidCount }}
      salaries={salaries}
      staffList={staffList}
      shops={shops}
    />
  );
}