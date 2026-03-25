"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { v2 as cloudinary } from "cloudinary";

export type ActionResult = {
  success: boolean;
  error?: string;
  newId?: string;
};

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

type CloudinaryUploadResult = {
  secure_url: string;
  public_id: string;
  version: number;
  width: number;
  height: number;
  format: string;
  resource_type: string;
  created_at: string;
  bytes: number;
};

// ── PRODUCT CREATE + UPDATE ───────────────────────────────────────────────
export async function saveProductAction(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const userId = session.user.id;
  const isAdmin =
    (await prisma.profile.findUnique({
      where: { userId },
      select: { role: true },
    }))?.role?.toLowerCase().trim() === "admin";

  const productId = formData.get("productId")?.toString() ?? null;
  const productName = formData.get("productName")?.toString().trim() ?? "";
  const serialNo = formData.get("serialNo")?.toString().trim() || null;
  const quantityInput = Number(formData.get("quantity") || 0);
  const outOfStockLimit = Number(formData.get("outOfStockLimit") || 5);
  const buyingPrice = Number(formData.get("buyingPrice") || 0);
  const sellingPrice = Number(formData.get("sellingPrice") || 0);
  const discount = Number(formData.get("discount") || 0);
  const subCategoryId = formData.get("subCategoryId")?.toString() ?? null;
  const imageFile = formData.get("image") as File | null;

  if (!productName || !subCategoryId || sellingPrice <= 0) {
    return { success: false, error: "Name, subcategory and valid selling price required" };
  }

  if (sellingPrice <= buyingPrice) {
    return { success: false, error: "Selling price must be greater than buying price" };
  }

  if (outOfStockLimit < 0) {
    return { success: false, error: "Out of stock limit cannot be negative" };
  }

  let imageUrl: string | null = null;

  if (imageFile && imageFile.size > 0) {
    try {
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploadResult = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "inventory/products",
              resource_type: "image",
              allowed_formats: ["jpg", "png", "jpeg", "webp"],
              transformation: [{ width: 800, height: 800, crop: "limit" }],
            },
            (error, result) => {
              if (error || !result) reject(error ?? new Error("Upload failed"));
              else resolve(result as CloudinaryUploadResult);
            }
          )
          .end(buffer);
      });

      imageUrl = uploadResult.secure_url;
    } catch (err) {
      console.error("Cloudinary upload failed:", err);
      return { success: false, error: "Image upload failed" };
    }
  }

  try {
    if (productId) {
      // ── EDIT ── quantity is NOT updated
      const existing = await prisma.product.findUnique({
        where: { id: productId },
        select: { shop: { select: { userId: true } } },
      });
      if (!existing) return { success: false, error: "Product not found" };
      if (!isAdmin && existing.shop.userId !== userId) {
        return { success: false, error: "Not authorized to edit this product" };
      }

      await prisma.product.update({
        where: { id: productId },
        data: {
          productName,
          serialNo,
          outOfStockLimit,
          buyingPrice,
          sellingPrice,
          discount,
          imageUrl: imageUrl ?? undefined,
          subCategoryId,
          // quantity is intentionally NOT included → preserved
        },
      });
    } else {
      // ── CREATE ── quantity is taken from form
      let finalShopId = formData.get("shopId")?.toString() ?? null;

      if (!finalShopId && !isAdmin) {
        const userShop = await prisma.shop.findFirst({
          where: { userId },
          select: { id: true },
        });
        if (!userShop) return { success: false, error: "No shop found for user" };
        finalShopId = userShop.id;
      } else if (!finalShopId && isAdmin) {
        const anyShop = await prisma.shop.findFirst({ select: { id: true } });
        if (!anyShop) return { success: false, error: "No shops exist" };
        finalShopId = anyShop.id;
      }

      await prisma.product.create({
        data: {
          productName,
          serialNo,
          quantity: quantityInput,
          outOfStockLimit,
          buyingPrice,
          sellingPrice,
          discount,
          imageUrl,
          subCategoryId,
          shopId: finalShopId!,
        },
      });
    }

    revalidatePath("/inventory/products");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: productId ? "Update failed" : "Create failed" };
  }
}

// ── DELETE PRODUCT ────────────────────────────────────────────────────────
export async function deleteProductAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const isAdmin =
    (await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { role: true },
    }))?.role?.toLowerCase().trim() === "admin";

  try {
    const existing = await prisma.product.findUnique({
      where: { id },
      select: { shop: { select: { userId: true } } },
    });
    if (!existing) return { success: false, error: "Product not found" };
    if (!isAdmin && existing.shop.userId !== session.user.id) {
      return { success: false, error: "Not your product" };
    }

    await prisma.product.delete({ where: { id } });
    revalidatePath("/inventory/products");
    return { success: true };
  } catch {
    return { success: false, error: "Delete failed (product may be referenced)" };
  }
}

// ── CATEGORY CREATE + UPDATE ──────────────────────────────────────────────
export async function saveCategoryAction(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const isAdmin =
    (await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { role: true },
    }))?.role?.toLowerCase().trim() === "admin";

  if (!isAdmin) return { success: false, error: "Admins only" };

  const id = formData.get("id")?.toString() ?? null;
  const name = formData.get("name")?.toString().trim() ?? "";

  if (!name) return { success: false, error: "Name required" };

  try {
    let categoryId = id;
    if (id) {
      await prisma.category.update({ where: { id }, data: { name } });
    } else {
      const created = await prisma.category.create({ data: { name } });
      categoryId = created.id;
    }
    revalidatePath("/inventory/products");
    return { success: true, newId: categoryId! };
  } catch {
    return { success: false, error: id ? "Update failed" : "Create failed" };
  }
}

export async function deleteCategoryAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const isAdmin =
    (await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { role: true },
    }))?.role?.toLowerCase().trim() === "admin";

  if (!isAdmin) return { success: false, error: "Admins only" };

  try {
    await prisma.category.delete({ where: { id } });
    revalidatePath("/inventory/products");
    return { success: true };
  } catch {
    return { success: false, error: "Delete failed (category may be in use)" };
  }
}

// ── SUBCATEGORY CREATE + UPDATE ───────────────────────────────────────────
export async function saveSubCategoryAction(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const isAdmin =
    (await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { role: true },
    }))?.role?.toLowerCase().trim() === "admin";

  if (!isAdmin) return { success: false, error: "Admins only" };

  const id = formData.get("id")?.toString() ?? null;
  const name = formData.get("name")?.toString().trim() ?? "";
  const categoryId = formData.get("categoryId")?.toString() ?? "";

  if (!name || !categoryId) return { success: false, error: "Name & category required" };

  try {
    let subId = id;
    if (id) {
      await prisma.subCategory.update({ where: { id }, data: { name, categoryId } });
    } else {
      const created = await prisma.subCategory.create({ data: { name, categoryId } });
      subId = created.id;
    }
    revalidatePath("/inventory/products");
    return { success: true, newId: subId! };
  } catch {
    return { success: false, error: id ? "Update failed" : "Create failed" };
  }
}

export async function deleteSubCategoryAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const isAdmin =
    (await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { role: true },
    }))?.role?.toLowerCase().trim() === "admin";

  if (!isAdmin) return { success: false, error: "Admins only" };

  try {
    await prisma.subCategory.delete({ where: { id } });
    revalidatePath("/inventory/products");
    return { success: true };
  } catch {
    return { success: false, error: "Delete failed (subcategory may be in use)" };
  }
}