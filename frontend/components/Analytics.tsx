"use client";

import { useEffect } from "react";
import Script from "next/script";

/* ── Plausible Analytics ── */
export function PlausibleAnalytics() {
  return (
    <Script
      defer
      data-domain="evdeger.durinx.com"
      src="https://plausible.io/js/script.js"
      strategy="afterInteractive"
    />
  );
}

/* ── Custom Event Tracker (localStorage-based fallback) ── */
interface AnalyticsEvent {
  event: string;
  props?: Record<string, string | number>;
  timestamp: string;
  path: string;
}

export function trackEvent(event: string, props?: Record<string, string | number>) {
  // Try Plausible first
  if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).plausible) {
    ((window as unknown as Record<string, unknown>).plausible as (event: string, options?: { props?: Record<string, string | number> }) => void)(event, { props });
  }

  // Always store locally as backup
  if (typeof window !== "undefined") {
    const events: AnalyticsEvent[] = JSON.parse(localStorage.getItem("evdeger_analytics") || "[]");
    events.push({
      event,
      props,
      timestamp: new Date().toISOString(),
      path: window.location.pathname,
    });
    // Keep last 500 events
    if (events.length > 500) events.splice(0, events.length - 500);
    localStorage.setItem("evdeger_analytics", JSON.stringify(events));
  }
}

/* ── Page View Tracker ── */
export function PageViewTracker() {
  useEffect(() => {
    trackEvent("pageview");
  }, []);

  return null;
}
