"use client";

import { useState, useEffect } from "react";
import { subscribe } from "@/lib/api";
import { toast } from "sonner";

interface EmailSignupFormProps {
  variant?: "inline" | "hero" | "compact";
  context?: string;
  location?: string;
  locationCity?: string;
  locationDistrict?: string;
  locationNeighborhood?: string;
}

export function EmailSignupForm({ variant = "inline", context = "general", location, locationCity, locationDistrict, locationNeighborhood }: EmailSignupFormProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("evdeger_email_subscribed");
    if (stored) setSubmitted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;

    setLoading(true);
    setError(null);

    try {
      const result = await subscribe(email, context, location, locationCity, locationDistrict, locationNeighborhood);
      if (result.success) {
        localStorage.setItem("evdeger_email_subscribed", "true");
        setSubmitted(true);
        if (result.already_subscribed) {
          toast.info("Bu email adresi zaten kayıtlı.");
        } else {
          toast.success("Kaydınız başarıyla oluşturuldu! 🎉");
        }
      }
    } catch {
      // Fallback: localStorage'a kaydet (offline/API hatası durumunda)
      const existing = JSON.parse(localStorage.getItem("evdeger_emails") || "[]");
      existing.push({
        email,
        context,
        timestamp: new Date().toISOString(),
      });
      localStorage.setItem("evdeger_emails", JSON.stringify(existing));
      localStorage.setItem("evdeger_email_subscribed", "true");
      setSubmitted(true);
      setError(null);
      toast.warning("Bağlantı hatası — kaydınız yerel olarak saklandı.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className={`flex items-center gap-3 rounded-2xl ${
        variant === "hero"
          ? "bg-emerald-500/10 border border-emerald-500/20 p-4 sm:p-5"
          : "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4"
      }`}>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 flex-shrink-0">
          <svg className="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        </div>
        <div>
          <p className={`text-sm font-semibold ${variant === "hero" ? "text-emerald-300" : "text-emerald-700 dark:text-emerald-300"}`}>
            Kaydınız alındı! ✨
          </p>
          <p className={`text-xs mt-0.5 ${variant === "hero" ? "text-emerald-400/60" : "text-emerald-600/60 dark:text-emerald-400/60"}`}>
            Bölgenizdeki fiyat değişikliklerinden haberdar olacaksınız.
          </p>
        </div>
      </div>
    );
  }

  if (variant === "hero") {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">📬</span>
          <h3 className="text-base font-semibold text-white">
            Bölgendeki fiyat değişikliklerini takip et
          </h3>
        </div>
        <p className="text-sm text-white/50 mb-4">
          Ücretsiz bildirim al — fiyatlar değiştiğinde ilk sen öğren.
        </p>
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <input
              type="email"
              placeholder="Email adresin"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              required
              disabled={loading}
              className={`w-full h-12 rounded-xl bg-white/10 border px-4 text-white placeholder:text-white/30 text-sm transition-all duration-300 focus:outline-none ${
                focused
                  ? "border-emerald-400/50 shadow-[0_0_20px_rgba(52,211,153,0.15)]"
                  : "border-white/10"
              } ${loading ? "opacity-60" : ""}`}
              aria-label="Email adresiniz"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className={`h-12 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-green-400 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/30 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
          >
            {loading ? "..." : "Takip Et"}
          </button>
        </form>
        {error && (
          <p className="text-xs text-red-400 mt-2">{error}</p>
        )}
        <p className="text-[11px] text-white/25 mt-2.5 flex items-center gap-1">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          Spam yok. İstediğin zaman çık.
        </p>
      </div>
    );
  }

  // Inline/compact variant
  return (
    <div className={`rounded-2xl border p-5 sm:p-6 ${
      variant === "compact"
        ? "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900"
        : "border-blue-200 dark:border-blue-800/50 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30"
    }`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">📬</span>
        <h3 className="text-base font-semibold text-foreground">
          Bölgendeki fiyat değişikliklerini takip et — ücretsiz!
        </h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Fiyatlar değiştiğinde bildirim al, en doğru zamanda hareket et.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="email"
            placeholder="Email adresin"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            required
            disabled={loading}
            className={`w-full h-11 rounded-xl border bg-white dark:bg-slate-800 px-4 text-foreground placeholder:text-muted-foreground/50 text-sm transition-all duration-300 focus:outline-none ${
              focused
                ? "border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.12)]"
                : "border-slate-200 dark:border-slate-700"
            } ${loading ? "opacity-60" : ""}`}
            aria-label="Email adresiniz"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className={`h-11 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap ${loading ? "opacity-70 cursor-not-allowed" : ""}`}
        >
          {loading ? "Gönderiliyor..." : "Ücretsiz Takip Et"}
        </button>
      </form>
      {error && (
        <p className="text-xs text-red-500 mt-2">{error}</p>
      )}
      <p className="text-[11px] text-muted-foreground/50 mt-2 flex items-center gap-1">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
        </svg>
        Spam yok. İstediğin zaman çık.
      </p>
    </div>
  );
}
