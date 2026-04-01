"use client";

import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";

interface ClerkAuthSectionProps {
  scrolled: boolean;
  variant: "desktop" | "mobile";
  onMobileMenuClose?: () => void;
}

export function ClerkAuthSection({ scrolled, variant, onMobileMenuClose }: ClerkAuthSectionProps) {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) return null;

  if (variant === "desktop") {
    if (isSignedIn) {
      return (
        <div className="flex items-center gap-2 ml-2">
          <Link
            href="/dashboard"
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              scrolled
                ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                : "text-white/70 hover:text-white hover:bg-white/10"
            }`}
          >
            Panelim
          </Link>
          <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
        </div>
      );
    }
    return (
      <SignInButton mode="modal">
        <button
          className={`ml-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
            scrolled
              ? "bg-brand-navy text-white hover:bg-brand-navy/90 shadow-sm"
              : "bg-white/10 text-white border border-white/20 hover:bg-white/20 backdrop-blur-sm"
          }`}
        >
          Giriş Yap
        </button>
      </SignInButton>
    );
  }

  // Mobile variant
  if (isSignedIn) {
    return (
      <>
        <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
        <Link
          href="/dashboard"
          className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
            scrolled
              ? "text-brand-navy hover:bg-slate-100"
              : "text-emerald-400 hover:bg-white/10"
          }`}
          onClick={onMobileMenuClose}
        >
          📊 Panelim
        </Link>
      </>
    );
  }

  return (
    <SignInButton mode="modal">
      <button
        className={`w-full text-left rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
          scrolled
            ? "text-brand-navy hover:bg-slate-100"
            : "text-emerald-400 hover:bg-white/10"
        }`}
        onClick={onMobileMenuClose}
      >
        🔓 Giriş Yap
      </button>
    </SignInButton>
  );
}

export function ClerkMobileAvatar() {
  const { isSignedIn, isLoaded } = useUser();
  if (!isLoaded || !isSignedIn) return null;
  return <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />;
}
