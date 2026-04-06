// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import { IdleTimer } from "@/components/Sign-Out";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import ServiceWorkerRegister from "@/components/Serviceworkerregister";
import "@/app/globals.css";
import { AppProvider } from "@/components/AppContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets:  ["latin"],
  display:  "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets:  ["latin"],
  display:  "swap",
});

export const metadata: Metadata = {
  title:       "eShop",
  description: "developed by Kwenik Developers",
  manifest:    "/manifest.json",
  appleWebApp: {
    capable:         true,
    statusBarStyle:  "default",
    title:           "eShop",
  },
  formatDetection: { telephone: false },
  openGraph: {
    type:        "website",
    title:       "eShop",
    description: "developed by Kwenik Developers",
  },
};

export const viewport: Viewport = {
  themeColor:    "#4f46e5",
  width:         "device-width",
  initialScale:  1,
  maximumScale:  5,        // allow pinch-zoom for accessibility
  userScalable:  true,     // never block zoom — a11y requirement
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    /*
     * lang / dir are set dynamically on the client by AppContext's effect,
     * which syncs document.documentElement.lang and .dir whenever the user
     * changes language. The default here is "en" / "ltr".
     */
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <link
          rel="apple-touch-icon"
          sizes="192x192"
          href="/icons/manifest-icon-192.maskable.png"
        />
        <link
          rel="apple-touch-icon"
          sizes="512x512"
          href="/icons/manifest-icon-512.maskable.png"
        />
        <meta name="apple-mobile-web-app-capable"        content="yes"     />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable"              content="yes"     />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <GoogleAnalytics />
        <SessionProvider>
          <AppProvider>
            <IdleTimer />
            {children}
          </AppProvider>
        </SessionProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}