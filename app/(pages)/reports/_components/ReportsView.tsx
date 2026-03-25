"use client";

import { useState, useRef } from "react";
import {
  TrendingUp, TrendingDown, ShoppingCart, FileText, CreditCard,
  DollarSign, Users, Package, Truck, BarChart3, Building2,
  Wallet, ArrowUpDown, Star, Printer, Download,
} from "lucide-react";

type Summary = {
  sales: { count: number; amount: number };
  quotes: { count: number; amount: number };
  payments: { count: number; amount: number };
  expenses: { count: number; amount: number };
  credits: { count: number; amount: number; paid: number };
  advances: { count: number; amount: number };
  salaries: { count: number; amount: number };
  payrolls: { count: number; salary: number; payable: number };
  buys: { count: number; amount: number; fare: number };
  adjustments: { count: number };
  assets: { count: number; amount: number };
  suppliers: number;
  staff: number;
  products: number;
  margins: { count: number; amount: number };
  transactions: { count: number; amount: number };
};

type MonthlyData = { month: string; label: string; sales: number; expenses: number; profit: number };
type ShopOption = { id: string; name: string };

type Props = { summary: Summary; monthlyData: MonthlyData[]; shops: ShopOption[] };

type ReportType = "sales" | "payments" | "adjustments" | "stock" | "expenses" | "purchases" | "salaries" | "advance" | "overview";

