// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { IdleTimer } from "@/components/Sign-Out";
import GoogleAnalytics from "@/components/GoogleAnalytics";

// CSS is imported via a declaration shim (see globals.css.d.ts) to silence
// the TS "cannot find module" error for side-effect CSS imports.
import "@/app/globals.css";
import ServiceWorkerRegister from "@/components/Serviceworkerregister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "eShop",
  description: "developed by Kwenik Developers",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "eShop",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    title: "eShop",
    description: "developed by Kwenik Developers",
  },
};

// Viewport is exported separately (required by Next.js 14+)
export const viewport: Viewport = {
  themeColor: "#16a34a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* PWA / iOS Safari specific tags */}
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/manifest-icon-192.maskable.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/manifest-icon-512.maskable.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <GoogleAnalytics />
        <SessionProvider>
          <IdleTimer />
          <div>{children}</div>
        </SessionProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}