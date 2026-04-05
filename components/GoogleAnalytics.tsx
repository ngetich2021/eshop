"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

// Local type definition to avoid 'any' or 'unknown'
declare global {
  interface Window {
    dataLayer: Array<Record<string, number | string | Date | object>>;
    gtag: (
      command: "config" | "event" | "js" | "set",
      targetId: string,
      config?: Record<string, string | number | boolean | object>
    ) => void;
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

function AnalyticsContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (GA_ID && window.gtag) {
      const search = searchParams.toString();
      const url = pathname + (search ? `?${search}` : "");
      
      window.gtag("config", GA_ID, {
        page_path: url,
      });
    }
  }, [pathname, searchParams]);

  if (!GA_ID) return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}

export default function GoogleAnalytics() {
  return (
    <Suspense fallback={null}>
      <AnalyticsContent />
    </Suspense>
  );
}