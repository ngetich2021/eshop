// app/sale/sold/_components/actions.ts
"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as z from "zod";

export type ActionResult = {
  success: boolean;
  error?: string;
  saleId?: string;
};

const saleItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().min(1),
  price: z.number().min(0),
  discount: z.number().default(0),
});

const saleSchema = z.object({
  paymentMethod: z.string().min(1, "Payment method required"),
  shopId: z.string().min(1, "Shop required"),
  items: z.array(saleItemSchema).min(1, "At least one item required"),
  // Credit fields (only required when paymentMethod === "credit")
  downPayment: z.number().min(0).default(0),
  dueDate: z.string().optional(),
  customerName: z.string().optional(),
  customerContact: z.string().optional(),
});

export async function createSaleAction(
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

  const resolvedShopId =
    profile?.shopId ??
    staffRecord.shopId ??
    (isAdmin ? formData.get("shopId")?.toString() ?? "" : "");

  if (!resolvedShopId)
    return { success: false, error: "Shop not assigned. Please contact administrator." };

  const itemsRaw = formData.get("itemsJson")?.toString();
  let items: z.infer<typeof saleItemSchema>[] = [];
  try {
    items = JSON.parse(itemsRaw ?? "[]");
  } catch {
    return { success: false, error: "Invalid items data" };
  }

  const raw = {
    paymentMethod: formData.get("paymentMethod")?.toString() ?? "",
    shopId: resolvedShopId,
    items,
    downPayment: Number(formData.get("downPayment") || 0),
    dueDate: formData.get("dueDate")?.toString() || undefined,
    customerName: formData.get("customerName")?.toString() || undefined,
    customerContact: formData.get("customerContact")?.toString() || undefined,
  };

  try {
    const validated = saleSchema.parse(raw);

    const totalAmount = validated.items.reduce(
      (sum, item) => sum + (item.price - item.discount) * item.quantity,
      0
    );

    const itemsJson = JSON.stringify(validated.items);
    const isCredit = validated.paymentMethod === "credit";

    const sale = await prisma.$transaction(async (tx) => {
      // Validate stock and decrement
      for (const item of validated.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { quantity: true, productName: true },
        });
        if (!product) throw new Error(`Product not found`);
        if (product.quantity < item.quantity)
          throw new Error(
            `Insufficient stock for "${product.productName}" (available: ${product.quantity})`
          );
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: { decrement: item.quantity } },
        });
      }

      // Create the sale
      const newSale = await tx.sale.create({
        data: {
          soldById: staffRecord.id,
          itemsJson,
          totalAmount,
          paymentMethod: validated.paymentMethod,
          shopId: validated.shopId,
          saleItems: {
            create: validated.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              discount: item.discount,
            })),
          },
        },
      });

      // If credit: record down payment as a Payment, create Credit record for balance
      if (isCredit) {
        const creditAmount = totalAmount - validated.downPayment;

        // Record down payment if any
        if (validated.downPayment > 0) {
          await tx.payment.create({
            data: {
              amount: validated.downPayment,
              method: "credit_downpayment",
              transactionCode: `DP-${newSale.id.slice(-8).toUpperCase()}`,
              shopId: validated.shopId,
            },
          });
        }

        // Create credit tracking record
        await tx.credit.create({
          data: {
            amount: totalAmount,
            downPayment: validated.downPayment,
            dueDate: validated.dueDate ? new Date(`${validated.dueDate}T00:00:00.000Z`) : null,
            status: validated.downPayment >= totalAmount ? "paid" : validated.downPayment > 0 ? "partial" : "pending",
            shopId: validated.shopId,
          },
        });
      } else {
        // Non-credit: record full payment
        await tx.payment.create({
          data: {
            amount: totalAmount,
            method: validated.paymentMethod,
            transactionCode: `PAY-${newSale.id.slice(-8).toUpperCase()}`,
            shopId: validated.shopId,
          },
        });
      }

      return newSale;
    });

    revalidatePath("/sale/sold");
    revalidatePath("/credit");
    revalidatePath("/payments");
    return { success: true, saleId: sale.id };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.issues[0]?.message ?? "Validation failed" };
    if (err instanceof Error) return { success: false, error: err.message };
    console.error(err);
    return { success: false, error: "Sale failed" };
  }
}

export async function deleteSaleAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };
  try {
    await prisma.$transaction([
      prisma.saleItem.deleteMany({ where: { saleId: id } }),
      prisma.sale.delete({ where: { id } }),
    ]);
    revalidatePath("/sale/sold");
    return { success: true };
  } catch {
    return { success: false, error: "Delete failed" };
  }
}