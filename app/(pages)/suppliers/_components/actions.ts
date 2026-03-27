"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { resolveActiveShop } from "@/lib/active-shop";
import * as z from "zod";

export type ActionResult = { success: boolean; error?: string };

const supplierSchema = z.object({
  name: z.string().min(1, "Name required"),
  contact1: z.string().min(1, "Contact required"),
  contact2: z.string().optional(),
  goodsType: z.string().optional(),
  shopId: z.string().min(1, "Shop context missing"),
});

export async function saveSupplierAction(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  // Force shopId resolution from the cookie
  const { activeShopId } = await resolveActiveShop(session.user.id);
  const supplierId = formData.get("supplierId")?.toString() ?? null;

  const raw = {
    name: formData.get("name")?.toString() ?? "",
    contact1: formData.get("contact1")?.toString() ?? "",
    contact2: formData.get("contact2")?.toString().trim() || undefined,
    goodsType: formData.get("goodsType")?.toString().trim() || undefined,
    shopId: activeShopId, 
  };

  try {
    const validated = supplierSchema.parse(raw);
    if (supplierId) {
      await prisma.supplier.update({ 
        where: { id: supplierId, shopId: activeShopId }, 
        data: validated 
      });
    } else {
      await prisma.supplier.create({ data: validated });
    }
    revalidatePath("/suppliers");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: "Validation failed" };
    console.error(err);
    return { success: false, error: supplierId ? "Update failed" : "Create failed" };
  }
}

export async function deleteSupplierAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  
  const { activeShopId } = await resolveActiveShop(session.user.id);

  try {
    // Safety check: only delete if it belongs to the active shop
    await prisma.supplier.delete({ where: { id, shopId: activeShopId } });
    revalidatePath("/suppliers");
    return { success: true };
  } catch {
    return { success: false, error: "Delete failed" };
  }
}