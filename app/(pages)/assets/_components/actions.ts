// app/assets/actions.ts
"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as z from "zod";
import crypto from "crypto";

export type ActionResult = { success: boolean; error?: string };

const assetSchema = z.object({
  itemName: z.string().min(1, "Item name required"),
  cost: z.number().min(0),
  shopId: z.string().min(1, "Shop required"),
});

/**
 * Upload an image to Cloudinary using a SIGNED upload.
 * Uses CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET from .env
 * No upload preset needed — the signature covers the upload params.
 */
export async function uploadToCloudinaryAction(
  formData: FormData
): Promise<{ success: boolean; url?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const file = formData.get("file") as File | null;
  if (!file) return { success: false, error: "No file provided" };

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return {
      success: false,
      error: "Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in .env",
    };
  }

  try {
    // Build signed upload params
    const timestamp = Math.round(Date.now() / 1000);
    const folder = "assets";

    // Params to sign — must be sorted alphabetically
    const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto
      .createHash("sha256")
      .update(paramsToSign + apiSecret)
      .digest("hex");

    const uploadData = new FormData();
    uploadData.append("file", file);
    uploadData.append("api_key", apiKey);
    uploadData.append("timestamp", String(timestamp));
    uploadData.append("signature", signature);
    uploadData.append("folder", folder);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: "POST", body: uploadData }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return { success: false, error: (err as { error?: { message?: string } }).error?.message ?? "Upload failed" };
    }

    const data = await res.json() as { secure_url: string };
    return { success: true, url: data.secure_url };
  } catch (err) {
    console.error("Cloudinary upload error:", err);
    return { success: false, error: "Upload failed" };
  }
}

export async function saveAssetAction(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const assetId = formData.get("assetId")?.toString() ?? null;
  const raw = {
    itemName: formData.get("itemName")?.toString() ?? "",
    cost: Number(formData.get("cost") || 0),
    shopId: formData.get("shopId")?.toString() ?? "",
  };
  const imageUrl = formData.get("imageUrl")?.toString().trim() || null;

  try {
    const validated = assetSchema.parse(raw);
    const data = { ...validated, imageUrl };

    if (assetId) {
      await prisma.asset.update({ where: { id: assetId }, data });
    } else {
      await prisma.asset.create({ data });
    }
    revalidatePath("/assets");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.message };
    console.error(err);
    return { success: false, error: assetId ? "Update failed" : "Create failed" };
  }
}

export async function deleteAssetAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  try {
    await prisma.asset.delete({ where: { id } });
    revalidatePath("/assets");
    return { success: true };
  } catch {
    return { success: false, error: "Delete failed" };
  }
}