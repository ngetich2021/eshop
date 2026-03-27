// app/expense/_components/actions.ts
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

export async function saveExpenseAction(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const expenseId = formData.get("expenseId")?.toString() ?? null;

  // paidById is always the session user — not from form selection
  const raw = {
    description: formData.get("description")?.toString() ?? "",
    amount: Number(formData.get("amount") || 0),
    category: formData.get("category")?.toString().trim() || undefined,
    paidById: session.user.id,
    shopId: formData.get("shopId")?.toString() ?? "",
  };

  try {
    const validated = expenseSchema.parse(raw);

    const wallet = await prisma.wallet.findUnique({
      where: { shopId: validated.shopId },
      select: { id: true, balance: true },
    });

    if (!wallet) {
      return { success: false, error: "No wallet found for this shop. Source for more data." };
    }

    let oldAmount = 0;
    if (expenseId) {
      const existing = await prisma.expense.findUnique({
        where: { id: expenseId },
        select: { amount: true },
      });
      oldAmount = existing?.amount ?? 0;
    }

    const netDeduction = validated.amount - oldAmount;

    if (wallet.balance < netDeduction) {
      return {
        success: false,
        error: `Insufficient wallet balance (KSh ${wallet.balance.toLocaleString()}) for KSh ${validated.amount.toLocaleString()}`,
      };
    }

    if (expenseId) {
      await prisma.expense.update({ where: { id: expenseId }, data: validated });
      if (netDeduction !== 0) {
        await prisma.wallet.update({
          where: { shopId: validated.shopId },
          data: { balance: { decrement: netDeduction } },
        });
      }
    } else {
      await prisma.expense.create({ data: validated });
      await prisma.wallet.update({
        where: { shopId: validated.shopId },
        data: { balance: { decrement: validated.amount } },
      });
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
    const expense = await prisma.expense.findUnique({
      where: { id },
      select: { amount: true, shopId: true },
    });
    if (expense) {
      await prisma.expense.delete({ where: { id } });
      const wallet = await prisma.wallet.findUnique({ where: { shopId: expense.shopId } });
      if (wallet) {
        await prisma.wallet.update({
          where: { shopId: expense.shopId },
          data: { balance: { increment: expense.amount } },
        });
      }
    }
    revalidatePath("/expense");
    return { success: true };
  } catch {
    return { success: false, error: "Delete failed" };
  }
}