export default function ReportsView({ summary, monthlyData, shops }: Props) {
  const [activeReport, setActiveReport] = useState<ReportType>("overview");
  const [selectedShop, setSelectedShop] = useState("all");
  const printRef = useRef<HTMLDivElement>(null);

  const profit = summary.sales.amount - summary.expenses.amount;
  const creditDue = summary.credits.amount - summary.credits.paid;
  const maxSales = Math.max(...monthlyData.map((m) => m.sales), 1);

  const handlePrint = () => {
    const content = printRef.current?.innerHTML;
    if (!content) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head><title>Report — ${activeReport}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Georgia', serif; padding: 32px; color: #111; }
        h1 { font-size: 24px; margin-bottom: 4px; }
        h2 { font-size: 18px; margin: 24px 0 12px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
        .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; }
        .card-label { font-size: 11px; text-transform: uppercase; color: #6b7280; letter-spacing: 0.05em; }
        .card-value { font-size: 22px; font-weight: bold; margin-top: 4px; }
        .card-sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; padding: 8px 12px; background: #f9fafb; border-bottom: 2px solid #e5e7eb; font-size: 11px; text-transform: uppercase; }
        td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; }
        .highlight { color: #059669; font-weight: bold; }
        .danger { color: #dc2626; font-weight: bold; }
        .meta { font-size: 12px; color: #9ca3af; margin-bottom: 24px; }
      </style></head><body>${content}</body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  };

  const reportTypes: { key: ReportType; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <BarChart3 size={16} /> },
    { key: "sales", label: "Sales", icon: <ShoppingCart size={16} /> },
    { key: "payments", label: "Payments", icon: <CreditCard size={16} /> },
    { key: "expenses", label: "Expenses", icon: <TrendingDown size={16} /> },
    { key: "purchases", label: "Purchases", icon: <Truck size={16} /> },
    { key: "salaries", label: "Salaries", icon: <DollarSign size={16} /> },
    { key: "advance", label: "Advances", icon: <Wallet size={16} /> },
    { key: "adjustments", label: "Adjustments", icon: <ArrowUpDown size={16} /> },
    { key: "stock", label: "Stock", icon: <Package size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* TOP BAR */}
      <div className="border-b border-gray-800 bg-gray-900 px-4 py-4 md:px-6">
        <div className="mx-auto max-w-screen-2xl flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
              <BarChart3 size={26} className="text-emerald-400" />
              Reports & Analytics
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Compiled business intelligence across all modules</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedShop}
              onChange={(e) => setSelectedShop(e.target.value)}
              className="border border-gray-700 bg-gray-800 text-white rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-500"
            >
              <option value="all">All Shops</option>
              {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
            >
              <Printer size={15} /> Print
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-screen-2xl px-4 py-6 md:px-6 space-y-6">

        {/* REPORT TYPE TABS */}
        <div className="flex flex-wrap gap-2">
          {reportTypes.map((r) => (
            <button
              key={r.key}
              onClick={() => setActiveReport(r.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeReport === r.key
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/40"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
              }`}
            >
              {r.icon} {r.label}
            </button>
          ))}
        </div>

        {/* PRINT CONTENT */}
        <div ref={printRef}>

          {/* ─── OVERVIEW ─── */}
          {activeReport === "overview" && (
            <div className="space-y-6">
              <PrintHeader title="Business Overview Report" />

              {/* KEY METRICS */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <DarkStatCard
                  icon={<TrendingUp size={22} className="text-emerald-400" />}
                  label="Total Revenue" value={`KSh ${summary.sales.amount.toLocaleString()}`}
                  sub={`${summary.sales.count} sales`} color="emerald" />
                <DarkStatCard
                  icon={<TrendingDown size={22} className="text-rose-400" />}
                  label="Total Expenses" value={`KSh ${summary.expenses.amount.toLocaleString()}`}
                  sub={`${summary.expenses.count} records`} color="rose" />
                <DarkStatCard
                  icon={<Star size={22} className={profit >= 0 ? "text-emerald-400" : "text-rose-400"} />}
                  label="Net Profit" value={`KSh ${profit.toLocaleString()}`}
                  sub={profit >= 0 ? "Positive" : "Negative"} color={profit >= 0 ? "emerald" : "rose"} />
                <DarkStatCard
                  icon={<Building2 size={22} className="text-sky-400" />}
                  label="Total Assets" value={`KSh ${summary.assets.amount.toLocaleString()}`}
                  sub={`${summary.assets.count} items`} color="sky" />
              </div>

              {/* MONTHLY CHART */}
              <div className="rounded-2xl bg-gray-900 border border-gray-800 p-6">
                <h2 className="text-base font-bold text-white mb-6 flex items-center gap-2">
                  <TrendingUp size={18} className="text-emerald-400" /> Monthly Sales vs Expenses (Last 12 Months)
                </h2>
                <div className="flex items-end gap-2 h-48 overflow-x-auto pb-2">
                  {monthlyData.map((m) => (
                    <div key={m.month} className="flex flex-col items-center gap-1 flex-1 min-w-[52px]">
                      <div className="flex items-end gap-1 h-40">
                        <div
                          style={{ height: `${Math.round((m.sales / maxSales) * 100)}%` }}
                          className="w-5 bg-emerald-500 rounded-t-lg transition-all min-h-[2px]"
                          title={`Sales: KSh ${m.sales.toLocaleString()}`}
                        />
                        <div
                          style={{ height: `${Math.round((m.expenses / maxSales) * 100)}%` }}
                          className="w-5 bg-rose-500 rounded-t-lg transition-all min-h-[2px]"
                          title={`Expenses: KSh ${m.expenses.toLocaleString()}`}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{m.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-6 mt-4">
                  <div className="flex items-center gap-2 text-xs text-gray-400"><div className="w-3 h-3 bg-emerald-500 rounded" /> Sales</div>
                  <div className="flex items-center gap-2 text-xs text-gray-400"><div className="w-3 h-3 bg-rose-500 rounded" /> Expenses</div>
                </div>
              </div>

              {/* ALL MODULES SUMMARY TABLE */}
              <div className="rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800">
                  <h2 className="text-base font-bold text-white">All Modules Summary</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-800/60">
                      <tr>
                        {["Module", "Records", "Amount / Value", "Notes"].map((h) => (
                          <th key={h} className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-gray-400">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {[
                        { module: "💰 Sales", records: summary.sales.count, amount: `KSh ${summary.sales.amount.toLocaleString()}`, note: "Total revenue" },
                        { module: "📋 Quotes", records: summary.quotes.count, amount: `KSh ${summary.quotes.amount.toLocaleString()}`, note: "Pending conversions" },
                        { module: "💳 Payments", records: summary.payments.count, amount: `KSh ${summary.payments.amount.toLocaleString()}`, note: "Received payments" },
                        { module: "🧾 Expenses", records: summary.expenses.count, amount: `KSh ${summary.expenses.amount.toLocaleString()}`, note: "Operating costs" },
                        { module: "🤝 Credits", records: summary.credits.count, amount: `KSh ${creditDue.toLocaleString()} due`, note: `Paid: KSh ${summary.credits.paid.toLocaleString()}` },
                        { module: "💸 Advances", records: summary.advances.count, amount: `KSh ${summary.advances.amount.toLocaleString()}`, note: "Staff advances" },
                        { module: "👔 Salaries", records: summary.salaries.count, amount: `KSh ${summary.salaries.amount.toLocaleString()}`, note: "Total salary" },
                        { module: "📊 Payroll", records: summary.payrolls.count, amount: `KSh ${summary.payrolls.payable.toLocaleString()}`, note: `Gross: KSh ${summary.payrolls.salary.toLocaleString()}` },
                        { module: "🛒 Purchases", records: summary.buys.count, amount: `KSh ${summary.buys.amount.toLocaleString()}`, note: `Fare: KSh ${summary.buys.fare.toLocaleString()}` },
                        { module: "📦 Assets", records: summary.assets.count, amount: `KSh ${summary.assets.amount.toLocaleString()}`, note: "Asset value" },
                        { module: "🔄 Adjustments", records: summary.adjustments.count, amount: "—", note: "Stock adjustments" },
                        { module: "🏪 Suppliers", records: summary.suppliers, amount: "—", note: "Active suppliers" },
                        { module: "👥 Staff", records: summary.staff, amount: "—", note: "Total staff" },
                        { module: "📱 Products", records: summary.products, amount: "—", note: "Total products" },
                        { module: "📈 Margins", records: summary.margins.count, amount: `KSh ${summary.margins.amount.toLocaleString()}`, note: "Profit margins" },
                        { module: "💼 Transactions", records: summary.transactions.count, amount: `KSh ${summary.transactions.amount.toLocaleString()}`, note: "Wallet transactions" },
                      ].map((row) => (
                        <tr key={row.module} className="hover:bg-gray-800/40 transition-colors">
                          <td className="px-5 py-3.5 font-semibold text-white">{row.module}</td>
                          <td className="px-5 py-3.5 text-gray-300">{row.records.toLocaleString()}</td>
                          <td className="px-5 py-3.5 text-emerald-400 font-semibold">{row.amount}</td>
                          <td className="px-5 py-3.5 text-gray-500 text-xs">{row.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* PROFIT SUMMARY */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <SummaryBlock title="Revenue Breakdown" items={[
                  { label: "Sales Revenue", value: `KSh ${summary.sales.amount.toLocaleString()}`, positive: true },
                  { label: "Quote Pipeline", value: `KSh ${summary.quotes.amount.toLocaleString()}`, positive: true },
                  { label: "Payments Received", value: `KSh ${summary.payments.amount.toLocaleString()}`, positive: true },
                ]} />
                <SummaryBlock title="Cost Breakdown" items={[
                  { label: "Expenses", value: `KSh ${summary.expenses.amount.toLocaleString()}`, positive: false },
                  { label: "Purchases", value: `KSh ${summary.buys.amount.toLocaleString()}`, positive: false },
                  { label: "Salaries", value: `KSh ${summary.salaries.amount.toLocaleString()}`, positive: false },
                  { label: "Advances", value: `KSh ${summary.advances.amount.toLocaleString()}`, positive: false },
                ]} />
                <SummaryBlock title="Balance Sheet" items={[
                  { label: "Assets Value", value: `KSh ${summary.assets.amount.toLocaleString()}`, positive: true },
                  { label: "Credit Due", value: `KSh ${creditDue.toLocaleString()}`, positive: false },
                  { label: "Net Profit/Loss", value: `KSh ${profit.toLocaleString()}`, positive: profit >= 0 },
                ]} />
              </div>
            </div>
          )}

          {/* ─── SALES REPORT ─── */}
          {activeReport === "sales" && (
            <ReportSection
              title="Sales Report"
              icon={<ShoppingCart size={18} className="text-emerald-400" />}
              cards={[
                { label: "Total Sales", value: summary.sales.count, sub: "transactions" },
                { label: "Revenue", value: `KSh ${summary.sales.amount.toLocaleString()}`, sub: "total amount" },
                { label: "Avg Sale", value: summary.sales.count > 0 ? `KSh ${Math.round(summary.sales.amount / summary.sales.count).toLocaleString()}` : "KSh 0", sub: "per transaction" },
              ]}
              chart={<MiniChart data={monthlyData} valueKey="sales" color="emerald" label="Monthly Sales" />}
            />
          )}

          {/* ─── PAYMENTS REPORT ─── */}
          {activeReport === "payments" && (
            <ReportSection
              title="Payments Report"
              icon={<CreditCard size={18} className="text-sky-400" />}
              cards={[
                { label: "Total Payments", value: summary.payments.count, sub: "received" },
                { label: "Total Amount", value: `KSh ${summary.payments.amount.toLocaleString()}`, sub: "collected" },
                { label: "Avg Payment", value: summary.payments.count > 0 ? `KSh ${Math.round(summary.payments.amount / summary.payments.count).toLocaleString()}` : "KSh 0", sub: "per payment" },
              ]}
              chart={null}
            />
          )}

          {/* ─── EXPENSES REPORT ─── */}
          {activeReport === "expenses" && (
            <ReportSection
              title="Expenses Report"
              icon={<TrendingDown size={18} className="text-rose-400" />}
              cards={[
                { label: "Total Expenses", value: summary.expenses.count, sub: "entries" },
                { label: "Total Spent", value: `KSh ${summary.expenses.amount.toLocaleString()}`, sub: "operating costs" },
                { label: "Avg Expense", value: summary.expenses.count > 0 ? `KSh ${Math.round(summary.expenses.amount / summary.expenses.count).toLocaleString()}` : "KSh 0", sub: "per entry" },
              ]}
              chart={<MiniChart data={monthlyData} valueKey="expenses" color="rose" label="Monthly Expenses" />}
            />
          )}

          {/* ─── PURCHASES REPORT ─── */}
          {activeReport === "purchases" && (
            <ReportSection
              title="Purchases Report"
              icon={<Truck size={18} className="text-amber-400" />}
              cards={[
                { label: "Total Purchases", value: summary.buys.count, sub: "orders" },
                { label: "Total Amount", value: `KSh ${summary.buys.amount.toLocaleString()}`, sub: "stock cost" },
                { label: "Transport Cost", value: `KSh ${summary.buys.fare.toLocaleString()}`, sub: "fare / shipping" },
              ]}
              chart={null}
            />
          )}

          {/* ─── SALARIES REPORT ─── */}
          {activeReport === "salaries" && (
            <ReportSection
              title="Salaries & Payroll Report"
              icon={<DollarSign size={18} className="text-violet-400" />}
              cards={[
                { label: "Salary Records", value: summary.salaries.count, sub: "entries" },
                { label: "Total Salary", value: `KSh ${summary.salaries.amount.toLocaleString()}`, sub: "paid out" },
                { label: "Payroll Records", value: summary.payrolls.count, sub: `Payable: KSh ${summary.payrolls.payable.toLocaleString()}` },
              ]}
              chart={null}
            />
          )}

          {/* ─── ADVANCE REPORT ─── */}
          {activeReport === "advance" && (
            <ReportSection
              title="Staff Advances Report"
              icon={<Wallet size={18} className="text-orange-400" />}
              cards={[
                { label: "Total Advances", value: summary.advances.count, sub: "requests" },
                { label: "Total Amount", value: `KSh ${summary.advances.amount.toLocaleString()}`, sub: "advanced" },
                { label: "Avg Advance", value: summary.advances.count > 0 ? `KSh ${Math.round(summary.advances.amount / summary.advances.count).toLocaleString()}` : "KSh 0", sub: "per request" },
              ]}
              chart={null}
            />
          )}

          {/* ─── ADJUSTMENTS REPORT ─── */}
          {activeReport === "adjustments" && (
            <ReportSection
              title="Stock Adjustments Report"
              icon={<ArrowUpDown size={18} className="text-blue-400" />}
              cards={[
                { label: "Total Adjustments", value: summary.adjustments.count, sub: "entries" },
                { label: "Products", value: summary.products, sub: "in system" },
                { label: "Staff", value: summary.staff, sub: "team members" },
              ]}
              chart={null}
            />
          )}

          {/* ─── STOCK REPORT ─── */}
          {activeReport === "stock" && (
            <ReportSection
              title="Stock & Inventory Report"
              icon={<Package size={18} className="text-teal-400" />}
              cards={[
                { label: "Total Products", value: summary.products, sub: "SKUs" },
                { label: "Suppliers", value: summary.suppliers, sub: "active" },
                { label: "Asset Value", value: `KSh ${summary.assets.amount.toLocaleString()}`, sub: `${summary.assets.count} assets` },
              ]}
              chart={null}
            />
          )}

        </div>
      </div>
    </div>
  );
}

/* ── SUB COMPONENTS ── */

function PrintHeader({ title }: { title: string }) {
  return (
    <div className="hidden print:block mb-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-sm text-gray-500">Generated: {new Date().toLocaleDateString("en-KE", { dateStyle: "full" })}</p>
      <div className="border-b-2 border-gray-200 mt-4" />
    </div>
  );
}

function DarkStatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string; sub: string; color: string;
}) {
  const colors: Record<string, string> = {
    emerald: "border-emerald-800/40 bg-emerald-950/40",
    rose: "border-rose-800/40 bg-rose-950/40",
    sky: "border-sky-800/40 bg-sky-950/40",
    amber: "border-amber-800/40 bg-amber-950/40",
    violet: "border-violet-800/40 bg-violet-950/40",
  };
  return (
    <div className={`rounded-2xl border p-5 ${colors[color] ?? colors.emerald}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-gray-800 rounded-xl">{icon}</div>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{sub}</div>
    </div>
  );
}

function SummaryBlock({ title, items }: { title: string; items: { label: string; value: string; positive: boolean }[] }) {
  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5">
      <h3 className="text-sm font-bold text-gray-300 mb-4 uppercase tracking-wider">{title}</h3>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex justify-between items-center">
            <span className="text-sm text-gray-400">{item.label}</span>
            <span className={`text-sm font-bold ${item.positive ? "text-emerald-400" : "text-rose-400"}`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniChart({ data, valueKey, color, label }: {
  data: MonthlyData[]; valueKey: "sales" | "expenses" | "profit"; color: string; label: string;
}) {
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500",
    rose: "bg-rose-500",
    sky: "bg-sky-500",
  };
  return (
    <div className="rounded-2xl bg-gray-900 border border-gray-800 p-5">
      <h3 className="text-sm font-bold text-gray-300 mb-4">{label}</h3>
      <div className="flex items-end gap-1.5 h-32">
        {data.map((m) => (
          <div key={m.month} className="flex flex-col items-center gap-1 flex-1">
            <div
              style={{ height: `${Math.round((m[valueKey] / max) * 100)}%` }}
              className={`w-full ${colorMap[color] ?? "bg-emerald-500"} rounded-t min-h-[2px] transition-all`}
            />
            <span className="text-xs text-gray-600 truncate w-full text-center">{m.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportSection({ title, icon, cards, chart }: {
  title: string;
  icon: React.ReactNode;
  cards: { label: string; value: string | number; sub: string }[];
  chart: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gray-800 rounded-xl">{icon}</div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-gray-900 border border-gray-800 p-5">
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{c.label}</div>
            <div className="text-2xl font-bold text-white">{typeof c.value === "number" ? c.value.toLocaleString() : c.value}</div>
            <div className="text-xs text-gray-500 mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      {chart}
    </div>
  );
}