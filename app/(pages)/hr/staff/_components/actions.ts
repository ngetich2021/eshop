// app/hr/staff/_components/actions.ts
"use server";

import { auth }           from "@/auth";
import prisma             from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as z             from "zod";

export type ActionResult = { success: boolean; error?: string; newId?: string };

// ── Zod schemas ───────────────────────────────────────────────────────────────

const kenyanPhone = /^(\+254|0)7\d{8}$/;

const staffSchema = z.object({
  fullName:   z.string().min(1, "Full name is required"),
  tel1:       z.string().regex(kenyanPhone, "Invalid Kenyan number (07xxxxxxxx)"),
  tel2:       z.string().regex(kenyanPhone, "Invalid Kenyan number").optional().or(z.literal("")),
  mpesaNo:    z.string().regex(kenyanPhone, "M-Pesa number must be a valid Kenyan number"),
  baseSalary: z.number().min(0, "Base salary cannot be negative"),
  userId:     z.string().min(1, "User selection required"),
  shopId:     z.string().min(1, "Shop selection required"),
});

const roleSchema = z.object({
  name:        z.string().min(1, "Designation name is required"),
  description: z.string().min(1, "Description is required"),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function canManageShop(callerId: string, shopId: string): Promise<boolean> {
  const profile = await prisma.profile.findUnique({
    where:  { userId: callerId },
    select: { role: true },
  });
  if (profile?.role?.toLowerCase().trim() === "admin") return true;
  const owned = await prisma.shop.count({ where: { id: shopId, userId: callerId } });
  return owned > 0;
}

/** Parse allowedRoutes from whatever shape comes back from the DB */
function parseRoutes(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw as string[];
  if (typeof raw === "string") {
    try { return JSON.parse(raw) as string[]; } catch { return []; }
  }
  return [];
}

// ── SAVE STAFF ────────────────────────────────────────────────────────────────

export async function saveStaffAction(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const staffId = formData.get("staffId")?.toString() ?? null;
    const rawData = {
      fullName:   formData.get("fullName")?.toString().trim()  ?? "",
      tel1:       formData.get("tel1")?.toString().trim()      ?? "",
      tel2:       formData.get("tel2")?.toString().trim()      ?? "",
      mpesaNo:    formData.get("mpesaNo")?.toString().trim()   ?? "",
      baseSalary: Number(formData.get("baseSalary") || 0),
      userId:     formData.get("userId")?.toString()           ?? "",
      shopId:     formData.get("shopId")?.toString()           ?? "",
    };

    const validated = staffSchema.parse(rawData);
    if (!(await canManageShop(session.user.id, validated.shopId)))
      return { success: false, error: "Not authorized for this shop" };

    if (staffId) {
      const existing = await prisma.staff.findUnique({
        where:  { id: staffId },
        select: { shopId: true },
      });
      if (!existing) return { success: false, error: "Staff not found" };
      await prisma.$transaction([
        prisma.staff.update({ where: { id: staffId }, data: validated }),
        prisma.profile.upsert({
          where:  { userId: validated.userId },
          update: { shopId: validated.shopId, fullName: validated.fullName },
          create: { userId: validated.userId, role: "staff", shopId: validated.shopId, fullName: validated.fullName },
        }),
      ]);
    } else {
      await prisma.$transaction([
        prisma.staff.create({ data: validated }),
        prisma.profile.upsert({
          where:  { userId: validated.userId },
          update: { role: "staff", shopId: validated.shopId, fullName: validated.fullName },
          create: { userId: validated.userId, role: "staff", shopId: validated.shopId, fullName: validated.fullName },
        }),
      ]);
    }

    revalidatePath("/hr/staff");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError)
      return { success: false, error: err.issues[0]?.message ?? "Validation failed" };
    console.error(err);
    return { success: false, error: "An unexpected error occurred" };
  }
}

// ── DELETE STAFF ──────────────────────────────────────────────────────────────

export async function deleteStaffAction(id: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const existing = await prisma.staff.findUnique({
      where:  { id },
      select: { userId: true, shopId: true },
    });
    if (!existing) return { success: false, error: "Staff not found" };
    if (!(await canManageShop(session.user.id, existing.shopId)))
      return { success: false, error: "Not authorized" };

    await prisma.$transaction([
      prisma.staff.delete({ where: { id } }),
      prisma.profile.update({
        where: { userId: existing.userId },
        data:  { role: "user", shopId: null, designation: null, allowedRoutes: [] },
      }),
    ]);

    revalidatePath("/hr/staff");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Delete failed (staff may have linked records)" };
  }
}

// ── ASSIGN DESIGNATION ────────────────────────────────────────────────────────
// Looks up the Role record, copies its allowedRoutes to the staff's Profile.
// Guard: staff member must already have a shopId assigned.

export async function assignDesignationAction(args: {
  staffUserId: string;
  designation: string;
  shopId:      string;
}): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const { staffUserId, designation, shopId } = args;
    if (!staffUserId || !designation || !shopId)
      return { success: false, error: "Missing required fields" };

    if (!(await canManageShop(session.user.id, shopId)))
      return { success: false, error: "Not authorized" };

    // Guard: target staff must have a shop assigned
    const targetProfile = await prisma.profile.findUnique({
      where:  { userId: staffUserId },
      select: { shopId: true },
    });
    if (!targetProfile?.shopId)
      return { success: false, error: "Cannot assign a designation to a staff member with no shop assigned. Assign a shop first." };

    const roleRecord = await prisma.role.findFirst({
      where: { name: { equals: designation.toLowerCase().trim(), mode: "insensitive" } },
    });
    if (!roleRecord)
      return { success: false, error: "Designation not found in database" };

    const routes = parseRoutes((roleRecord as { allowedRoutes?: unknown }).allowedRoutes);

    await prisma.profile.update({
      where: { userId: staffUserId },
      data:  {
        designation:   designation.toLowerCase().trim(),
        allowedRoutes: routes,  // plain string[] — Prisma String[] field
      },
    });

    revalidatePath("/hr/staff");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Failed to assign designation" };
  }
}

