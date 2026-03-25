// app/wallet/_components/WalletView.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Loader2, ArrowDownCircle, ArrowUpCircle, ArrowRightLeft } from "lucide-react";
import { walletTransactionAction } from "./actions";

type ActionResult = { success: boolean; error?: string };
type Wallet = { id: string; balance: number; shopId: string; shopName: string };
type Transaction = { id: string; type: string; amount: number; source: string; shop: string; shopId: string; date: string };
type ShopOption = { id: string; name: string };

type Props = {
  stats: { totalBalance: number; totalDeposits: number; totalWithdrawn: number };
  wallets: Wallet[];
  transactions: Transaction[];
  shops: ShopOption[];
};

export default function WalletView({ stats, wallets, transactions, shops }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw" | "transfer">("deposit");
  const [selectedShopId, setSelectedShopId] = useState(shops[0]?.id ?? "");

  const selectedWallet = wallets.find(w => w.shopId === selectedShopId);

  const [state, submitAction, isPending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      formData.set("name", activeTab);
      const res = await walletTransactionAction(prev, formData);
      if (res.success) router.refresh();
      return res;
    },
    { success: false }
  );

  return (
    <div className="min-h-screen bg-gray-50/80 px-4 py-6 md:px-6">
      <div className="mx-auto max-w-screen-2xl space-y-6">
        {/* BALANCE CARDS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-5 shadow-sm text-center">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Balance</div>
            <div className="text-3xl font-bold text-gray-900">KSh {stats.totalBalance.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm text-center">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Sales / Deposits</div>
            <div className="text-3xl font-bold text-green-700">KSh {stats.totalDeposits.toLocaleString()}</div>
          </div>
          <div className="rounded-xl border bg-white p-5 shadow-sm text-center">
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-1">Withdrawn / Restock</div>
            <div className="text-3xl font-bold text-red-600">KSh {stats.totalWithdrawn.toLocaleString()}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* TRANSACTION FORM */}
          <div className="rounded-xl border bg-white shadow-sm p-6 space-y-5">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Shop:</label>
              <select value={selectedShopId} onChange={(e) => setSelectedShopId(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm">
                {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {selectedWallet && (
              <div className="bg-green-50 rounded-xl px-4 py-3 text-sm">
                <span className="text-gray-500">Available Balance: </span>
                <span className="font-bold text-green-700">KSh {selectedWallet.balance.toLocaleString()}</span>
              </div>
            )}

            {/* TABS */}
            <div className="flex gap-2">
              {(["deposit","withdraw","transfer"] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${activeTab === tab ? "bg-green-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                  {tab}
                </button>
              ))}
            </div>

            {state?.error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl text-center text-sm font-medium">{state.error}</div>}

            <form action={submitAction} className="space-y-4">
              <input type="hidden" name="shopId" value={selectedShopId} />
              <input type="hidden" name="authorizeId" value="system" />

              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-700">Amount (KSh):</label>
                <input name="amount" type="number" required placeholder="0" className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm" />
              </div>
              <div>
                <label className="block mb-1.5 text-sm font-medium text-gray-700">Source / Reason:</label>
                <input name="sourceOfMoney" required placeholder={activeTab === "deposit" ? "e.g. Sales" : activeTab === "transfer" ? "e.g. Shop 102" : "e.g. Restock"} className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm" />
              </div>

              <button type="submit" disabled={isPending} className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-3 font-semibold rounded-xl flex items-center justify-center gap-2">
                {isPending ? <Loader2 size={20} className="animate-spin" /> : activeTab === "deposit" ? <><ArrowDownCircle size={18} /> Deposit</> : activeTab === "withdraw" ? <><ArrowUpCircle size={18} /> Withdraw</> : <><ArrowRightLeft size={18} /> Transfer</>}
              </button>
            </form>
          </div>

          {/* TRANSACTIONS LIST */}
          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b font-semibold text-gray-700">Recent Transactions</div>
            <div className="overflow-y-auto max-h-[400px]">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {["S/NO","type","amount","source","shop","date"].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map((t, i) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{i + 1}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${t.type === "deposit" ? "bg-green-100 text-green-700" : t.type === "withdraw" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                          {t.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium">KSh {t.amount.toLocaleString()}</td>
                      <td className="px-4 py-3">{t.source}</td>
                      <td className="px-4 py-3">{t.shop}</td>
                      <td className="px-4 py-3">{t.date}</td>
                    </tr>
                  ))}
                  {transactions.length === 0 && <tr><td colSpan={6} className="py-16 text-center text-gray-500">No transactions yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}