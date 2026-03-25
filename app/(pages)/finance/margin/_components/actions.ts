// app/wallet/margins/actions.ts
"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as z from "zod";

export type ActionResult = { success: boolean; error?: string };

const marginSchema = z.object({
  date: z.string().min(1, "Date required"),
  value: z.number().min(0),
  profitType: z.string().optional(),
  shopId: z.string().min(1, "Shop required"),
});

export async function saveMarginAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const marginId = formData.get("marginId")?.toString() ?? null;
  const raw = {
    date: formData.get("date")?.toString() ?? "",
    value: Number(formData.get("value") || 0),
    profitType: formData.get("profitType")?.toString().trim() || undefined,
    shopId: formData.get("shopId")?.toString() ?? "",
  };

  try {
    const validated = marginSchema.parse(raw);
    const data = { ...validated, date: new Date(`${validated.date}T00:00:00.000Z`) };

    if (marginId) {
      await prisma.margin.update({ where: { id: marginId }, data });
    } else {
      await prisma.margin.create({ data });
    }
    revalidatePath("/wallet/margins");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.message };
    console.error(err);
    return { success: false, error: marginId ? "Update failed" : "Create failed" };
  }
}

export async function deleteMarginAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  try {
    await prisma.margin.delete({ where: { id } });
    revalidatePath("/wallet/margins");
    return { success: true };
  } catch {
    return { success: false, error: "Delete failed" };
  }
}