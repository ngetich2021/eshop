// app/shops/_components/actions.ts
"use server";

import { auth }          from "@/auth";
import prisma            from "@/lib/prisma";
import { cookies }       from "next/headers";
import { redirect }      from "next/navigation";

/**
 * Called when a shop card is clicked (owner) or on mount (staff auto-select).
 *
 * Does three things:
 *   1. Writes the active_shop_id cookie so page components know which shop to scope.
 *   2. Updates the profile's shopId so the middleware's "has a shop" check
 *      stays accurate across re-logins (session callback reads profile fresh).
 *   3. Redirects to /dashboard.
 */
export async function selectShopAction(shopId: string) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const userId = session.user.id;

  // Verify the shop actually belongs to this user (or they are staff of it)
  const shop = await prisma.shop.findFirst({
    where: {
      id: shopId,
      OR: [
        { userId },                        // owner
        { staffs: { some: { userId } } }, // staff member of this shop
      ],
    },
    select: { id: true },
  });

  if (!shop) redirect("/shops"); // tampered shopId — back to portal

  // Persist active shop in cookie (used by server page components)
  const cookieStore = await cookies();
  cookieStore.set("active_shop_id", shopId, {
    path:     "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge:   60 * 60 * 24 * 7, // 7 days
  });

  // Also persist in profile so middleware's shopId check is always correct
  // even when the cookie is cleared or on a new device
  await prisma.profile.update({
    where: { userId },
    data:  { shopId },
  });

  redirect("/dashboard");
}