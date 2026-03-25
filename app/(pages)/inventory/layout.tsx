// components/AppLayout.tsx
"use client";

import Navbar from "@/components/Navbar";
import { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar/>
      <main className="ml-24 xl:ml-68">{children}</main>
    </div>
  );
}