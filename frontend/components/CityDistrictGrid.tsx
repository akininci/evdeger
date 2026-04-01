"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { getCityBySlug, getDistrictsForCity, getCityAvgPrice, getDistrictAvgPrice } from "@/lib/mock-data";
import { getCityEmoji } from "@/lib/city-emojis";
import { formatTL } from "@/lib/api";

const FEATURED_CITIES = [
  "istanbul", "ankara", "izmir", "bursa", "antalya", "adana",
  "konya", "gaziantep", "mersin", "kayseri", "eskisehir", "diyarbakir",
  "samsun", "trabzon", "mugla", "kocaeli", "denizli", "sakarya",
  "balikesir", "hatay", "manisa", "malatya", "erzurum", "van",
];

interface CityCardProps {
  slug: string;
  isExpanded: boolean;
  onToggle: (slug: string) => void;
}

function CityCard({ slug, isExpanded, onToggle }: CityCardProps) {
  const city = getCityBySlug(slug);
  if (!city) return null;

  const avgPrice = getCityAvgPrice(slug);
  const emoji = getCityEmoji(slug);
  const districts = getDistrictsForCity(slug);

  return (
    <div className="group">
      <button
        onClick={() => onToggle(slug)}
        className={`w-full text-left rounded-xl border transition-all duration-200 p-4 ${
          isExpanded
            ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-lg ring-1 ring-emerald-200 dark:ring-emerald-800"
            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-200 dark:hover:border-emerald-800 hover:shadow-md"
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{emoji}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">
              {city.name}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {formatTL(avgPrice)}/m²
            </p>
          </div>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </div>
      </button>

      {/* District expansion */}
      {isExpanded && districts.length > 0 && (
        <div className="mt-2 ml-2 mr-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-3 animate-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
              {city.name} İlçeleri
            </p>
            <Link
              href={`/${slug}`}
              className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Tüm detaylar →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {districts.slice(0, 9).map((d) => {
              const dPrice = getDistrictAvgPrice(slug, d.slug);
              return (
                <Link
                  key={d.slug}
                  href={`/${slug}/${d.slug}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors"
                >
                  <span className="text-slate-700 dark:text-slate-300 truncate">{d.name}</span>
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 ml-2 whitespace-nowrap">
                    {formatTL(dPrice)}
                  </span>
                </Link>
              );
            })}
            {districts.length > 9 && (
              <Link
                href={`/${slug}`}
                className="flex items-center justify-center rounded-lg px-3 py-2 text-sm bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 font-medium hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors"
              >
                +{districts.length - 9} ilçe daha →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CityDistrictGrid() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleToggle = useCallback((slug: string) => {
    setExpanded((prev) => (prev === slug ? null : slug));
  }, []);

  return (
    <section className="py-16 sm:py-20 bg-slate-50 dark:bg-slate-900/50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="inline-block rounded-full bg-emerald-50 dark:bg-emerald-950 px-4 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-4">
            🏘️ Şehir ve İlçeler
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            Şehre Tıkla, İlçeleri Keşfet
          </h2>
          <p className="mt-3 text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            Türkiye&apos;nin büyük şehirlerinde ilçe bazlı emlak fiyatlarını keşfedin
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {FEATURED_CITIES.map((slug) => (
            <CityCard
              key={slug}
              slug={slug}
              isExpanded={expanded === slug}
              onToggle={handleToggle}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
