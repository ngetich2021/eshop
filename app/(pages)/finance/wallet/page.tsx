// app/wallet/page.tsx
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import WalletView from "./_components/WalletView";

export default async function WalletPage() {
  const session = await auth();
  if (!session?.user?.id)
    return <div className="min-h-screen flex items-center justify-center">Please sign in</div>;

  const userId = session.user.id;
  const profile = await prisma.profile.findUnique({ where: { userId }, select: { role: true } });
  const isAdmin = profile?.role?.toLowerCase().trim() === "admin";

  const shops = await prisma.shop.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });

  const wallets = await prisma.wallet.findMany({
    where: isAdmin ? undefined : { shop: { userId } },
    select: {
      id: true, balance: true, shopId: true,
      shop: { select: { name: true } },
    },
  });

  const transactions = await prisma.transaction.findMany({
    where: isAdmin ? undefined : { shop: { userId } },
    select: {
      id: true, name: true, amount: true, sourceOfMoney: true,
      authorizeId: true, shopId: true,
      shop: { select: { name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const txData = transactions.map((t) => ({
    id: t.id,
    type: t.name,
    amount: t.amount,
    source: t.sourceOfMoney,
    authorizeId: t.authorizeId,
    shop: t.shop.name,
    shopId: t.shopId,
    date: t.createdAt.toISOString().split("T")[0],
  }));

  const totalBalance = wallets.reduce((sum, w) => sum + w.balance, 0);
  const totalDeposits = txData.filter(t => t.type === "deposit").reduce((s, t) => s + t.amount, 0);
  const totalWithdrawn = txData.filter(t => t.type === "withdraw").reduce((s, t) => s + t.amount, 0);

  return (
    <WalletView
      stats={{ totalBalance, totalDeposits, totalWithdrawn }}
      wallets={wallets.map(w => ({ ...w, shopName: w.shop.name }))}
      transactions={txData}
      shops={shops}
    />
  );
}