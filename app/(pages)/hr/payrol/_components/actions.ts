// app/payroll/_components/actions.ts
"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type ActionResult = { success: boolean; error?: string };

export async function updatePayrollStatusAction(id: string, status: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { role: true },
  });
  const role = profile?.role?.toLowerCase().trim();
  if (role !== "manager" && role !== "admin")
    return { success: false, error: "Only managers can update payroll status." };

  try {
    await prisma.payroll.update({ where: { id }, data: { status } });
    revalidatePath("/payroll");
    return { success: true };
  } catch {
    return { success: false, error: "Update failed" };
  }
}

export async function deletePayrollAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  try {
    await prisma.payroll.delete({ where: { id } });
    revalidatePath("/payroll");
    return { success: true };
  } catch {
    return { success: false, error: "Delete failed" };
  }
}