"use client";

import { useState, useEffect } from "react";

export function StickyCTA() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShow(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToForm = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!show) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-blue-600 to-emerald-600 shadow-lg transform transition-transform duration-300">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center justify-between">
        <span className="text-white text-sm font-medium hidden sm:block">
          🏠 Evinizin değerini saniyeler içinde öğrenin
        </span>
        <button
          onClick={scrollToForm}
          className="px-5 py-1.5 bg-white text-blue-700 text-sm font-bold rounded-full hover:bg-blue-50 transition-all shadow-md active:scale-95"
        >
          Şimdi Test Et →
        </button>
      </div>
    </div>
  );
}
