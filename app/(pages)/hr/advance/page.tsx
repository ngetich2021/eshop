import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import AdvancesView from "./_components/AdvancesView";

export default async function AdvancePage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        Please sign in
      </div>
    );
  }

  const userId = session.user.id;
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { role: true },
  });
  const isAdmin = profile?.role?.toLowerCase().trim() === "admin";

  const staffList = await prisma.staff.findMany({
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });

  const shops = await prisma.shop.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const advancesRaw = await prisma.advance.findMany({
    where: isAdmin ? undefined : { shop: { userId } },
    select: {
      id: true,
      amount: true,
      date: true,
      status: true,
      reason: true,
      transactionCode: true,
      staffId: true,
      staff: { select: { fullName: true } },
      shop: { select: { name: true } },
      shopId: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const advances = advancesRaw.map((a) => ({
    id: a.id,
    staffName: a.staff.fullName,
    staffId: a.staffId,
    amount: a.amount,
    date: a.date.toISOString().split("T")[0],
    status: a.status,
    shop: a.shop.name,
    shopId: a.shopId,
    reason: a.reason ?? null,
    transactionCode: a.transactionCode ?? null,
  }));

  const totalAdvances = advances.length;
  const totalAmount = advances.reduce((sum, a) => sum + a.amount, 0);

  return (
    <AdvancesView
      stats={{ totalAdvances, totalAmount }}
      advances={advances}
      staffList={staffList}
      shops={shops}
    />
  );
}