"use client";

import { ReactNode, useState, useEffect } from "react";
import dynamic from "next/dynamic";

const CLERK_ENABLED = !!(
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("REPLACE")
);

// Lazy-load Clerk-dependent components only when configured (ssr: false avoids SSG errors)
const ClerkAuthGateInner = CLERK_ENABLED
  ? dynamic(() => import("./ClerkAuthGate").then((m) => m.ClerkAuthGateInner), { ssr: false })
  : null;

interface AuthGateProps {
  children: ReactNode;
  fallback?: ReactNode;
  blurAmount?: string;
}

export function AuthGate({ children, fallback, blurAmount }: AuthGateProps) {
  if (!CLERK_ENABLED || !ClerkAuthGateInner) {
    return <>{children}</>;
  }
  return (
    <ClerkAuthGateInner blurAmount={blurAmount} fallback={fallback}>
      {children}
    </ClerkAuthGateInner>
  );
}

export function SaveHomeButton({ 
  propertyKey, 
  propertyData,
  className = "" 
}: { 
  propertyKey: string; 
  propertyData: Record<string, unknown>;
  className?: string;
}) {
  // Simple local-storage based save — works without Clerk too
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedHomes = JSON.parse(localStorage.getItem("evdeger_saved_homes") || "[]");
    setSaved(savedHomes.some((h: { key: string }) => h.key === propertyKey));
  }, [propertyKey]);

  const toggleSave = () => {
    const savedHomes = JSON.parse(localStorage.getItem("evdeger_saved_homes") || "[]");
    if (saved) {
      const filtered = savedHomes.filter((h: { key: string }) => h.key !== propertyKey);
      localStorage.setItem("evdeger_saved_homes", JSON.stringify(filtered));
      setSaved(false);
    } else {
      savedHomes.push({ key: propertyKey, ...propertyData, savedAt: new Date().toISOString() });
      localStorage.setItem("evdeger_saved_homes", JSON.stringify(savedHomes));
      setSaved(true);
    }
  };

  return (
    <button
      onClick={toggleSave}
      className={`group relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border transition-all duration-300 ${
        saved
          ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400"
          : "border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground"
      } ${className}`}
      title={saved ? "Kaydedilenlerden çıkar" : "Kaydet"}
    >
      <svg
        className={`h-4 w-4 transition-all duration-300 ${saved ? "text-rose-500 scale-110" : "text-muted-foreground group-hover:text-rose-500"}`}
        fill={saved ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
      </svg>
      {saved ? "Kaydedildi ❤️" : "Kaydet 🤍"}
    </button>
  );
}
