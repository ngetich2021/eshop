"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as z from "zod";

export type ActionResult = {
  success: boolean;
  error?: string;
  newId?: string;
};

const advanceSchema = z.object({
  staffId: z.string().min(1, "Staff selection required"),
  amount: z.number().min(1, "Amount must be greater than 0"),
  date: z.string().min(1, "Date required"),
  reason: z.string().optional(),
  status: z.string().default("requested"),
  transactionCode: z.string().optional(),
  shopId: z.string().min(1, "Shop selection required"),
});

export async function saveAdvanceAction(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const userId = session.user.id;
  const isAdmin =
    (
      await prisma.profile.findUnique({
        where: { userId },
        select: { role: true },
      })
    )?.role?.toLowerCase().trim() === "admin";

  const advanceId = formData.get("advanceId")?.toString() ?? null;

  const rawData = {
    staffId: formData.get("staffId")?.toString() ?? "",
    amount: Number(formData.get("amount") || 0),
    date: formData.get("date")?.toString() ?? "",
    reason: formData.get("reason")?.toString().trim() ?? "",
    status: formData.get("status")?.toString() ?? "requested",
    transactionCode: formData.get("transactionCode")?.toString().trim() ?? "",
    shopId: formData.get("shopId")?.toString() ?? "",
  };

  try {
    const validated = advanceSchema.parse(rawData);

    // Convert "YYYY-MM-DD" → full ISO DateTime for Prisma
    const data = {
      ...validated,
      date: new Date(`${validated.date}T00:00:00.000Z`),
    };

    if (advanceId) {
      const existing = await prisma.advance.findUnique({
        where: { id: advanceId },
        select: { shop: { select: { userId: true } } },
      });
      if (!existing) return { success: false, error: "Advance not found" };
      if (!isAdmin && existing.shop.userId !== userId) {
        return { success: false, error: "Not authorized" };
      }

      await prisma.advance.update({
        where: { id: advanceId },
        data,
      });
    } else {
      await prisma.advance.create({ data });
    }

    revalidatePath("/hr/advance");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.message };
    console.error(err);
    return { success: false, error: advanceId ? "Update failed" : "Create failed" };
  }
}

export async function deleteAdvanceAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const isAdmin =
    (
      await prisma.profile.findUnique({
        where: { userId: session.user.id },
        select: { role: true },
      })
    )?.role?.toLowerCase().trim() === "admin";

  try {
    const existing = await prisma.advance.findUnique({
      where: { id },
      select: { shop: { select: { userId: true } } },
    });
    if (!existing) return { success: false, error: "Advance not found" };
    if (!isAdmin && existing.shop.userId !== session.user.id) {
      return { success: false, error: "Not your advance" };
    }

    await prisma.advance.delete({ where: { id } });
    revalidatePath("/hr/advance");
    return { success: true };
  } catch {
    return { success: false, error: "Delete failed" };
  }
}