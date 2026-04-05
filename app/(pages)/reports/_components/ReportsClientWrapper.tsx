// app/reports/_components/ReportsClientWrapper.tsx
"use client";

import { useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
import ReportsView, { type DateRange } from "./ReportsView";

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
type ActiveShop  = { id: string; name: string; location: string };

type Props = {
  summary: Summary;
  monthlyData: MonthlyData[];
  activeShop: ActiveShop;
  initialDateRange: DateRange;
};

export default function ReportsClientWrapper({ summary, monthlyData, activeShop, initialDateRange }: Props) {
  const router  = useRouter();
  const path    = usePathname();
  const [, startTransition] = useTransition();

  const handleDateRangeChange = (range: DateRange) => {
    const params = new URLSearchParams({
      from:   range.from,
      to:     range.to,
      preset: range.preset,
    });
    startTransition(() => {
      router.push(`${path}?${params.toString()}`);
    });
  };

  return (
    <ReportsView
      summary={summary}
      monthlyData={monthlyData}
      activeShop={activeShop}
      dateRange={initialDateRange}
      onDateRangeChange={handleDateRangeChange}
    />
  );
}