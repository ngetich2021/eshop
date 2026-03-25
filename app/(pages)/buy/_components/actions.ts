// app/buy/actions.ts
"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as z from "zod";

export type ActionResult = { success: boolean; error?: string };

const buySchema = z.object({
  supplierId: z.string().min(1, "Supplier required"),
  itemsJson: z.string().min(1, "Items required"),
  totalAmount: z.number().min(1, "Amount required"),
  transportCost: z.number().default(0),
  status: z.string().default("pending"),
  shopId: z.string().min(1, "Shop required"),
});

export async function saveBuyAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const buyId = formData.get("buyId")?.toString() ?? null;
  const raw = {
    supplierId: formData.get("supplierId")?.toString() ?? "",
    itemsJson: formData.get("itemsJson")?.toString() ?? "[]",
    totalAmount: Number(formData.get("totalAmount") || 0),
    transportCost: Number(formData.get("transportCost") || 0),
    status: formData.get("status")?.toString() ?? "pending",
    shopId: formData.get("shopId")?.toString() ?? "",
  };

  try {
    const validated = buySchema.parse(raw);
    if (buyId) {
      await prisma.buy.update({ where: { id: buyId }, data: validated });
    } else {
      await prisma.buy.create({ data: validated });
    }
    revalidatePath("/buy");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.message };
    console.error(err);
    return { success: false, error: buyId ? "Update failed" : "Create failed" };
  }
}

export async function deleteBuyAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  try {
    await prisma.buy.delete({ where: { id } });
    revalidatePath("/buy");
    return { success: true };
  } catch {
    return { success: false, error: "Delete failed" };
  }
}