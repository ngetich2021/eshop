// app/staff/advance/actions.ts
"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as z from "zod";

export type ActionResult = { success: boolean; error?: string };

const advanceSchema = z.object({
  shopId: z.string().min(1, "Shop required"),
  amount: z.number().min(1, "Amount must be at least 1"),
  date: z.string().min(1, "Date required"),
  reason: z.string().optional(),
});

/**
 * Request or edit an advance.
 * - Any staff can request for THEMSELVES (staffId resolved from session).
 * - Managers can edit any advance (staffId from form for edit, self for add).
 * - No one can request on behalf of someone else.
 */
export async function saveAdvanceAction(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const userId = session.user.id;
  const advanceId = formData.get("advanceId")?.toString() ?? null;

  // Resolve current user's staff record
  const shopId = formData.get("shopId")?.toString() ?? "";
  const currentStaff = await prisma.staff.findFirst({
    where: { userId, shopId },
    select: { id: true, baseSalary: true },
  });

  if (!currentStaff)
    return {
      success: false,
      error: "You must be a staff member in this shop to request an advance.",
    };

  // For edits, allow manager to update any advance (staffId stays on record)
  let targetStaffId = currentStaff.id;
  if (advanceId) {
    const existing = await prisma.advance.findUnique({
      where: { id: advanceId },
      select: { staffId: true },
    });
    if (existing) targetStaffId = existing.staffId;
  }

  const raw = {
    shopId,
    amount: Number(formData.get("amount") || 0),
    date: formData.get("date")?.toString() ?? "",
    reason: formData.get("reason")?.toString().trim() || undefined,
  };

  try {
    const validated = advanceSchema.parse(raw);

    // Look up baseSalary for the target staff
    const targetStaff = await prisma.staff.findUnique({
      where: { id: targetStaffId },
      select: { baseSalary: true },
    });
    if (!targetStaff) return { success: false, error: "Staff record not found" };

    const maxAdvance = Math.floor(targetStaff.baseSalary * 0.4);
    const now = new Date(validated.date);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const existingAdvances = await prisma.advance.aggregate({
      where: {
        staffId: targetStaffId,
        shopId: validated.shopId,
        status: { in: ["requested", "approved"] },
        date: { gte: monthStart, lte: monthEnd },
        ...(advanceId ? { NOT: { id: advanceId } } : {}),
      },
      _sum: { amount: true },
    });

    const alreadyTaken = existingAdvances._sum.amount ?? 0;
    const remaining = maxAdvance - alreadyTaken;

    if (validated.amount > remaining) {
      return {
        success: false,
        error: `Advance limit exceeded. Max: KSh ${maxAdvance.toLocaleString()} (40% of salary). Already taken: KSh ${alreadyTaken.toLocaleString()}. Available: KSh ${Math.max(0, remaining).toLocaleString()}`,
      };
    }

    if (advanceId) {
      const statusUpdate = formData.get("status")?.toString();
      await prisma.advance.update({
        where: { id: advanceId },
        data: {
          staffId: targetStaffId,
          shopId: validated.shopId,
          amount: validated.amount,
          date: new Date(validated.date),
          reason: validated.reason,
          ...(statusUpdate ? { status: statusUpdate } : {}),
        },
      });
    } else {
      await prisma.advance.create({
        data: {
          staffId: targetStaffId,
          shopId: validated.shopId,
          amount: validated.amount,
          date: new Date(validated.date),
          reason: validated.reason,
          status: "requested",
        },
      });
    }

    revalidatePath("/staff/advance");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.issues[0]?.message ?? "Validation failed" };
    console.error(err);
    return { success: false, error: advanceId ? "Update failed" : "Create failed" };
  }
}

/**
 * Manager-only: approve, reject, or mark as paid.
 */
export async function approveAdvanceAction(
  id: string,
  status: "approved" | "rejected" | "paid"
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { role: true },
  });
  const role = profile?.role?.toLowerCase().trim();
  const isManager = role === "manager" || role === "admin";
  if (!isManager) return { success: false, error: "Only managers can approve or reject advances." };

  try {
    await prisma.advance.update({ where: { id }, data: { status } });
    revalidatePath("/staff/advance");
    return { success: true };
  } catch {
    return { success: false, error: "Status update failed" };
  }
}

export async function updateAdvanceStatusAction(
  id: string,
  status: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  // Only managers can update status
  const profile = await prisma.profile.findUnique({
    where: { userId: session.user.id },
    select: { role: true },
  });
  const role = profile?.role?.toLowerCase().trim();
  if (role !== "manager" && role !== "admin")
    return { success: false, error: "Only managers can update advance status." };

  try {
    await prisma.advance.update({ where: { id }, data: { status } });
    revalidatePath("/staff/advance");
    return { success: true };
  } catch {
    return { success: false, error: "Status update failed" };
  }
}

export async function deleteAdvanceAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  try {
    await prisma.advance.delete({ where: { id } });
    revalidatePath("/staff/advance");
    return { success: true };
  } catch {
    return { success: false, error: "Delete failed" };
  }
}

export async function getAvailableAdvanceAction(
  staffId: string,
  shopId: string,
  excludeId?: string
): Promise<{ maxAdvance: number; taken: number; available: number; baseSalary: number }> {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { baseSalary: true },
  });
  if (!staff) return { maxAdvance: 0, taken: 0, available: 0, baseSalary: 0 };

  const maxAdvance = Math.floor(staff.baseSalary * 0.4);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const existing = await prisma.advance.aggregate({
    where: {
      staffId,
      shopId,
      status: { in: ["requested", "approved"] },
      date: { gte: monthStart, lte: monthEnd },
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    _sum: { amount: true },
  });

  const taken = existing._sum.amount ?? 0;
  return {
    baseSalary: staff.baseSalary,
    maxAdvance,
    taken,
    available: Math.max(0, maxAdvance - taken),
  };
}