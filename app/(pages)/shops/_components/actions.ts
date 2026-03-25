// app/shops/actions.ts
"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function saveShopAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized" };

  const userId = session.user.id;

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { role: true },
  });

  const isAdmin = ["admin"].includes((profile?.role || "").toLowerCase().trim());

  const shopId = formData.get("shopId")?.toString() || null;
  const name = formData.get("name")?.toString().trim() || "";
  const tel = formData.get("tel")?.toString().trim() || "";
  const location = formData.get("location")?.toString().trim() || "";

  if (!name || !tel || !location) {
    return { error: "Name, telephone and location are required." };
  }

  try {
    if (shopId) {
      const existing = await prisma.shop.findUnique({
        where: { id: shopId },
        select: { userId: true },
      });
      if (!existing) return { error: "Shop not found" };
      if (!isAdmin && existing.userId !== userId) {
        return { error: "You can only edit your own shop." };
      }

      await prisma.shop.update({ where: { id: shopId }, data: { name, tel, location } });
    } else {
      await prisma.shop.create({ data: { name, tel, location, userId } });
    }

    revalidatePath("/shops");
    return { success: true };
  } catch (error) {
    console.error("Save shop error:", error);
    return { error: shopId ? "Failed to update shop." : "Failed to add shop." };
  }
}

export async function deleteShopAction(shopId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const userId = session.user.id;

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { role: true },
  });

  const isAdmin = ["admin"].includes((profile?.role || "").toLowerCase().trim());

  const shop = await prisma.shop.findUnique({
    where: { id: shopId },
    select: { userId: true },
  });

  if (!shop) throw new Error("Shop not found");
  if (!isAdmin && shop.userId !== userId) {
    throw new Error("You can only delete your own shop.");
  }

  await prisma.shop.delete({ where: { id: shopId } });
  revalidatePath("/shops");
}