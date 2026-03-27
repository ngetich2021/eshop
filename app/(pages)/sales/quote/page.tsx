// app/sale/quote/page.tsx
import { auth } from "@/auth";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import QuoteView from "./_components/QuoteView";
import { selectQuoteShopAction } from "./_components/actions";
import ShopPortal from "../../welcome/_components/Shopportal";

const shopSelect = {
  id: true,
  name: true,
  tel: true,
  location: true,
  wallet: { select: { balance: true } },
  staffs: {
    select: {
      id: true, userId: true, fullName: true,
      tel1: true, tel2: true, mpesaNo: true, baseSalary: true,
    },
  },
  sales: { select: { soldById: true, totalAmount: true, createdAt: true } },
  expenses: { select: { amount: true } },
  buys: { select: { totalAmount: true } },
  margins: { select: { value: true } },
  credits: { select: { status: true } },
} as const;

export default async function QuotePage() {
  const session = await auth();
  if (!session?.user?.id)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Please sign in
      </div>
    );

  const userId = session.user.id;

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

  const shops = await prisma.shop.findMany({
    where: isAdmin ? undefined : { userId },
    select: shopSelect,
    orderBy: { name: "asc" },
  });

  // ── Read active shop from cookie ───────────────────────────────────────────
  const cookieStore = await cookies();
  const cookieShopId = cookieStore.get("active_shop_id")?.value ?? null;

  // Validate the cookie value is a shop this user can actually access
  const resolvedShopId =
    cookieShopId && shops.find((s) => s.id === cookieShopId)
      ? cookieShopId
      : null;

  // ── No valid shop cookie — show ShopPortal ─────────────────────────────────
  if (!resolvedShopId) {
    // Staff with no cookie: find their assigned shop and auto-redirect
    if (staffRecord) {
      const staffShop = await prisma.shop.findFirst({
        where: { staffs: { some: { userId } } },
        select: shopSelect,
      });

      if (staffShop) {
        return (
          <ShopPortal
            role="staff"
            user={{
              id: userId,
              name: staffRecord.fullName ?? session.user.name ?? null,
            }}
            staffShop={staffShop}
            selectAction={selectQuoteShopAction}
          />
        );
      }
    }

    // Owner / admin: show the full portal picker, redirects back to /sale/quote
    return (
      <ShopPortal
        role="owner"
        user={{
          id: userId,
          name: profile?.fullName ?? session.user.name ?? null,
          shops,
        }}
        selectAction={selectQuoteShopAction}
      />
    );
  }

  // ── Valid shop resolved — fetch all quote data ──────────────────────────────
  const resolvedShop = shops.find((s) => s.id === resolvedShopId)!;
  const shopFilter = { shopId: resolvedShopId };

  // Reuse staffs already on the shop relation — avoids an extra DB round-trip
  const staffList =
    resolvedShop.staffs.length > 0
      ? resolvedShop.staffs.map((s) => ({ id: s.id, fullName: s.fullName }))
      : await prisma.staff.findMany({
          select: { id: true, fullName: true },
          orderBy: { fullName: "asc" },
        });

  const products = await prisma.product.findMany({
    where: shopFilter,
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
  });

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const [quotesRaw, todayAgg, weekAgg, monthAgg, yearAgg] = await Promise.all([
    prisma.quote.findMany({
      where: shopFilter,
      select: {
        id: true,
        soldById: true,
        amount: true,
        customerName: true,
        customerContact: true,
        shopId: true,
        shop: { select: { name: true, location: true, tel: true } },
        quoteItems: {
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
    prisma.quote.aggregate({
      where: { ...shopFilter, createdAt: { gte: startOfDay } },
      _sum: { amount: true }, _count: true,
    }),
    prisma.quote.aggregate({
      where: { ...shopFilter, createdAt: { gte: startOfWeek } },
      _sum: { amount: true }, _count: true,
    }),
    prisma.quote.aggregate({
      where: { ...shopFilter, createdAt: { gte: startOfMonth } },
      _sum: { amount: true }, _count: true,
    }),
    prisma.quote.aggregate({
      where: { ...shopFilter, createdAt: { gte: startOfYear } },
      _sum: { amount: true }, _count: true,
    }),
  ]);

  const quotes = quotesRaw.map((q) => ({
    id: q.id,
    soldById: q.soldById,
    soldByName: staffList.find((s) => s.id === q.soldById)?.fullName ?? "Unknown",
    customerName: q.customerName,
    customerContact: q.customerContact,
    items: q.quoteItems.map((qi) => ({
      id: qi.id,
      productName: qi.product.productName,
      quantity: qi.quantity,
      price: qi.price,
      discount: qi.discount,
    })),
    amount: q.amount,
    shop: q.shop.name,
    shopLocation: q.shop.location ?? "",
    shopTel: q.shop.tel ?? "",
    shopId: q.shopId,
    date: q.createdAt.toISOString().split("T")[0],
    createdAt: q.createdAt.toISOString(),
  }));

  const shopsForView = shops.map((s) => ({
    id: s.id,
    name: s.name,
    location: s.location ?? "",
    tel: s.tel ?? "",
  }));

  return (
    <QuoteView
      stats={{
        today: { count: todayAgg._count, amount: todayAgg._sum.amount ?? 0 },
        week:  { count: weekAgg._count,  amount: weekAgg._sum.amount  ?? 0 },
        month: { count: monthAgg._count, amount: monthAgg._sum.amount ?? 0 },
        year:  { count: yearAgg._count,  amount: yearAgg._sum.amount  ?? 0 },
        total: {
          count: quotes.length,
          amount: quotes.reduce((s, q) => s + q.amount, 0),
        },
      }}
      quotes={quotes}
      products={products.map((p) => ({
        id: p.id,
        productName: p.productName,
        sellingPrice: p.sellingPrice,
        buyingPrice: p.buyingPrice ?? 0,
        discount: p.discount ?? 0,
        quantity: p.quantity,
        imageUrl: p.imageUrl ?? null,
        shopId: p.shopId,
        shopName: p.shop.name,
      }))}
      shops={shopsForView}
      staffList={staffList}
      profile={{
        role: profile?.role ?? "user",
        shopId: resolvedShopId,
        fullName:
          staffRecord?.fullName ??
          profile?.fullName ??
          session.user.name ??
          "Unknown",
      }}
      hasStaffRecord={!!staffRecord}
      requiresShopSelection={false}
    />
  );
}