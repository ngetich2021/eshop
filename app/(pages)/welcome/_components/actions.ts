// app/shops/_components/actions.ts
"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Called from the client (ShopPortal) when a shop is selected.
 * Server Actions are the ONLY place cookies can be written in Next.js App Router.
 * This locks the active shop for ALL subsequent pages until another shop is chosen.
 */
export async function selectShopAction(shopId: string) {
  const cookieStore = await cookies();
  cookieStore.set("active_shop_id", shopId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  redirect("/dashboard");
}