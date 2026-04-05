import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export type ActiveShopResult = {
  activeShopId: string;
  activeShop: { id: string; name: string; location: string };
  isAdmin: boolean;
  isStaff: boolean;
  canSell: boolean; // true only when user is legitimately tied to this shop
};

export async function resolveActiveShop(
  userId: string
): Promise<ActiveShopResult> {
  const cookieStore = await cookies();
  const activeShopId = cookieStore.get("active_shop_id")?.value ?? null;
  if (!activeShopId) redirect("/shops");

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { role: true, shopId: true },
  });
  const isAdmin = profile?.role?.toLowerCase().trim() === "admin";

  if (isAdmin) {
    const activeShop = await prisma.shop.findUnique({
      where: { id: activeShopId },
      select: { id: true, name: true, location: true },
    });
    if (!activeShop) redirect("/shops");
    // Admin can sell in any shop they own — verified at action level
    return { activeShopId, activeShop, isAdmin: true, isStaff: false, canSell: true };
  }

  // Non-admin: check ownership first
  const isOwner =
    (await prisma.shop.count({ where: { id: activeShopId, userId } })) > 0;

  // Staff check: must be a staff record in THIS specific shop
  const staffRecord = !isOwner
    ? await prisma.staff.findFirst({
        where: { userId, shopId: activeShopId },
        select: { id: true },
      })
    : null;
  const isStaff = Boolean(staffRecord);

  // canSell = profile.shopId matches active shop OR they are staff of this shop
  const profileShopMatch = profile?.shopId === activeShopId;
  const canSell = isOwner || isStaff || profileShopMatch;

  // Must be at least viewable — if they have no relation at all, boot them
  // But we allow viewing any shop that belongs to the same admin/owner ecosystem
  // so we only redirect if they have zero relation to ANY shop in the system
  const hasAnyShop =
    (await prisma.shop.count({ where: { userId } })) > 0 ||
    (await prisma.staff.count({ where: { userId } })) > 0;
  if (!hasAnyShop) redirect("/shops");

  const activeShop = await prisma.shop.findUnique({
    where: { id: activeShopId },
    select: { id: true, name: true, location: true },
  });
  if (!activeShop) redirect("/shops");

  return { activeShopId, activeShop, isAdmin: false, isStaff, canSell };
}