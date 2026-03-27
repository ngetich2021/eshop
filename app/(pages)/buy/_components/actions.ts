"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as z from "zod";

export type ActionResult = { success: boolean; error?: string };

const buySchema = z.object({
  supplierId: z.string().min(1, "Supplier required"),
  itemsJson: z.string().min(1, "Items required"),
  totalAmount: z.number().min(1, "Amount required"),
  transportCost: z.number().default(0),
  status: z.string().default("pending"),
  shopId: z.string().min(1, "Shop required"),
});

type BuyItem = { name: string; amount: number };

// ── CREATE SUPPLIER (Updated for new Schema) ────────────────────────────────
const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name required"),
  contact1: z.string().min(1, "Primary contact required"),
  contact2: z.string().optional(),
  goodsType: z.string().optional(),
  shopId: z.string().min(1, "Shop required"),
});

export async function createSupplierAction(
  formData: FormData
): Promise<{ success: boolean; supplierId?: string; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const raw = {
    name: formData.get("name")?.toString() ?? "",
    contact1: formData.get("contact1")?.toString() ?? "",
    contact2: formData.get("contact2")?.toString() || undefined,
    goodsType: formData.get("goodsType")?.toString() || undefined,
    shopId: formData.get("shopId")?.toString() ?? "",
  };

  try {
    const validated = supplierSchema.parse(raw);
    const supplier = await prisma.supplier.create({
      data: {
        name: validated.name,
        contact1: validated.contact1,
        contact2: validated.contact2 ?? null,
        goodsType: validated.goodsType ?? null,
        shopId: validated.shopId,
      },
    });
    revalidatePath("/buy");
    return { success: true, supplierId: supplier.id };
  } catch (err) {
    if (err instanceof z.ZodError)
      return { success: false, error: err.issues[0]?.message ?? "Validation failed" };
    console.error(err);
    return { success: false, error: "Failed to create supplier" };
  }
}

export async function saveBuyAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const userId = session.user.id;
  const authorizeId = userId;

  const buyId = formData.get("buyId")?.toString() ?? null;
  const raw = {
    supplierId: formData.get("supplierId")?.toString() ?? "",
    itemsJson: formData.get("itemsJson")?.toString() ?? "[]",
    totalAmount: Number(formData.get("totalAmount") || 0),
    transportCost: Number(formData.get("transportCost") || 0),
    status: formData.get("status")?.toString() ?? "pending",
    shopId: formData.get("shopId")?.toString() ?? "",
  };

  try {
    const validated = buySchema.parse(raw);

    let items: BuyItem[] = [];
    try { items = JSON.parse(validated.itemsJson); } catch { items = []; }
    const itemNames = items.map((i) => i.name).filter(Boolean).join(", ") || "goods";

    if (buyId) {
      await prisma.buy.update({ where: { id: buyId }, data: validated });
    } else {
      await prisma.$transaction(async (tx) => {
        await tx.buy.create({ data: { ...validated, authorizeId } });

        await tx.expense.create({
          data: {
            description: `Purchase of goods (${itemNames})`,
            amount: validated.totalAmount,
            category: "purchases",
            paidById: authorizeId,
            shopId: validated.shopId,
          },
        });

        if (validated.transportCost > 0) {
          await tx.expense.create({
            data: {
              description: `Shipment / transport for (${itemNames})`,
              amount: validated.transportCost,
              category: "transport",
              paidById: authorizeId,
              shopId: validated.shopId,
            },
          });
        }

        const totalDeduction = validated.totalAmount + validated.transportCost;
        const wallet = await tx.wallet.findUnique({
          where: { shopId: validated.shopId },
          select: { id: true, balance: true },
        });

        if (wallet) {
          await tx.wallet.update({
            where: { shopId: validated.shopId },
            data: { balance: { decrement: totalDeduction } },
          });
        } else {
          await tx.wallet.create({
            data: { shopId: validated.shopId, balance: -totalDeduction },
          });
        }

        await tx.transaction.create({
          data: {
            name: "purchase",
            amount: totalDeduction,
            sourceOfMoney: "wallet",
            authorizeId,
            shopId: validated.shopId,
          },
        });
      });
    }

    revalidatePath("/buy");
    revalidatePath("/expenses");
    revalidatePath("/wallet");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.issues[0]?.message ?? "Validation failed" };
    console.error(err);
    return { success: false, error: buyId ? "Update failed" : "Create failed" };
  }
}

export async function deleteBuyAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  try {
    await prisma.buy.delete({ where: { id } });
    revalidatePath("/buy");
    return { success: true };
  } catch {
    return { success: false, error: "Delete failed" };
  }
}