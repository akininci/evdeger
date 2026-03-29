"use client";

import Link from "next/link";
import { useState } from "react";

export function ABTestBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="relative bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-b border-white/10">
      <div className="mx-auto max-w-6xl px-4 py-2 flex items-center justify-center gap-3 text-sm">
        <span className="text-white/50">🔬 Yeni!</span>
        <span className="text-white/30 hidden sm:inline">3 farklı deneyim:</span>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/a"
            className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
          >
            Hızlı Değerleme →
          </Link>
          <span className="text-white/20">|</span>
          <Link
            href="/"
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            Klasik →
          </Link>
          <span className="text-white/20">|</span>
          <Link
            href="/c"
            className="text-purple-400 hover:text-purple-300 font-medium transition-colors"
          >
            Yatırımcı Modu →
          </Link>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-3 text-white/30 hover:text-white/60 transition-colors"
          aria-label="Kapat"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
