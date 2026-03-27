// app/wallet/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { resolveActiveShop } from "@/lib/active-shop";
import WalletView from "./_components/WalletView";

export default async function WalletPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { activeShopId, activeShop, isStaff, isAdmin } = await resolveActiveShop(
    session.user.id
  );

  // Get current user's display name from profile or session
  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { fullName: true },
  });
  const currentUserName =
    profile?.fullName || session.user.name || session.user.email || "Unknown";

  // Fetch or create wallet for this shop
  let wallet = await prisma.wallet.findUnique({
    where: { shopId: activeShopId },
    select: { id: true, balance: true, shopId: true },
  });
  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: { shopId: activeShopId, balance: 0 },
      select: { id: true, balance: true, shopId: true },
    });
  }

  // Fetch transactions for THIS SHOP ONLY
  const transactions = await prisma.transaction.findMany({
    where: { shopId: activeShopId },
    select: {
      id: true,
      name: true,
      amount: true,
      sourceOfMoney: true,
      authorizeId: true,
      shopId: true,
      shop: { select: { name: true } },
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Build a map of userId → display name for the 'by' column
  // Collect all unique authorizeIds
  const authorizeIds = [...new Set(transactions.map((t) => t.authorizeId).filter(Boolean))];

  // Resolve names: check profile first, then staff, then user
  const nameMap: Record<string, string> = {};
  if (authorizeIds.length > 0) {
    const profiles = await prisma.profile.findMany({
      where: { userId: { in: authorizeIds } },
      select: { userId: true, fullName: true },
    });
    profiles.forEach((p) => {
      if (p.fullName) nameMap[p.userId] = p.fullName;
    });

    // For any still unresolved, check staff table
    const unresolved = authorizeIds.filter((id) => !nameMap[id]);
    if (unresolved.length > 0) {
      const staffs = await prisma.staff.findMany({
        where: { userId: { in: unresolved } },
        select: { userId: true, fullName: true },
      });
      staffs.forEach((s) => { nameMap[s.userId] = s.fullName; });
    }

    // For any still unresolved, check user name
    const stillUnresolved = authorizeIds.filter((id) => !nameMap[id]);
    if (stillUnresolved.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: stillUnresolved } },
        select: { id: true, name: true, email: true },
      });
      users.forEach((u) => {
        nameMap[u.id] = u.name || u.email || "unknown";
      });
    }
  }

  // Available balance calculation
  const totalSalesAmount =
    (
      await prisma.sale.aggregate({
        where: { shopId: activeShopId },
        _sum: { totalAmount: true },
      })
    )._sum.totalAmount ?? 0;

  const totalTransferredOut =
    (
      await prisma.transaction.aggregate({
        where: { shopId: activeShopId, name: "transfer_out" },
        _sum: { amount: true },
      })
    )._sum.amount ?? 0;

  const availableBalance = totalSalesAmount - totalTransferredOut;

  // Filter & map transactions
  const txData = transactions
    .filter((t) => t.name !== "transfer_out")
    .map((t) => ({
      id: t.id,
      type: t.name,
      amount: t.amount,
      source: t.sourceOfMoney,
      authorizeId: t.authorizeId,
      // 'by' = resolved name or 'unknown'
      byName: nameMap[t.authorizeId] ?? "unknown",
      shop: t.shop.name,
      shopId: t.shopId,
      date: t.createdAt.toISOString().split("T")[0],
    }));

  const totalDeposits = txData
    .filter((t) => t.type === "deposit")
    .reduce((s, t) => s + t.amount, 0);
  const totalWithdrawn = txData
    .filter((t) => t.type === "withdraw")
    .reduce((s, t) => s + t.amount, 0);
  const totalTransferred = txData
    .filter((t) => t.type === "transfer")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <WalletView
      activeShop={activeShop}
      isStaff={isStaff}
      isAdmin={isAdmin}
      wallet={wallet}
      availableBalance={Math.max(0, availableBalance)}
      currentUserName={currentUserName}
      stats={{
        totalBalance: wallet.balance,
        totalDeposits,
        totalWithdrawn,
        totalTransferred,
      }}
      transactions={txData}
    />
  );
}