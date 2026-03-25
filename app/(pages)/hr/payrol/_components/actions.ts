"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as z from "zod";

export type ActionResult = { success: boolean; error?: string };

const payrollSchema = z.object({
  staffId: z.string().min(1, "Staff required"),
  salary: z.number().min(1, "Salary required"),
  payable: z.number().min(0, "Payable required"),
  status: z.string().default("pending"),
  shopId: z.string().min(1, "Shop required"),
});

export async function savePayrollAction(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const payrollId = formData.get("payrollId")?.toString() ?? null;
  const raw = {
    staffId: formData.get("staffId")?.toString() ?? "",
    salary: Number(formData.get("salary") || 0),
    payable: Number(formData.get("payable") || 0),
    status: formData.get("status")?.toString() ?? "pending",
    shopId: formData.get("shopId")?.toString() ?? "",
  };

  try {
    const validated = payrollSchema.parse(raw);
    if (payrollId) {
      await prisma.payroll.update({ where: { id: payrollId }, data: validated });
    } else {
      await prisma.payroll.create({ data: validated });
    }
    revalidatePath("/hr/payroll");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.message };
    console.error(err);
    return { success: false, error: payrollId ? "Update failed" : "Create failed" };
  }
}

export async function deletePayrollAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  try {
    await prisma.payroll.delete({ where: { id } });
    revalidatePath("/hr/payroll");
    return { success: true };
  } catch {
    return { success: false, error: "Delete failed" };
  }
}