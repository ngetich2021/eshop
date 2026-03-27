import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
 
export type ActiveShopResult = {
  activeShopId: string;
  activeShop: { id: string; name: string; location: string };
  isAdmin: boolean;
  isStaff: boolean;
};
 
export async function resolveActiveShop(
  userId: string
): Promise<ActiveShopResult> {
  // 1. Cookie is the only source — no fallback, no guessing
  const cookieStore = await cookies();
  const activeShopId = cookieStore.get("active_shop_id")?.value ?? null;
  if (!activeShopId) redirect("/shops");
 
  // 2. Determine role
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { role: true },
  });
  const isAdmin = profile?.role?.toLowerCase().trim() === "admin";
 
  if (isAdmin) {
    // Admin: can view any shop but must have selected it via /shops
    const activeShop = await prisma.shop.findUnique({
      where: { id: activeShopId },
      select: { id: true, name: true, location: true },
    });
    if (!activeShop) redirect("/shops");
    return { activeShopId, activeShop, isAdmin: true, isStaff: false };
  }
 
  // 3. Non-admin: check if owner or staff of this shop
  const isOwner =
    (await prisma.shop.count({ where: { id: activeShopId, userId } })) > 0;
 
  const isStaff =
    !isOwner &&
    (await prisma.staff.count({ where: { userId, shopId: activeShopId } })) > 0;
 
  if (!isOwner && !isStaff) redirect("/shops");
 
  const activeShop = await prisma.shop.findUnique({
    where: { id: activeShopId },
    select: { id: true, name: true, location: true },
  });
  if (!activeShop) redirect("/shops");
 
  return { activeShopId, activeShop, isAdmin: false, isStaff };
}