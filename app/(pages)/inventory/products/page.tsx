// app/inventory/products/page.tsx
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import ProductsView from "./_components/ProductsClient";

export const revalidate = 1;

export default async function ProductsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-gray-600">Please sign in to access inventory</p>
      </div>
    );
  }

  const userId = session.user.id;
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { role: true },
  });
  const isAdmin = profile?.role?.toLowerCase().trim() === "admin";

  const stats = {
    totalProducts: 123,
    productValue: 1256200,
    totalSold: 456,
    totalReturned: 3,
    outOfStock: 6,
    slowSelling: 5,
  };

  const products = await prisma.product.findMany({
    where: isAdmin ? undefined : { shop: { userId } },
    select: {
      id: true,
      productName: true,
      serialNo: true,
      imageUrl: true,
      sellingPrice: true,
      discount: true,
      quantity: true,
      buyingPrice: true,
      outOfStockLimit: true,           // ← THIS WAS MISSING (root cause)
      subCategory: {
        select: {
          id: true,
          name: true,
          category: { select: { id: true, name: true } },
        },
      },
      shop: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

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
      stats={stats}
      products={products.map((p) => ({
        id: p.id,
        name: p.productName,
        serialNo: p.serialNo ?? "",
        image: p.imageUrl ?? null,
        category: p.subCategory?.category?.name ?? "—",
        subcategory: p.subCategory?.name ?? "—",
        price: p.sellingPrice,
        discount: p.discount ?? 0,
        quantity: p.quantity,
        shop: p.shop?.name ?? "—",
        buyingPrice: p.buyingPrice,
        subCategoryId: p.subCategory?.id ?? "",
        categoryId: p.subCategory?.category?.id ?? "",
        outOfStockLimit: p.outOfStockLimit,     // ← THIS WAS MISSING
      }))}
      categories={categories}
      subCategories={subCategories}
    />
  );
}