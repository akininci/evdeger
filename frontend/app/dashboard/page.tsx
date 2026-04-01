"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { formatTL } from "@/lib/api";

/* ── Clerk dynamic imports (avoid SSR issues) ── */
const CLERK_ENABLED = !!(
  typeof window !== "undefined" ||
  (process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
    !process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY.includes("REPLACE"))
);

// We use a wrapper component that dynamically imports Clerk hooks
const DashboardContent = dynamic(() => import("./DashboardContent"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900">
      <div className="animate-spin h-10 w-10 border-3 border-emerald-400 border-t-transparent rounded-full" />
    </div>
  ),
});

export default function DashboardPage() {
  return <DashboardContent />;
}
