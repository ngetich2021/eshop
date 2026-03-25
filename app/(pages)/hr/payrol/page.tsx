import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import PayrollView from "./_components/PayrollView";

export default async function PayrollPage() {
  const session = await auth();
  if (!session?.user?.id)
    return <div className="min-h-screen flex items-center justify-center">Please sign in</div>;

  const userId = session.user.id;
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { role: true } });
  const isAdmin = profile?.role?.toLowerCase().trim() === "admin";

  const [staffList, shops, raw] = await Promise.all([
    prisma.staff.findMany({ select: { id: true, fullName: true }, orderBy: { fullName: "asc" } }),
    prisma.shop.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.payroll.findMany({
      where: isAdmin ? undefined : { shop: { userId } },
      select: {
        id: true, salary: true, payable: true, status: true, shopId: true, staffId: true,
        staff: { select: { fullName: true } },
        shop: { select: { name: true } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const payrolls = raw.map((p) => ({
    id: p.id,
    staffName: p.staff.fullName,
    staffId: p.staffId,
    salary: p.salary,
    payable: p.payable,
    status: p.status,
    shop: p.shop.name,
    shopId: p.shopId,
    date: p.createdAt.toISOString().split("T")[0],
  }));

  const totalDue = payrolls.filter((p) => p.status === "pending").reduce((s, p) => s + p.payable, 0);
  const totalSalary = payrolls.reduce((s, p) => s + p.salary, 0);
  const totalPayable = payrolls.reduce((s, p) => s + p.payable, 0);

  return (
    <PayrollView
      stats={{ totalPayrolls: payrolls.length, totalDue, totalSalary, totalPayable }}
      payrolls={payrolls}
      staffList={staffList}
      shops={shops}
    />
  );
}