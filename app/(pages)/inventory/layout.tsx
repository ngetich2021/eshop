// components/AppLayout.tsx
"use client";

import Navbar from "@/components/Navbar";
import { ReactNode } from "react";

export default function AppLayout({ children }: { children: ReactNode }) {
  /**
   * Navbar writes --sidebar-w to :root on every collapse/expand.
   * We consume it directly in CSS — zero JS state, zero flash.
   * On mobile (< 768px) we override to 0 via a media query in the
   * global style tag so the drawer overlay never shifts content.
   */
  return (
    <div className="min-h-screen bg-gray-50/60">
      <style>{`
        :root { --sidebar-w: 64px; --topbar-h: 56px; }
        .app-main {
          padding-top: var(--topbar-h);
          padding-left: var(--sidebar-w);
          transition: padding-left 200ms ease-in-out;
          min-height: 100vh;
          width: 100%;
          box-sizing: border-box;
        }
        @media (max-width: 767px) {
          .app-main { padding-left: 0 !important; }
        }
      `}</style>
      <Navbar />
      <main className="app-main">
        {children}
      </main>
    </div>
  );
}