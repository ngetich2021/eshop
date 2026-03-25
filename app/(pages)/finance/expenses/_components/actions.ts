// app/expense/actions.ts
"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as z from "zod";

export type ActionResult = { success: boolean; error?: string };

const expenseSchema = z.object({
  description: z.string().min(1, "Description required"),
  amount: z.number().min(1, "Amount required"),
  category: z.string().optional(),
  paidById: z.string().min(1, "Paid by required"),
  shopId: z.string().min(1, "Shop required"),
});

export async function saveExpenseAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const expenseId = formData.get("expenseId")?.toString() ?? null;
  const raw = {
    description: formData.get("description")?.toString() ?? "",
    amount: Number(formData.get("amount") || 0),
    category: formData.get("category")?.toString().trim() || undefined,
    paidById: formData.get("paidById")?.toString() ?? session.user.id,
    shopId: formData.get("shopId")?.toString() ?? "",
  };

  try {
    const validated = expenseSchema.parse(raw);
    if (expenseId) {
      await prisma.expense.update({ where: { id: expenseId }, data: validated });
    } else {
      await prisma.expense.create({ data: validated });
    }
    revalidatePath("/expense");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.message };
    console.error(err);
    return { success: false, error: expenseId ? "Update failed" : "Create failed" };
  }
}

export async function deleteExpenseAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  try {
    await prisma.expense.delete({ where: { id } });
    revalidatePath("/expense");
    return { success: true };
  } catch {
    return { success: false, error: "Delete failed" };
  }
}