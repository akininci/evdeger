"use client";

import { useEffect } from "react";
import { trackEvent } from "@/components/GoogleAnalytics";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[App Error]", error);
    trackEvent("exception", {
      description: `${error.name}: ${error.message}`,
      fatal: true,
    });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="text-6xl mb-6">🏚️</div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
          Bir Şeyler Ters Gitti
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">
          Üzgünüz, beklenmedik bir hata meydana geldi. Tekrar deneyebilirsiniz.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-emerald-500/25 hover:bg-emerald-400 transition-all hover:-translate-y-0.5"
        >
          🔄 Tekrar Dene
        </button>
      </div>
    </div>
  );
}
