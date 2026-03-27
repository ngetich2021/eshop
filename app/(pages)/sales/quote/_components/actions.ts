// app/sale/quote/_components/actions.ts — convertQuoteToSaleAction updated with credit support
"use server";

import { auth } from "@/auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import * as z from "zod";

export type ActionResult = { success: boolean; error?: string };

// ── SELECT SHOP ───────────────────────────────────────────────────────────────
export async function selectQuoteShopAction(shopId: string) {
  const cookieStore = await cookies();
  cookieStore.set("active_shop_id", shopId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect("/sale/quote");
}

// ── SAVE QUOTE ────────────────────────────────────────────────────────────────
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
  downPayment: z.number().min(0).default(0),
  dueDate: z.string().optional(),
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
    return {
      success: false,
      error: "Your account is not linked to a staff record. Please contact your administrator.",
    };

  const isAdmin = profile?.role?.toLowerCase().trim() === "admin";
  const submittedShopId = formData.get("shopId")?.toString() ?? "";

  let resolvedShopId: string;

  if (isAdmin) {
    if (!submittedShopId)
      return { success: false, error: "No shop selected. Please select a shop first." };
    const shopExists = await prisma.shop.findUnique({ where: { id: submittedShopId }, select: { id: true } });
    if (!shopExists) return { success: false, error: "Selected shop not found." };
    resolvedShopId = submittedShopId;
  } else {
    resolvedShopId = profile?.shopId ?? staffRecord.shopId ?? "";
    if (!resolvedShopId)
      return { success: false, error: "Shop not assigned. Please contact administrator." };
    const shopBelongsToUser = await prisma.shop.findFirst({ where: { id: resolvedShopId, userId }, select: { id: true } });
    if (!shopBelongsToUser)
      return { success: false, error: "You do not have access to this shop." };
  }

  const quoteId = formData.get("quoteId")?.toString() ?? null;

  const itemsRaw = formData.get("itemsJson")?.toString();
  let items: z.infer<typeof quoteItemSchema>[] = [];
  try { items = JSON.parse(itemsRaw ?? "[]"); } catch {
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

    for (const item of validated.items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { quantity: true, productName: true, shopId: true },
      });
      if (!product) return { success: false, error: "Product not found" };
      if (product.shopId !== resolvedShopId)
        return { success: false, error: "Product does not belong to the selected shop" };
      if (product.quantity < item.quantity)
        return {
          success: false,
          error: `Insufficient stock for "${product.productName}" (available: ${product.quantity})`,
        };
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
    if (err instanceof z.ZodError)
      return { success: false, error: err.issues[0]?.message ?? "Validation failed" };
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
  paymentMethod: string,
  downPayment = 0,
  dueDate?: string
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  try {
    convertSchema.parse({ paymentMethod, downPayment, dueDate });
  } catch {
    return { success: false, error: "Payment method required to convert quote to sale." };
  }

  const isCredit = paymentMethod === "credit";

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

    await prisma.$transaction(async (tx) => {
      // Validate + decrement stock
      for (const item of quote.quoteItems) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { quantity: true, productName: true },
        });
        if (!product) throw new Error("Product not found");
        if (product.quantity < item.quantity)
          throw new Error(
            `Insufficient stock for "${product.productName}" (available: ${product.quantity})`
          );
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      // Create sale
      const newSale = await tx.sale.create({
        data: {
          soldById: quote.soldById,
          itemsJson: quote.itemsJson,
          totalAmount: quote.amount,
          paymentMethod,
          shopId: quote.shopId,
          saleItems: {
            create: quote.quoteItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              discount: item.discount,
            })),
          },
        },
      });

      if (isCredit) {
        const effectiveDownPayment = downPayment ?? 0;
        // Down payment record
        if (effectiveDownPayment > 0) {
          await tx.payment.create({
            data: {
              amount: effectiveDownPayment,
              method: "credit_downpayment",
              transactionCode: `DP-${newSale.id.slice(-8).toUpperCase()}`,
              shopId: quote.shopId,
            },
          });
        }
        // Credit tracking
        await tx.credit.create({
          data: {
            amount: quote.amount,
            downPayment: effectiveDownPayment,
            dueDate: dueDate ? new Date(`${dueDate}T00:00:00.000Z`) : null,
            status: effectiveDownPayment >= quote.amount ? "paid" : effectiveDownPayment > 0 ? "partial" : "pending",
            shopId: quote.shopId,
          },
        });
      } else {
        // Record full payment
        await tx.payment.create({
          data: {
            amount: quote.amount,
            method: paymentMethod,
            transactionCode: `PAY-${newSale.id.slice(-8).toUpperCase()}`,
            shopId: quote.shopId,
          },
        });
      }

      // Delete quote
      await tx.quoteItem.deleteMany({ where: { quoteId } });
      await tx.quote.delete({ where: { id: quoteId } });
    });

    revalidatePath("/sale/quote");
    revalidatePath("/sale/sold");
    revalidatePath("/credit");
    revalidatePath("/payments");
    return { success: true };
  } catch (err) {
    if (err instanceof Error) return { success: false, error: err.message };
    console.error(err);
    return { success: false, error: "Conversion failed" };
  }
}