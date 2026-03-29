"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 shadow-sm"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group" aria-label="EvDeğer Ana Sayfa">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold text-lg transition-colors ${
            scrolled
              ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900"
              : "bg-white/10 text-white backdrop-blur-sm border border-white/20"
          }`}>
            E
          </div>
          <span className={`text-xl font-bold transition-colors ${
            scrolled ? "text-slate-900 dark:text-white" : "text-white"
          }`}>
            Ev<span className="text-emerald-500">Değer</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1" aria-label="Ana navigasyon">
          {[
            { href: "/", label: "Ana Sayfa" },
            { href: "#nasil-calisir", label: "Nasıl Çalışır?" },
            { href: "#hakkimizda", label: "Hakkımızda" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                scrolled
                  ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
                  : "text-white/70 hover:text-white hover:bg-white/10"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile menu button */}
        <button
          type="button"
          className={`md:hidden inline-flex items-center justify-center rounded-lg p-2 transition-colors ${
            scrolled
              ? "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              : "text-white/70 hover:text-white hover:bg-white/10"
          }`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-label="Menüyü aç"
        >
          {mobileMenuOpen ? (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className={`md:hidden border-t transition-colors ${
          scrolled
            ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
            : "bg-slate-900/95 backdrop-blur-xl border-white/10"
        }`}>
          <nav className="flex flex-col gap-1 px-4 py-3" aria-label="Mobil navigasyon">
            {[
              { href: "/", label: "Ana Sayfa" },
              { href: "#nasil-calisir", label: "Nasıl Çalışır?" },
              { href: "#hakkimizda", label: "Hakkımızda" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  scrolled
                    ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
                    : "text-white/80 hover:bg-white/10 hover:text-white"
                }`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
