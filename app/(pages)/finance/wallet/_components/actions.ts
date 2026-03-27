// app/wallet/actions.ts
"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { resolveActiveShop } from "@/lib/active-shop";
import { revalidatePath } from "next/cache";
import * as z from "zod";

export type ActionResult = { success: boolean; error?: string };

const transactionSchema = z.object({
  name: z.enum(["deposit", "withdraw", "transfer"]),
  amount: z.number().min(1, "Amount must be greater than 0"),
  sourceOfMoney: z.string().min(1, "Source/Reason required"),
  shopId: z.string().min(1, "Shop required"),
});

export async function walletTransactionAction(
  _: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const raw = {
    name: formData.get("name")?.toString() ?? "deposit",
    amount: Number(formData.get("amount") || 0),
    sourceOfMoney: formData.get("sourceOfMoney")?.toString() ?? "",
    shopId: formData.get("shopId")?.toString() ?? "",
  };

  try {
    // 1. Validate input
    const validated = transactionSchema.parse(raw);

    // 2. Verify user has access to this shop and get shop details
    const { activeShopId, activeShop } = await resolveActiveShop(session.user.id);
    if (activeShopId !== validated.shopId) {
      return { success: false, error: "Unauthorized: Shop access denied" };
    }

    // 3. Fetch wallet and available balance
    const wallet = await prisma.wallet.findUnique({
      where: { shopId: validated.shopId },
    });

    if (!wallet) {
      return { success: false, error: "Wallet not found for this shop" };
    }

    // Get available balance from payments (sales not yet transferred)
    const availableBalance =
      (
        await prisma.sale.aggregate({
          where: { shopId: validated.shopId },
          _sum: { totalAmount: true },
        })
      )._sum.totalAmount ?? 0;

    // 4. Validate transaction rules
    if (validated.name === "deposit") {
      // ✓ Deposit: from external source, no balance check needed
      // Source must describe where money came from (e.g., "Sales", "Cash transfer")
      if (!validated.sourceOfMoney || validated.sourceOfMoney.toLowerCase() === "payment") {
        return {
          success: false,
          error: "Deposit source must be external (e.g., Sales, Cash transfer, etc.)",
        };
      }
    } else if (validated.name === "transfer") {
      // ✓ Transfer: from available funds (payment balance) of THIS SHOP ONLY
      if (availableBalance < validated.amount) {
        return {
          success: false,
          error: `Insufficient available balance from ${activeShop.name}. Available: KSh ${availableBalance.toLocaleString()}, Attempting to transfer: KSh ${validated.amount.toLocaleString()}`,
        };
      }
      // Source should reference where it's going
      if (!validated.sourceOfMoney) {
        return { success: false, error: "Please specify where funds are being transferred to" };
      }
    } else if (validated.name === "withdraw") {
      // ✓ Withdraw: from wallet balance only
      if (wallet.balance < validated.amount) {
        return {
          success: false,
          error: `Insufficient wallet balance. Available: KSh ${wallet.balance.toLocaleString()}, Attempting to withdraw: KSh ${validated.amount.toLocaleString()}`,
        };
      }
      // Source should describe why (e.g., "Restock", "Expenses")
      if (!validated.sourceOfMoney) {
        return { success: false, error: "Please specify reason for withdrawal" };
      }
    }

    // 5. Calculate new wallet balance
    let newBalance = wallet.balance;

    if (validated.name === "deposit") {
      // Deposit: add to wallet from external source
      newBalance += validated.amount;
    } else if (validated.name === "withdraw") {
      // Withdraw: subtract from wallet
      newBalance -= validated.amount;
    } else if (validated.name === "transfer") {
      // Transfer: add to wallet from available balance
      newBalance += validated.amount;
    }

    // 6. Persist to database with proper transaction tracking
    const dbOperations = [
      // Always create the transaction record
      prisma.transaction.create({
        data: {
          name: validated.name,
          amount: validated.amount,
          sourceOfMoney: validated.sourceOfMoney,
          shopId: validated.shopId,
          authorizeId: session.user.id,
        },
      }),

      // Always update wallet balance
      prisma.wallet.update({
        where: { shopId: validated.shopId },
        data: { balance: newBalance },
      }),
    ];

    // For TRANSFER specifically: create a transfer_out record to track funds leaving the payment pool
    // This reduces the "available balance" (which comes from untransferred sales)
    if (validated.name === "transfer") {
      // Create a transfer out record - this acts as a "negative sale" to reduce available balance
      // You can use the transaction table with a special marker or create a transfer_out table
      
      // Option A: Create a negative-amount transaction with type "transfer_out"
      // This will be subtracted from available balance in the UI logic
      dbOperations.push(
        prisma.transaction.create({
          data: {
            // Mark this as a transfer out (internal tracking)
            name: "transfer_out",
            amount: validated.amount,
            sourceOfMoney: `Transfer from sales to wallet: ${validated.sourceOfMoney}`,
            shopId: validated.shopId,
            authorizeId: session.user.id,
          },
        })
      );
    }

    await prisma.$transaction(dbOperations);

    revalidatePath("/wallet");
    revalidatePath("/payments"); // Also revalidate payments page since available balance changed
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { success: false, error: err.message ?? "Validation failed" };
    }
    console.error("Transaction error:", err);
    return { success: false, error: "Transaction failed" };
  }
}