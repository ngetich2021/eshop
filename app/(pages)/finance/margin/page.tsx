// app/wallet/margins/page.tsx
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import MarginView from "./_components/MarginView";

export default async function MarginPage() {
  const session = await auth();
  if (!session?.user?.id)
    return <div className="min-h-screen flex items-center justify-center">Please sign in</div>;

  const userId = session.user.id;
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { role: true } });
  const isAdmin = profile?.role?.toLowerCase().trim() === "admin";

  const shops = await prisma.shop.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });

  const raw = await prisma.margin.findMany({
    where: isAdmin ? undefined : { shop: { userId } },
    select: {
      id: true, date: true, value: true, profitType: true,
      shopId: true, shop: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  });

  const margins = raw.map((m) => ({
    id: m.id,
    date: m.date.toISOString().split("T")[0],
    value: m.value,
    profitType: m.profitType ?? null,
    shop: m.shop.name,
    shopId: m.shopId,
  }));

  const totalValue = margins.reduce((s, m) => s + m.value, 0);

  return (
    <MarginView
      stats={{ totalMargins: margins.length, totalValue }}
      margins={margins}
      shops={shops}
    />
  );
}