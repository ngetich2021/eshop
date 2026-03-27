// app/credit/actions.ts
"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as z from "zod";

export type ActionResult = { success: boolean; error?: string };

// ── EDIT CREDIT ───────────────────────────────────────────────────────────────
const editCreditSchema = z.object({
  creditId: z.string().min(1),
  dueDate: z.string().optional(),
  note: z.string().optional(),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
});

export async function editCreditAction(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const raw = {
    creditId: formData.get("creditId")?.toString() ?? "",
    dueDate: formData.get("dueDate")?.toString() || undefined,
    note: formData.get("note")?.toString() || undefined,
    customerName: formData.get("customerName")?.toString() || undefined,
    customerPhone: formData.get("customerPhone")?.toString() || undefined,
  };

  try {
    const validated = editCreditSchema.parse(raw);
    await prisma.credit.update({
      where: { id: validated.creditId },
      data: {
        dueDate: validated.dueDate
          ? new Date(`${validated.dueDate}T00:00:00.000Z`)
          : null,
        ...(validated.customerName !== undefined && { customerName: validated.customerName }),
        ...(validated.customerPhone !== undefined && { customerPhone: validated.customerPhone }),
      },
    });
    revalidatePath("/credit");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError)
      return { success: false, error: err.issues[0]?.message ?? "Validation failed" };
    console.error(err);
    return { success: false, error: "Update failed" };
  }
}

// ── ADD CREDIT PAYMENT ────────────────────────────────────────────────────────
const creditPaymentSchema = z.object({
  creditId: z.string().min(1),
  amount: z.number().min(1, "Amount must be at least 1"),
  method: z.string().min(1, "Payment method required"),
  note: z.string().optional(),
  dueDate: z.string().optional(),
  paidAt: z.string().optional(),
  shopId: z.string().min(1),
});

export async function addCreditPaymentAction(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const raw = {
    creditId: formData.get("creditId")?.toString() ?? "",
    amount: Number(formData.get("amount") || 0),
    method: formData.get("method")?.toString() ?? "",
    note: formData.get("note")?.toString() || undefined,
    dueDate: formData.get("dueDate")?.toString() || undefined,
    paidAt: formData.get("paidAt")?.toString() || undefined,
    shopId: formData.get("shopId")?.toString() ?? "",
  };

  try {
    const validated = creditPaymentSchema.parse(raw);

    await prisma.$transaction(async (tx) => {
      const credit = await tx.credit.findUnique({
        where: { id: validated.creditId },
        include: { creditPayments: { select: { amount: true } } },
      });
      if (!credit) throw new Error("Credit record not found");

      const totalPaid =
        credit.downPayment +
        credit.creditPayments.reduce((s, p) => s + p.amount, 0);
      const remaining = credit.amount - totalPaid;

      if (validated.amount > remaining + 0.01) {
        throw new Error(
          `Payment exceeds remaining balance (KSh ${remaining.toLocaleString()})`
        );
      }

      await tx.creditPayment.create({
        data: {
          creditId: validated.creditId,
          amount: validated.amount,
          method: validated.method,
          note: validated.note ?? null,
          dueDate: validated.dueDate
            ? new Date(`${validated.dueDate}T00:00:00.000Z`)
            : null,
          paidAt: validated.paidAt ? new Date(validated.paidAt) : new Date(),
          shopId: validated.shopId,
        },
      });

      const newTotalPaid = totalPaid + validated.amount;
      const newStatus =
        newTotalPaid >= credit.amount
          ? "paid"
          : newTotalPaid > 0
          ? "partial"
          : "pending";

      await tx.credit.update({
        where: { id: validated.creditId },
        data: {
          status: newStatus,
          ...(validated.dueDate && {
            dueDate: new Date(`${validated.dueDate}T00:00:00.000Z`),
          }),
        },
      });
    });

    revalidatePath("/credit");
    revalidatePath("/payments");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError)
      return { success: false, error: err.issues[0]?.message ?? "Validation failed" };
    if (err instanceof Error) return { success: false, error: err.message };
    console.error(err);
    return { success: false, error: "Failed to record payment" };
  }
}

// ── DELETE CREDIT PAYMENT ─────────────────────────────────────────────────────
export async function deleteCreditPaymentAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  try {
    await prisma.$transaction(async (tx) => {
      const payment = await tx.creditPayment.findUnique({
        where: { id },
        select: { creditId: true, amount: true },
      });
      if (!payment) throw new Error("Payment not found");

      await tx.creditPayment.delete({ where: { id } });

      const credit = await tx.credit.findUnique({
        where: { id: payment.creditId },
        include: { creditPayments: { select: { amount: true } } },
      });
      if (!credit) return;

      const totalPaid =
        credit.downPayment +
        credit.creditPayments.reduce((s, p) => s + p.amount, 0);
      const newStatus =
        totalPaid >= credit.amount
          ? "paid"
          : totalPaid > 0
          ? "partial"
          : "pending";

      await tx.credit.update({
        where: { id: payment.creditId },
        data: { status: newStatus },
      });
    });

    revalidatePath("/credit");
    revalidatePath("/payments");
    return { success: true };
  } catch (err) {
    if (err instanceof Error) return { success: false, error: err.message };
    return { success: false, error: "Delete failed" };
  }
}

// ── DELETE CREDIT ─────────────────────────────────────────────────────────────
export async function deleteCreditAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  try {
    await prisma.credit.delete({ where: { id } });
    revalidatePath("/credit");
    revalidatePath("/payments");
    return { success: true };
  } catch {
    return { success: false, error: "Delete failed" };
  }
}