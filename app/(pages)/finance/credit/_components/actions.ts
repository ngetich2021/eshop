// app/credit/actions.ts
"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as z from "zod";

export type ActionResult = { success: boolean; error?: string };

const creditSchema = z.object({
  amount: z.number().min(1, "Amount required"),
  downPayment: z.number().default(0),
  dueDate: z.string().optional(),
  status: z.string().default("pending"),
  shopId: z.string().min(1, "Shop required"),
});

export async function saveCreditAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const creditId = formData.get("creditId")?.toString() ?? null;
  const dueDateRaw = formData.get("dueDate")?.toString();

  const raw = {
    amount: Number(formData.get("amount") || 0),
    downPayment: Number(formData.get("downPayment") || 0),
    dueDate: dueDateRaw || undefined,
    status: formData.get("status")?.toString() ?? "pending",
    shopId: formData.get("shopId")?.toString() ?? "",
  };

  try {
    const validated = creditSchema.parse(raw);
    const data = {
      ...validated,
      dueDate: validated.dueDate ? new Date(`${validated.dueDate}T00:00:00.000Z`) : null,
    };

    if (creditId) {
      await prisma.credit.update({ where: { id: creditId }, data });
    } else {
      await prisma.credit.create({ data });
    }
    revalidatePath("/credit");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.message };
    console.error(err);
    return { success: false, error: creditId ? "Update failed" : "Create failed" };
  }
}

export async function deleteCreditAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  try {
    await prisma.credit.delete({ where: { id } });
    revalidatePath("/credit");
    return { success: true };
  } catch {
    return { success: false, error: "Delete failed" };
  }
}