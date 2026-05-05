"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

/**
 * Google Tag Manager Page Tracker
 * Tracks page views on route changes
 */
function GTMPageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.dataLayer) {
      const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '');
      window.dataLayer.push({
        event: 'pageview',
        page: url,
      });
    }
  }, [pathname, searchParams]);

  return null;
}

/**
 * Google Tag Manager Component
 * 
 * This component loads Google Tag Manager for GOSH Perfume Studio.
 * GTM Container ID: GTM-KCXSBFNV
 */
export default function GoogleAnalytics() {
  const gtmId = 'GTM-KCXSBFNV';

  return (
    <>
      {/* Google Tag Manager Script */}
      <Script
        id="google-tag-manager"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');
          `,
        }}
      />
      
      {/* Page view tracker wrapped in Suspense */}
      <Suspense fallback={null}>
        <GTMPageTracker />
      </Suspense>
    </>
  );
}
