"use client";

import { useState, useEffect } from "react";
import { subscribe } from "@/lib/api";

interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  location?: string;
}

export function EmailModal({ isOpen, onClose, location }: EmailModalProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;

    try {
      await subscribe(email, "post_valuation", location);
    } catch {
      // Fallback to localStorage if API fails
      const existing = JSON.parse(localStorage.getItem("evdeger_emails") || "[]");
      existing.push({
        email,
        context: "post_valuation",
        location: location || "",
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem("evdeger_emails", JSON.stringify(existing));
    }

    localStorage.setItem("evdeger_email_subscribed", "true");
    setSubmitted(true);
    setTimeout(onClose, 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in-up">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors z-10"
          aria-label="Kapat"
        >
          <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Top gradient bar */}
        <div className="h-1.5 bg-gradient-to-r from-blue-500 via-emerald-500 to-green-400" />

        <div className="p-6 sm:p-8">
          {submitted ? (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-xl font-bold text-foreground mb-2">Harika!</h3>
              <p className="text-muted-foreground text-sm">
                Sonuçlarınız ve bölge güncellemeleri email adresinize gönderilecek.
              </p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="text-4xl mb-3">📧</div>
                <h3 className="text-xl font-bold text-foreground">
                  Sonuçlarını email&apos;ine gönderelim mi?
                </h3>
                <p className="text-sm text-muted-foreground mt-2">
                  Değerleme raporunu kaydet + bölgendeki fiyat değişikliklerini takip et.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="relative">
                  <input
                    type="email"
                    placeholder="Email adresin"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    required
                    autoFocus
                    className={`w-full h-12 rounded-xl border bg-slate-50 dark:bg-slate-800 px-4 text-foreground placeholder:text-muted-foreground/50 text-sm transition-all duration-300 focus:outline-none ${
                      focused
                        ? "border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.12)] bg-white dark:bg-slate-800"
                        : "border-slate-200 dark:border-slate-700"
                    }`}
                    aria-label="Email adresiniz"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-green-400 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.01] active:scale-[0.99]"
                >
                  Gönder — Ücretsiz 🚀
                </button>
              </form>

              <button
                onClick={onClose}
                className="w-full mt-2 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors py-2"
              >
                Hayır, teşekkürler
              </button>

              <p className="text-[11px] text-muted-foreground/40 text-center mt-3 flex items-center justify-center gap-1">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                </svg>
                Kişisel veri saklamıyoruz. Spam yok.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
