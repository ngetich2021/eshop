// app/inventory/adjustStock/_components/returnActions.ts
"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type ActionResult = { success: boolean; error?: string };

// ── CREATE RETURN ─────────────────────────────────────────────────────────────
export async function saveReturnAction(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const userId = session.user.id;

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { role: true, shopId: true },
  });

  const isAdmin = profile?.role?.toLowerCase().trim() === "admin";
  const formShopId = formData.get("shopId")?.toString() ?? "";
  const resolvedShopId = isAdmin && !profile?.shopId ? formShopId : (profile?.shopId ?? "");

  if (!resolvedShopId)
    return { success: false, error: "No shop assigned. Contact administrator." };

  const saleId = formData.get("saleId")?.toString() || null;
  const reason = formData.get("reason")?.toString().trim() || null;

  let items: { productId: string; quantity: number; price: number; reason?: string }[] = [];
  try {
    items = JSON.parse(formData.get("items")?.toString() ?? "[]");
  } catch {
    return { success: false, error: "Invalid items data" };
  }

  if (!items.length) return { success: false, error: "At least one return item is required" };

  for (const item of items) {
    if (!item.productId)           return { success: false, error: "Each item must have a product" };
    if (!item.quantity || item.quantity < 1) return { success: false, error: "Quantity must be at least 1" };
    if (item.price < 0)            return { success: false, error: "Price must be 0 or more" };

    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: { shopId: true },
    });
    if (!product) return { success: false, error: "Product not found" };
    if (product.shopId !== resolvedShopId)
      return { success: false, error: "A product does not belong to the active shop" };
  }

  if (saleId) {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      select: { shopId: true },
    });
    if (!sale) return { success: false, error: "Sale not found" };
    if (sale.shopId !== resolvedShopId)
      return { success: false, error: "Sale does not belong to the active shop" };
  }

  try {
    await prisma.return.create({
      data: {
        saleId,
        returnedById: userId,
        reason,
        status: "pending",
        shopId: resolvedShopId,
        returnItems: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity:  item.quantity,
            price:     item.price,
            reason:    item.reason?.trim() || null,
          })),
        },
      },
    });

    // Restore stock for each returned product
    for (const item of items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { quantity: { increment: item.quantity } },
      });
    }

    revalidatePath("/inventory/adjustStock");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Failed to save return" };
  }
}

// ── UPDATE RETURN STATUS ──────────────────────────────────────────────────────
export async function updateReturnStatusAction(
  id: string,
  status: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const isAdmin =
    (await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { role: true },
    }))?.role?.toLowerCase().trim() === "admin";

  try {
    const existing = await prisma.return.findUnique({
      where: { id },
      select: { shop: { select: { userId: true } } },
    });
    if (!existing) return { success: false, error: "Return not found" };
    if (!isAdmin && existing.shop.userId !== session.user.id)
      return { success: false, error: "Not authorized" };

    await prisma.return.update({ where: { id }, data: { status } });
    revalidatePath("/inventory/adjustStock");
    return { success: true };
  } catch {
    return { success: false, error: "Status update failed" };
  }
}

// ── DELETE RETURN ─────────────────────────────────────────────────────────────
export async function deleteReturnAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const isAdmin =
    (await prisma.profile.findUnique({
      where: { userId: session.user.id },
      select: { role: true },
    }))?.role?.toLowerCase().trim() === "admin";

  try {
    const existing = await prisma.return.findUnique({
      where: { id },
      select: {
        shop: { select: { userId: true } },
        returnItems: { select: { productId: true, quantity: true } },
      },
    });
    if (!existing) return { success: false, error: "Return not found" };
    if (!isAdmin && existing.shop.userId !== session.user.id)
      return { success: false, error: "Not authorized to delete this return" };

    // Reverse stock restoration
    for (const item of existing.returnItems) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { quantity: { decrement: item.quantity } },
      });
    }

    await prisma.return.delete({ where: { id } });
    revalidatePath("/inventory/adjustStock");
    return { success: true };
  } catch {
    return { success: false, error: "Delete failed" };
  }
}