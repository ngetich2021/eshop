// app/inventory/products/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { resolveActiveShop } from "@/lib/active-shop";
import ProductsView from "./_components/ProductsClient";

export const revalidate = 0;

export default async function ProductsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { activeShopId, activeShop, isStaff, isAdmin } = await resolveActiveShop(
    session.user.id
  );

  // ── Find the owner of the active shop ────────────────────────────────────
  // Staff and admin see all products owned by that shop owner for reference.
  const shopOwner = await prisma.shop.findUnique({
    where: { id: activeShopId },
    select: { userId: true },
  });

  // All shops belonging to the same owner (so we can show their full catalogue)
  const ownerShopIds = shopOwner
    ? (
        await prisma.shop.findMany({
          where: { userId: shopOwner.userId },
          select: { id: true },
        })
      ).map((s) => s.id)
    : [activeShopId];

  // ── ALL products across owner shops — for reference catalogue ─────────────
  const allProducts = await prisma.product.findMany({
    where: { shopId: { in: ownerShopIds } },
    select: {
      id: true,
      productName: true,
      serialNo: true,
      imageUrl: true,
      sellingPrice: true,
      discount: true,
      quantity: true,
      buyingPrice: true,
      outOfStockLimit: true,
      shopId: true,
      subCategory: {
        select: {
          id: true,
          name: true,
          category: { select: { id: true, name: true } },
        },
      },
      shop: { select: { id: true, name: true, location: true } },
    },
    orderBy: [
      // Active shop products first
      { shopId: "asc" },
      { createdAt: "desc" },
    ],
  });

  // ── Stats — only for the active shop ─────────────────────────────────────
  const activeProducts = allProducts.filter((p) => p.shopId === activeShopId);

  const totalProducts = activeProducts.length;
  const productValue = activeProducts.reduce(
    (sum, p) => sum + p.buyingPrice * p.quantity,
    0
  );

  const soldAgg = await prisma.saleItem.aggregate({
    where: { sale: { shopId: activeShopId } },
    _sum: { quantity: true },
  });
  const totalSold = soldAgg._sum.quantity ?? 0;

  const returnedAgg = await prisma.returnItem.aggregate({
    where: { return: { shopId: activeShopId } },
    _sum: { quantity: true },
  });
  const totalReturned = returnedAgg._sum.quantity ?? 0;

  const outOfStock = activeProducts.filter((p) => p.quantity === 0).length;
  const slowSelling = activeProducts.filter(
    (p) => p.quantity > 0 && p.quantity <= p.outOfStockLimit
  ).length;

  // ── Categories & subcategories ────────────────────────────────────────────
  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const subCategories = await prisma.subCategory.findMany({
    select: {
      id: true,
      name: true,
      categoryId: true,
      category: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <ProductsView
      activeShop={activeShop}
      activeShopId={activeShopId}
      isStaff={isStaff}
      isAdmin={isAdmin}
      stats={{
        totalProducts,
        productValue,
        totalSold,
        totalReturned,
        outOfStock,
        slowSelling,
      }}
      products={allProducts.map((p) => ({
        id: p.id,
        name: p.productName,
        serialNo: p.serialNo ?? "",
        image: p.imageUrl ?? null,
        category: p.subCategory?.category?.name ?? "—",
        subcategory: p.subCategory?.name ?? "—",
        price: p.sellingPrice,
        discount: p.discount ?? 0,
        quantity: p.quantity,
        shopId: p.shopId,
        shopName: p.shop?.name ?? "—",
        shopLocation: p.shop?.location ?? "",
        buyingPrice: p.buyingPrice,
        subCategoryId: p.subCategory?.id ?? "",
        categoryId: p.subCategory?.category?.id ?? "",
        outOfStockLimit: p.outOfStockLimit,
        isOwnShop: p.shopId === activeShopId,
      }))}
      categories={categories}
      subCategories={subCategories}
    />
  );
}