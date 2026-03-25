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

// ── ZOD SCHEMA ────────────────────────────────────────────────────────────────
const kenyanPhoneRegex = /^(\+254|0)7\d{8}$/;

const staffSchema = z.object({
  fullName:   z.string().min(1, "Full name is required"),
  tel1:       z.string().regex(kenyanPhoneRegex, "Invalid Kenyan number (07xxxxxxxx or +2547xxxxxxxx)"),
  tel2:       z.string().regex(kenyanPhoneRegex, "Invalid Kenyan number").optional().or(z.literal("")),
  mpesaNo:    z.string().regex(kenyanPhoneRegex, "M-Pesa number must be valid Kenyan tel (07xxxxxxxx or +2547xxxxxxxx)"),
  baseSalary: z.number().min(0, "Base salary cannot be negative"),
  userId:     z.string().min(1, "User selection required"),
  shopId:     z.string().min(1, "Shop selection required"),
});

// ── STAFF CREATE + UPDATE ─────────────────────────────────────────────────────
export async function saveStaffAction(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const userId = session.user.id;
  const isAdmin =
    (await prisma.profile.findUnique({
      where:  { userId },
      select: { role: true },
    }))?.role?.toLowerCase().trim() === "admin";

  const staffId = formData.get("staffId")?.toString() ?? null;

  const rawData = {
    fullName:   formData.get("fullName")?.toString().trim() ?? "",
    tel1:       formData.get("tel1")?.toString().trim() ?? "",
    tel2:       formData.get("tel2")?.toString().trim() ?? "",
    mpesaNo:    formData.get("mpesaNo")?.toString().trim() ?? "",
    baseSalary: Number(formData.get("baseSalary") || 0),
    userId:     formData.get("userId")?.toString() ?? "",
    shopId:     formData.get("shopId")?.toString() ?? "",
  };

  try {
    const validated = staffSchema.parse(rawData);

    if (staffId) {
      // ── UPDATE ──────────────────────────────────────────────────────────────
      const existing = await prisma.staff.findUnique({
        where:  { id: staffId },
        select: { shop: { select: { userId: true } } },
      });
      if (!existing) return { success: false, error: "Staff not found" };
      if (!isAdmin && existing.shop.userId !== userId) {
        return { success: false, error: "Not authorized" };
      }

      await prisma.$transaction([
        // Update staff record
        prisma.staff.update({
          where: { id: staffId },
          data:  validated,
        }),

        // Sync profile: keep role as "staff", update shopId + fullName in case they changed
        prisma.profile.upsert({
          where:  { userId: validated.userId },
          update: {
            role:     "staff",
            shopId:   validated.shopId,
            fullName: validated.fullName,
          },
          create: {
            userId:   validated.userId,
            role:     "staff",
            shopId:   validated.shopId,
            fullName: validated.fullName,
          },
        }),
      ]);
    } else {
      // ── CREATE ──────────────────────────────────────────────────────────────
      await prisma.$transaction([
        // Create staff record
        prisma.staff.create({
          data: validated,
        }),

        // Flip their profile role to "staff"
        prisma.profile.upsert({
          where:  { userId: validated.userId },
          update: {
            role:     "staff",
            shopId:   validated.shopId,
            fullName: validated.fullName,
          },
          create: {
            userId:   validated.userId,
            role:     "staff",
            shopId:   validated.shopId,
            fullName: validated.fullName,
          },
        }),
      ]);
    }

    revalidatePath("/hr/staff");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.message };
    }
    console.error(err);
    return { success: false, error: staffId ? "Update failed" : "Create failed" };
  }
}

// ── DELETE STAFF ──────────────────────────────────────────────────────────────
export async function deleteStaffAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const isAdmin =
    (await prisma.profile.findUnique({
      where:  { userId: session.user.id },
      select: { role: true },
    }))?.role?.toLowerCase().trim() === "admin";

  try {
    const existing = await prisma.staff.findUnique({
      where:  { id },
      select: { userId: true, shop: { select: { userId: true } } },
    });
    if (!existing) return { success: false, error: "Staff not found" };
    if (!isAdmin && existing.shop.userId !== session.user.id) {
      return { success: false, error: "Not your staff" };
    }

    await prisma.$transaction([
      // Delete staff record
      prisma.staff.delete({ where: { id } }),

      // Revert their profile role back to "user" and clear shopId
      prisma.profile.update({
        where:  { userId: existing.userId },
        data:   { role: "user", shopId: null },
      }),
    ]);

    revalidatePath("/hr/staff");
    return { success: true };
  } catch {
    return { success: false, error: "Delete failed (staff may have advances/salaries)" };
  }
}

// ── ONE-TIME SYNC: backfill existing staff whose profile role is still "user" ─
export async function syncExistingStaffRolesAction(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const isAdmin =
    (await prisma.profile.findUnique({
      where:  { userId: session.user.id },
      select: { role: true },
    }))?.role?.toLowerCase().trim() === "admin";

  if (!isAdmin) return { success: false, error: "Admin only" };

  try {
    // Find all staff whose profile role is NOT already "staff"
    const staffToSync = await prisma.staff.findMany({
      select: {
        userId:   true,
        shopId:   true,
        fullName: true,
        user: {
          select: {
            profile: { select: { role: true } },
          },
        },
      },
    });

    const outdated = staffToSync.filter(
      (s) => s.user.profile?.role?.toLowerCase().trim() !== "staff"
    );

    if (outdated.length === 0) return { success: true };

    // Upsert all outdated profiles in a single transaction
    await prisma.$transaction(
      outdated.map((s) =>
        prisma.profile.upsert({
          where:  { userId: s.userId },
          update: { role: "staff", shopId: s.shopId, fullName: s.fullName },
          create: { userId: s.userId, role: "staff", shopId: s.shopId, fullName: s.fullName },
        })
      )
    );

    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Sync failed" };
  }
}