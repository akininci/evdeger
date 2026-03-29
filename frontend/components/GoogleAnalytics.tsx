"use client";

import Script from "next/script";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-XXXXXXXXXX";

export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID === "G-XXXXXXXXXX") {
    return null; // GA ID ayarlanmamışsa render etme
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            page_title: document.title,
            send_page_view: true,
          });
        `}
      </Script>
    </>
  );
}

// ── Event Tracking Helpers ──

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** Sayfa görüntüleme (SPA navigation için) */
export function trackPageView(url: string, title?: string) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "page_view", {
      page_path: url,
      page_title: title || document.title,
    });
  }
}

/** "Değerini Öğren" butonu tıklama */
export function trackValuationClick(city: string, district: string, neighborhood?: string) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "valuation_request", {
      event_category: "engagement",
      event_label: `${city}/${district}${neighborhood ? `/${neighborhood}` : ""}`,
      city,
      district,
      neighborhood: neighborhood || "",
    });
  }
}

/** Sonuç sayfası görüntüleme */
export function trackValuationResult(city: string, district: string, estimatedValue?: number) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "valuation_result_view", {
      event_category: "conversion",
      event_label: `${city}/${district}`,
      value: estimatedValue || 0,
    });
  }
}

/** Email kayıt */
export function trackEmailSignup(source: string) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", "email_signup", {
      event_category: "conversion",
      event_label: source,
    });
  }
}

/** Genel event tracking */
export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, params);
  }
}
