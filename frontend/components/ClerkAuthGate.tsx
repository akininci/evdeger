"use client";

import { useUser, SignInButton } from "@clerk/nextjs";
import { ReactNode } from "react";

interface ClerkAuthGateInnerProps {
  children: ReactNode;
  fallback?: ReactNode;
  blurAmount?: string;
}

export function ClerkAuthGateInner({ children, fallback, blurAmount = "blur-md" }: ClerkAuthGateInnerProps) {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return <div className="animate-pulse bg-muted/50 rounded-xl h-20" />;
  }

  if (isSignedIn) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className={`${blurAmount} select-none pointer-events-none`} aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm rounded-xl">
        <div className="text-center p-6 max-w-sm">
          <div className="text-3xl mb-3">🔒</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Tam Raporu Gör</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Detaylı değerleme, benzer ilanlar ve yatırım analizine erişmek için ücretsiz giriş yap.
          </p>
          <SignInButton mode="modal">
            <button className="inline-flex items-center gap-2 rounded-xl bg-brand-navy px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-navy/25 transition-all duration-300 hover:shadow-xl hover:shadow-brand-navy/30 hover:-translate-y-0.5 active:translate-y-0">
              🔓 Giriş Yap — Ücretsiz
            </button>
          </SignInButton>
        </div>
      </div>
    </div>
  );
}

export function ClerkSaveHomeButton({ 
  propertyKey, 
  propertyData,
  className = "" 
}: { 
  propertyKey: string; 
  propertyData: Record<string, unknown>;
  className?: string;
}) {
  const { isSignedIn } = useUser();

  // We need these hooks but they must be imported from React
  const { useState, useEffect } = require("react");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;
    const savedHomes = JSON.parse(localStorage.getItem("evdeger_saved_homes") || "[]");
    setSaved(savedHomes.some((h: { key: string }) => h.key === propertyKey));
  }, [isSignedIn, propertyKey]);

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

  if (!isSignedIn) {
    return (
      <SignInButton mode="modal">
        <button
          className={`group relative inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border border-border bg-background hover:bg-muted transition-colors ${className}`}
          title="Kaydetmek için giriş yap"
        >
          <svg className="h-4 w-4 text-muted-foreground group-hover:text-rose-500 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
          </svg>
          Kaydet
        </button>
      </SignInButton>
    );
  }

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
      {saved ? "Kaydedildi" : "Kaydet"}
    </button>
  );
}
