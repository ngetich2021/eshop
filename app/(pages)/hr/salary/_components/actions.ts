"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as z from "zod";

export type ActionResult = { success: boolean; error?: string };

const salarySchema = z.object({
  staffId: z.string().min(1, "Staff required"),
  amount: z.number().min(1, "Amount required"),
  month: z.string().min(1, "Month required"),
  status: z.string().default("pending"),
  shopId: z.string().min(1, "Shop required"),
});

export async function saveSalaryAction(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const salaryId = formData.get("salaryId")?.toString() ?? null;
  const raw = {
    staffId: formData.get("staffId")?.toString() ?? "",
    amount: Number(formData.get("amount") || 0),
    month: formData.get("month")?.toString() ?? "",
    status: formData.get("status")?.toString() ?? "pending",
    shopId: formData.get("shopId")?.toString() ?? "",
  };

  try {
    const validated = salarySchema.parse(raw);
    if (salaryId) {
      await prisma.salary.update({ where: { id: salaryId }, data: validated });
    } else {
      await prisma.salary.create({ data: validated });
    }
    revalidatePath("/hr/salary");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.message };
    console.error(err);
    return { success: false, error: salaryId ? "Update failed" : "Create failed" };
  }
}

export async function deleteSalaryAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  try {
    await prisma.salary.delete({ where: { id } });
    revalidatePath("/hr/salary");
    return { success: true };
  } catch {
    return { success: false, error: "Delete failed" };
  }
}