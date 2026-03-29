"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";

// Dynamic import to avoid SSR issues with react-simple-maps + reduce initial bundle
const TurkeyMap = dynamic(() => import("@/components/TurkeyMap"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

function MapSkeleton() {
  return (
    <div className="relative w-full aspect-[2/1] sm:aspect-[2.2/1] rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden animate-pulse">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-12 w-12 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
          </svg>
          <span className="text-sm text-slate-400 dark:text-slate-500">Harita yükleniyor…</span>
        </div>
      </div>
      <div className="absolute top-[30%] left-[15%] w-[70%] h-[40%] bg-slate-200 dark:bg-slate-700 rounded-[40%] opacity-50" />
    </div>
  );
}

export default function MapExploreSection() {
  return (
    <section className="py-20 sm:py-24 bg-white dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-10">
          <span className="inline-block rounded-full bg-indigo-50 dark:bg-indigo-950 px-4 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-4">
            🗺️ Haritadan Keşfet
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white">
            Türkiye&apos;de Emlak Fiyatları Haritası
          </h2>
          <p className="mt-4 text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            İl üzerine tıklayarak ortalama m² fiyatını görün ve detaylı değerleme sayfasına gidin
          </p>
        </div>

        {/* Map Container */}
        <div className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-sm overflow-hidden">
          <Suspense fallback={<MapSkeleton />}>
            <TurkeyMap />
          </Suspense>
        </div>
      </div>
    </section>
  );
}
