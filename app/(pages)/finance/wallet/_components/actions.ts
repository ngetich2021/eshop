// app/wallet/actions.ts
"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import * as z from "zod";

export type ActionResult = { success: boolean; error?: string };

const transactionSchema = z.object({
  name: z.enum(["deposit", "withdraw", "transfer"]),
  amount: z.number().min(1, "Amount required"),
  sourceOfMoney: z.string().min(1, "Source required"),
  authorizeId: z.string().min(1, "Authorizer required"),
  shopId: z.string().min(1, "Shop required"),
});

export async function walletTransactionAction(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.user?.id) return { success: false, error: "Unauthorized" };

  const raw = {
    name: formData.get("name")?.toString() ?? "deposit",
    amount: Number(formData.get("amount") || 0),
    sourceOfMoney: formData.get("sourceOfMoney")?.toString() ?? "",
    authorizeId: formData.get("authorizeId")?.toString() ?? session.user.id,
    shopId: formData.get("shopId")?.toString() ?? "",
  };

  try {
    const validated = transactionSchema.parse(raw);

    const wallet = await prisma.wallet.findUnique({ where: { shopId: validated.shopId } });
    if (!wallet) return { success: false, error: "Wallet not found for this shop" };

    let newBalance = wallet.balance;
    if (validated.name === "deposit") newBalance += validated.amount;
    else if (validated.name === "withdraw" || validated.name === "transfer") {
      if (wallet.balance < validated.amount) return { success: false, error: "Insufficient balance" };
      newBalance -= validated.amount;
    }

    await prisma.$transaction([
      prisma.transaction.create({ data: validated }),
      prisma.wallet.update({ where: { shopId: validated.shopId }, data: { balance: newBalance } }),
    ]);

    revalidatePath("/wallet");
    return { success: true };
  } catch (err) {
    if (err instanceof z.ZodError) return { success: false, error: err.message };
    console.error(err);
    return { success: false, error: "Transaction failed" };
  }
}