// ── SAVE ALLOWED ROUTES (manual section override) ─────────────────────────────

export async function saveAllowedRoutesAction(args: {
  staffUserId:   string;
  allowedRoutes: string[];
  shopId:        string;
}): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (!(await canManageShop(session.user.id, args.shopId)))
      return { success: false, error: "Not authorized" };

    // Guard: staff must have a shop
    const targetProfile = await prisma.profile.findUnique({
      where:  { userId: args.staffUserId },
      select: { shopId: true },
    });
    if (!targetProfile?.shopId)
      return { success: false, error: "Cannot set section access for a staff member with no shop assigned." };

    await prisma.profile.update({
      where: { userId: args.staffUserId },
      data:  { allowedRoutes: args.allowedRoutes },
    });

    revalidatePath("/hr/staff");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Failed to save section access" };
  }
}

// ── REMOVE DESIGNATION ────────────────────────────────────────────────────────

export async function removeDesignationAction(args: {
  staffUserId: string;
  shopId:      string;
}): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (!(await canManageShop(session.user.id, args.shopId)))
      return { success: false, error: "Not authorized" };

    await prisma.profile.update({
      where: { userId: args.staffUserId },
      data:  { designation: null, allowedRoutes: [] },
    });

    revalidatePath("/hr/staff");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Failed to remove designation" };
  }
}

// ── ASSIGN STAFF ROLE TIER ────────────────────────────────────────────────────

export async function assignStaffRoleAction(args: {
  staffUserId: string;
  roleName:    string;
  shopId:      string;
}): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const normalised  = args.roleName.toLowerCase().trim();
    const VALID_TIERS = ["user", "staff", "admin"];
    if (!VALID_TIERS.includes(normalised))
      return { success: false, error: `"${args.roleName}" is not a valid role tier` };
    if (!(await canManageShop(session.user.id, args.shopId)))
      return { success: false, error: "Not authorized" };

    await prisma.profile.update({
      where: { userId: args.staffUserId },
      data:  { role: normalised },
    });

    revalidatePath("/hr/staff");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Failed to assign role" };
  }
}

// ── SAVE ROLE / DESIGNATION DEFINITION ────────────────────────────────────────
// On EDIT: cascades new allowedRoutes to every profile currently holding
//          this designation — so live sessions pick it up on next request.
// Role.allowedRoutes is String? (JSON string) in the Prisma schema.
// Profile.allowedRoutes is String[] (native Postgres array).

export async function saveRoleAction(data: {
  roleId?:       string;
  name:          string;
  description:   string;
  shopId:        string;
  allowedRoutes: string[];   // section prefixes e.g. ["/sales","/inventory"]
}): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const RESERVED = ["user", "staff", "admin"];
    const normName = data.name.toLowerCase().trim();
    if (RESERVED.includes(normName))
      return { success: false, error: `"${data.name}" is a reserved role tier name` };

    if (!(await canManageShop(session.user.id, data.shopId)))
      return { success: false, error: "Not authorized" };

    const validated = roleSchema.parse({ name: normName, description: data.description });

    // Role model stores allowedRoutes as a JSON string (String? field)
    const rolePayload = {
      ...validated,
      allowedRoutes: JSON.stringify(data.allowedRoutes),
    };

    if (data.roleId) {
      // ── EDIT ──────────────────────────────────────────────────────────────
      // Find the OLD name in case the designation was renamed
      const existing = await prisma.role.findUnique({
        where:  { id: data.roleId },
        select: { name: true },
      });
      const oldName = existing?.name ?? normName;

      await prisma.role.update({
        where: { id: data.roleId },
        data:  rolePayload,
      });

      // Cascade: update every profile that holds this designation
      // Match on BOTH old name (in case of rename) and new name
      const namesToMatch = Array.from(new Set([oldName, normName]));
      await prisma.profile.updateMany({
        where: { designation: { in: namesToMatch } },
        data:  {
          designation:   normName,           // update name if renamed
          allowedRoutes: data.allowedRoutes, // push new routes
        },
      });
    } else {
      // ── CREATE ─────────────────────────────────────────────────────────────
      const exists = await prisma.role.findFirst({
        where: { name: { equals: normName, mode: "insensitive" } },
      });
      if (exists)
        return { success: false, error: `Designation "${normName}" already exists` };
      await prisma.role.create({ data: rolePayload });
    }

    revalidatePath("/hr/staff");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError)
      return { success: false, error: err.issues[0]?.message ?? "Validation failed" };
    console.error(err);
    return { success: false, error: "Failed to save designation" };
  }
}

// ── DELETE ROLE ───────────────────────────────────────────────────────────────

export async function deleteRoleAction(args: {
  roleId: string;
  shopId: string;
}): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    if (!(await canManageShop(session.user.id, args.shopId)))
      return { success: false, error: "Not authorized" };

    const role = await prisma.role.findUnique({
      where:  { id: args.roleId },
      select: { name: true },
    });
    if (!role) return { success: false, error: "Designation not found" };

    await prisma.$transaction([
      prisma.profile.updateMany({
        where: { designation: role.name },
        data:  { designation: null, allowedRoutes: [] },
      }),
      prisma.role.delete({ where: { id: args.roleId } }),
    ]);

    revalidatePath("/hr/staff");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false, error: "Failed to delete designation" };
  }
}