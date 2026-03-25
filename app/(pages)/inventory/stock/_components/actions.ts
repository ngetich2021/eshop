// app/inventory/adjustStock/_components/actions.ts
"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as z from "zod";

export type ActionResult = { success: boolean; error?: string };

const adjustSchema = z.object({
  productId: z.string().min(1, "Product required"),
  adjustType: z.enum(["increase", "decrease", "set"]),
  quantity: z.number().min(0),
  shopId: z.string().min(1, "Shop required"),
});

export async function saveAdjustmentAction(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { fullName: true, shopId: true, role: true },
  });

  const isAdmin = profile?.role?.toLowerCase().trim() === "admin";

  const resolvedShopId =
    profile?.shopId ??
    (isAdmin ? formData.get("shopId")?.toString() ?? "" : "");

  if (!resolvedShopId)
    return { success: false, error: "Shop not assigned. Please contact administrator." };

  const adjustedBy = profile?.fullName ?? session.user.name ?? "Unknown";

  const raw = {
    productId: formData.get("productId")?.toString() ?? "",
    adjustType: formData.get("adjustType")?.toString() ?? "increase",
    quantity: Number(formData.get("quantity") || 0),
    shopId: resolvedShopId,
  };

  try {
    const validated = adjustSchema.parse(raw);

    const product = await prisma.product.findUnique({
      where: { id: validated.productId },
      select: { quantity: true, sellingPrice: true },
    });

    if (!product) return { success: false, error: "Product not found" };

    const originalStock = product.quantity;
    let newStockQty = originalStock;

    if (validated.adjustType === "increase") newStockQty = originalStock + validated.quantity;
    else if (validated.adjustType === "decrease") newStockQty = Math.max(0, originalStock - validated.quantity);
    else if (validated.adjustType === "set") newStockQty = validated.quantity;

    const value = (product.sellingPrice ?? 0) * validated.quantity;

    await prisma.$transaction([
      prisma.adjustment.create({
        data: {
          productId: validated.productId,
          adjustType: validated.adjustType,
          quantity: validated.quantity,
          shopId: validated.shopId,
          originalStock,
          newStockQty,
          value,
          adjustedBy,
        },
      }),
      prisma.product.update({
        where: { id: validated.productId },
        data: { quantity: newStockQty },
      }),
    ]);

    revalidatePath("/inventory/adjustStock");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError)
      return { success: false, error: err.issues[0]?.message ?? "Validation failed" };
    console.error(err);
    return { success: false, error: "Adjustment failed" };
  }
}

export async function deleteAdjustmentAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  try {
    await prisma.adjustment.delete({ where: { id } });
    revalidatePath("/inventory/adjustStock");
    return { success: true };
  } catch {
    return { success: false, error: "Delete failed" };
  }
}