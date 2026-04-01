"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { unsubscribeWithToken } from "@/lib/api";
import Link from "next/link";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error" | "no-token">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("no-token");
      setMessage("Geçersiz bağlantı. Lütfen emailinizdeki bağlantıyı kullanın.");
      return;
    }

    const doUnsubscribe = async () => {
      try {
        const result = await unsubscribeWithToken(token);
        if (result.success) {
          setStatus("success");
          setMessage(result.message);
        } else {
          setStatus("error");
          setMessage(result.message || "Bir hata oluştu.");
        }
      } catch {
        setStatus("error");
        setMessage("Abonelik iptal edilirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
      }
    };

    doUnsubscribe();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 p-8 text-center">
          {/* Logo */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              🏠 EvDeğer
            </h1>
          </div>

          {status === "loading" && (
            <>
              <div className="flex justify-center mb-4">
                <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-emerald-500 animate-spin" />
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                Aboneliğiniz iptal ediliyor...
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <svg className="h-8 w-8 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Abonelik İptal Edildi
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {message}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mb-6">
                Fikrinizi değiştirirseniz, sitemizden tekrar abone olabilirsiniz.
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Bir Hata Oluştu
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {message}
              </p>
            </>
          )}

          {status === "no-token" && (
            <>
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                  <svg className="h-8 w-8 text-amber-500" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                Geçersiz Bağlantı
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {message}
              </p>
            </>
          )}

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-medium text-sm transition-colors"
          >
            ← Ana Sayfaya Dön
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-12 w-12 rounded-full border-4 border-slate-200 border-t-emerald-500 animate-spin" />
        </div>
      }
    >
      <UnsubscribeContent />
    </Suspense>
  );
}
