// app/suppliers/actions.ts
"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as z from "zod";

export type ActionResult = { success: boolean; error?: string };

const supplierSchema = z.object({
  name: z.string().min(1, "Name required"),
  contact1: z.string().min(1, "Contact required"),
  contact2: z.string().optional(),
  goodsType: z.string().optional(),
  shopId: z.string().min(1, "Shop required"),
});

export async function saveSupplierAction(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const supplierId = formData.get("supplierId")?.toString() ?? null;

  const raw = {
    name: formData.get("name")?.toString() ?? "",
    contact1: formData.get("contact1")?.toString() ?? "",
    contact2: formData.get("contact2")?.toString().trim() || undefined,
    goodsType: formData.get("goodsType")?.toString().trim() || undefined,
    shopId: formData.get("shopId")?.toString() ?? "",
  };

  try {
    const validated = supplierSchema.parse(raw);
    if (supplierId) {
      await prisma.supplier.update({ where: { id: supplierId }, data: validated });
    } else {
      await prisma.supplier.create({ data: validated });
    }
    revalidatePath("/suppliers");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.message };
    console.error(err);
    return { success: false, error: supplierId ? "Update failed" : "Create failed" };
  }
}

export async function deleteSupplierAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  try {
    await prisma.supplier.delete({ where: { id } });
    revalidatePath("/suppliers");
    return { success: true };
  } catch {
    return { success: false, error: "Delete failed" };
  }
}