// app/salary/_components/actions.ts
"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export type ActionResult = { success: boolean; error?: string };

/**
 * Auto-generate salary records for all staff in the shop for the current month.
 * Skips staff that already have a record for this month.
 * Called from the salary page on load (server side) or as a manual trigger.
 */
export async function autoGenerateSalariesAction(shopId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const staffList = await prisma.staff.findMany({
    where: { shopId },
    select: { id: true, baseSalary: true },
  });

  if (staffList.length === 0) return { success: true }; // Nothing to generate

  // Find which staff already have a record this month
  const existing = await prisma.salary.findMany({
    where: { shopId, month },
    select: { staffId: true },
  });
  const existingIds = new Set(existing.map((e) => e.staffId));

  const toCreate = staffList.filter((s) => !existingIds.has(s.id));
  if (toCreate.length === 0) return { success: true };

  try {
    await prisma.salary.createMany({
      data: toCreate.map((s) => ({
        staffId: s.id,
        shopId,
        amount: s.baseSalary,
        month,
        status: "pending",
      })),
    });

    // FIX: Moved inside the function and corrected the path to match your structure
    revalidatePath("/finance/salary"); 
    return { success: true };
  } catch (err) {
    return { success: false, error: "Generation failed" };
  }
}

/**
 * Update a salary record's status (e.g. mark as paid).
 */
export async function updateSalaryStatusAction(
  salaryId: string,
  status: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  // Manager/admin only
  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { role: true },
  });
  const role = profile?.role?.toLowerCase().trim();
  if (role !== "manager" && role !== "admin")
    return { success: false, error: "Only managers can update salary status." };

  try {
    await prisma.salary.update({ where: { id: salaryId }, data: { status } });
    revalidatePath("/finance/salary");
    return { success: true };
  } catch {
    return { success: false, error: "Update failed" };
  }
}

export async function deleteSalaryAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  try {
    await prisma.salary.delete({ where: { id } });
    revalidatePath("/finance/salary");
    return { success: true };
  } catch {
    return { success: false, error: "Delete failed" };
  }
}