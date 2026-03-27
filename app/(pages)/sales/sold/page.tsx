// app/sale/sold/page.tsx
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { resolveActiveShop } from "@/lib/active-shop";
import SaleView from "./_components/SaleView";

export default async function SalePage() {
  const session = await auth();
  if (!session?.user?.id)
    return <div className="min-h-screen flex items-center justify-center">Please sign in</div>;

  const userId = session.user.id;

  // ── Resolve the active shop (same pattern as ProductsPage) ──────────────
  const { activeShopId } = await resolveActiveShop(userId);

  const [profile, staffRecord] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId },
      select: { role: true, shopId: true, fullName: true },
    }),
    prisma.staff.findUnique({
      where: { userId },
      select: { id: true, fullName: true },
    }),
  ]);

  const isAdmin = profile?.role?.toLowerCase().trim() === "admin";

  const [products, shops, staffList] = await Promise.all([
    // Scope products to the active shop only — regardless of admin/staff role
    prisma.product.findMany({
      where: { shopId: activeShopId },
      select: {
        id: true,
        productName: true,
        sellingPrice: true,
        buyingPrice: true,
        discount: true,
        quantity: true,
        imageUrl: true,
        shopId: true,
        shop: { select: { name: true } },
      },
      orderBy: { productName: "asc" },
    }),
    prisma.shop.findMany({
      where: isAdmin ? undefined : { userId },
      select: { id: true, name: true, location: true, tel: true },
      orderBy: { name: "asc" },
    }),
    prisma.staff.findMany({
      select: { id: true, fullName: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  // Stats scoped to active shop only
  const where = { shopId: activeShopId };

  const [salesRaw, todayAgg, weekAgg, monthAgg, yearAgg] = await Promise.all([
    prisma.sale.findMany({
      where: { shopId: activeShopId },
      select: {
        id: true,
        soldById: true,
        totalAmount: true,
        paymentMethod: true,
        shopId: true,
        shop: { select: { name: true, location: true, tel: true } },
        saleItems: {
          select: {
            id: true,
            quantity: true,
            price: true,
            discount: true,
            product: { select: { productName: true } },
          },
        },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.sale.aggregate({ where: { ...where, createdAt: { gte: startOfDay } }, _sum: { totalAmount: true }, _count: true }),
    prisma.sale.aggregate({ where: { ...where, createdAt: { gte: startOfWeek } }, _sum: { totalAmount: true }, _count: true }),
    prisma.sale.aggregate({ where: { ...where, createdAt: { gte: startOfMonth } }, _sum: { totalAmount: true }, _count: true }),
    prisma.sale.aggregate({ where: { ...where, createdAt: { gte: startOfYear } }, _sum: { totalAmount: true }, _count: true }),
  ]);

  const sales = salesRaw.map((s) => ({
    id: s.id,
    soldById: s.soldById,
    soldByName: staffList.find((st) => st.id === s.soldById)?.fullName ?? "Unknown",
    items: s.saleItems.map((si) => ({
      id: si.id,
      productName: si.product.productName,
      quantity: si.quantity,
      price: si.price,
      discount: si.discount,
    })),
    totalAmount: s.totalAmount,
    paymentMethod: s.paymentMethod,
    shop: s.shop.name,
    shopLocation: s.shop.location ?? "",
    shopTel: s.shop.tel ?? "",
    shopId: s.shopId,
    date: s.createdAt.toISOString().split("T")[0],
    createdAt: s.createdAt.toISOString(),
  }));

  return (
    <SaleView
      stats={{
        today: { count: todayAgg._count, amount: todayAgg._sum.totalAmount ?? 0 },
        week: { count: weekAgg._count, amount: weekAgg._sum.totalAmount ?? 0 },
        month: { count: monthAgg._count, amount: monthAgg._sum.totalAmount ?? 0 },
        year: { count: yearAgg._count, amount: yearAgg._sum.totalAmount ?? 0 },
        total: { count: sales.length, amount: sales.reduce((s, sale) => s + sale.totalAmount, 0) },
      }}
      sales={sales}
      products={products.map((p) => ({
        id: p.id,
        productName: p.productName,
        sellingPrice: p.sellingPrice,
        buyingPrice: p.buyingPrice,
        discount: p.discount ?? 0,
        quantity: p.quantity,
        imageUrl: p.imageUrl ?? null,
        shopId: p.shopId,
        shopName: p.shop.name,
      }))}
      shops={shops}
      staffList={staffList}
      profile={{
        role: profile?.role ?? "user",
        shopId: activeShopId,
        fullName: staffRecord?.fullName ?? profile?.fullName ?? session.user.name ?? "Unknown",
      }}
      hasStaffRecord={!!staffRecord}
      activeShopId={activeShopId}
    />
  );
}