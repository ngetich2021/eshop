// app/sale/quote/_components/actions.ts
"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as z from "zod";

export type ActionResult = { success: boolean; error?: string };

const quoteItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().min(1),
  price: z.number().min(0),
  discount: z.number().default(0),
});

const quoteSchema = z.object({
  shopId: z.string().min(1, "Shop required"),
  customerName: z.string().optional(),
  customerContact: z.string().optional(),
  items: z.array(quoteItemSchema).min(1, "At least one item required"),
});

const convertSchema = z.object({
  paymentMethod: z.string().min(1, "Payment method required"),
});

export async function saveQuoteAction(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const userId = session.user.id;

  const [staffRecord, profile] = await Promise.all([
    prisma.staff.findUnique({ where: { userId }, select: { id: true, shopId: true } }),
    prisma.profile.findUnique({ where: { userId }, select: { shopId: true, role: true } }),
  ]);

  if (!staffRecord)
    return { success: false, error: "Your account is not linked to a staff record. Please contact your administrator." };

  const isAdmin = profile?.role?.toLowerCase().trim() === "admin";

  const resolvedShopId =
    profile?.shopId ??
    staffRecord.shopId ??
    (isAdmin ? formData.get("shopId")?.toString() ?? "" : "");

  if (!resolvedShopId)
    return { success: false, error: "Shop not assigned. Please contact administrator." };

  const quoteId = formData.get("quoteId")?.toString() ?? null;

  const itemsRaw = formData.get("itemsJson")?.toString();
  let items: z.infer<typeof quoteItemSchema>[] = [];
  try {
    items = JSON.parse(itemsRaw ?? "[]");
  } catch {
    return { success: false, error: "Invalid items data" };
  }

  const raw = {
    shopId: resolvedShopId,
    customerName: formData.get("customerName")?.toString() ?? "",
    customerContact: formData.get("customerContact")?.toString() ?? "",
    items,
  };

  try {
    const validated = quoteSchema.parse(raw);

    // Stock availability check (no decrement for quotes)
    for (const item of validated.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { quantity: true, productName: true },
      });
      if (!product) return { success: false, error: `Product not found` };
      if (product.quantity < item.quantity)
        return { success: false, error: `Insufficient stock for "${product.productName}" (available: ${product.quantity})` };
    }

    const totalAmount = validated.items.reduce(
      (sum, item) => sum + (item.price - item.discount) * item.quantity,
      0
    );

    const itemsJson = JSON.stringify(validated.items);

    if (quoteId) {
      await prisma.$transaction([
        prisma.quoteItem.deleteMany({ where: { quoteId } }),
        prisma.quote.update({
          where: { id: quoteId },
          data: {
            soldById: staffRecord.id,
            itemsJson,
            amount: totalAmount,
            customerName: validated.customerName ?? "",
            customerContact: validated.customerContact ?? "",
            shopId: validated.shopId,
            quoteItems: {
              create: validated.items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                discount: item.discount,
              })),
            },
          },
        }),
      ]);
    } else {
      await prisma.quote.create({
        data: {
          soldById: staffRecord.id,
          itemsJson,
          amount: totalAmount,
          customerName: validated.customerName ?? "",
          customerContact: validated.customerContact ?? "",
          shopId: validated.shopId,
          quoteItems: {
            create: validated.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              discount: item.discount,
            })),
          },
        },
      });
    }

    revalidatePath("/sale/quote");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.issues[0]?.message ?? "Validation failed" };
    console.error(err);
    return { success: false, error: quoteId ? "Update failed" : "Create failed" };
  }
}

export async function deleteQuoteAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  try {
    await prisma.$transaction([
      prisma.quoteItem.deleteMany({ where: { quoteId: id } }),
      prisma.quote.delete({ where: { id } }),
    ]);
    revalidatePath("/sale/quote");
    return { success: true };
  } catch {
    return { success: false, error: "Delete failed" };
  }
}

export async function convertQuoteToSaleAction(
  quoteId: string,
  paymentMethod: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  try {
    convertSchema.parse({ paymentMethod });
  } catch {
    return { success: false, error: "Payment method required to convert quote to sale." };
  }

  try {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: {
        quoteItems: {
          select: { productId: true, quantity: true, price: true, discount: true },
        },
      },
    });

    if (!quote) return { success: false, error: "Quote not found" };

    const items = quote.quoteItems;

    await prisma.$transaction(async (tx) => {
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { quantity: true, productName: true },
        });
        if (!product) throw new Error(`Product not found`);
        if (product.quantity < item.quantity)
          throw new Error(`Insufficient stock for "${product.productName}" (available: ${product.quantity})`);
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      await tx.sale.create({
        data: {
          soldById: quote.soldById,
          itemsJson: quote.itemsJson,
          totalAmount: quote.amount,
          paymentMethod,
          shopId: quote.shopId,
          saleItems: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              discount: item.discount,
            })),
          },
        },
      });

      await tx.quoteItem.deleteMany({ where: { quoteId } });
      await tx.quote.delete({ where: { id: quoteId } });
    });

    revalidatePath("/sale/quote");
    revalidatePath("/sale/sold");
    return { success: true };
  } catch (err) {
    if (err instanceof Error) return { success: false, error: err.message };
    console.error(err);
    return { success: false, error: "Conversion failed" };
  }
}