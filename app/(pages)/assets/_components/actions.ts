// app/assets/actions.ts
"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as z from "zod";

export type ActionResult = { success: boolean; error?: string };

const assetSchema = z.object({
  itemName: z.string().min(1, "Item name required"),
  cost: z.number().min(0),
  imageUrl: z.string().optional(),
  shopId: z.string().min(1, "Shop required"),
});

export async function saveAssetAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const assetId = formData.get("assetId")?.toString() ?? null;
  const raw = {
    itemName: formData.get("itemName")?.toString() ?? "",
    cost: Number(formData.get("cost") || 0),
    imageUrl: formData.get("imageUrl")?.toString().trim() || undefined,
    shopId: formData.get("shopId")?.toString() ?? "",
  };

  try {
    const validated = assetSchema.parse(raw);
    if (assetId) {
      await prisma.asset.update({ where: { id: assetId }, data: validated });
    } else {
      await prisma.asset.create({ data: validated });
    }
    revalidatePath("/assets");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.message };
    console.error(err);
    return { success: false, error: assetId ? "Update failed" : "Create failed" };
  }
}

export async function deleteAssetAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  try {
    await prisma.asset.delete({ where: { id } });
    revalidatePath("/assets");
    return { success: true };
  } catch {
    return { success: false, error: "Delete failed" };
  }
}