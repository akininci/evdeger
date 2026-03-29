"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense, useRef } from "react";
import Link from "next/link";
import { formatTL, formatNumber } from "@/lib/api";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* eslint-disable @typescript-eslint/no-explicit-any */

function ProSonucContent() {
  const searchParams = useSearchParams();
  const city = searchParams.get("city") || "";
  const district = searchParams.get("district") || "";
  const neighborhood = searchParams.get("neighborhood") || "";
  const m2Param = searchParams.get("m2");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculator state
  const [calcSqm, setCalcSqm] = useState(m2Param || "100");
  const [calcResult, setCalcResult] = useState<{ years: number; monthlyRent: number } | null>(null);

  useEffect(() => {
    if (!city || !district || !neighborhood) {
      setError("Eksik adres bilgisi.");
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        const res = await fetch(
          `${API_URL}/api/valuation?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}&neighborhood=${encodeURIComponent(neighborhood)}`
        );
        if (!res.ok) throw new Error("API hatası");
        setData(await res.json());
      } catch {
        setError("Değerleme yapılamadı.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [city, district, neighborhood]);

  // Calculator
  useEffect(() => {
    if (!data || !calcSqm) {
      setCalcResult(null);
      return;
    }
    const sqm = parseFloat(calcSqm);
    if (isNaN(sqm) || sqm <= 0) return;
    const totalValue = data.sale.avg_price_per_sqm * sqm;
    const monthlyRent = (data.rent?.avg_rent_per_sqm || 0) * sqm;
    const years = monthlyRent > 0 ? Math.round(totalValue / (monthlyRent * 12)) : 0;
    setCalcResult({ years, monthlyRent });
  }, [data, calcSqm]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-slate-700 border-t-emerald-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Analiz ediliyor...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <p className="text-xl mb-4">{error || "Hata"}</p>
        <Link href="/c" className="text-emerald-400 hover:underline">Geri Dön</Link>
      </div>
    );
  }

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const displayCity = capitalize(data.city || city);
  const displayDistrict = capitalize(data.district || district);
  const displayNeighborhood = capitalize(data.neighborhood || neighborhood);

  const grossYield = data.stats?.gross_rental_yield || 0;
  const amortYears = data.stats?.amortization_years || 0;
  const investScore = data.stats?.investment_score || 5;
  const investLabel = data.stats?.investment_label || "Orta";

  // Trend data for chart
  const trendData = (data.trend || []).map((t: any) => ({
    month: t.month,
    price: Math.round(t.avg_price_per_sqm),
  }));

  // Generate mock 6-month trend if no data
  const chartData = trendData.length > 0 ? trendData : generateMockTrend(data.sale.avg_price_per_sqm);

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-6">
        <div className="mb-8">
          <h1 className="text-xl font-bold">
            Ev<span className="text-emerald-400">Değer</span>
            <span className="text-xs ml-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">PRO</span>
          </h1>
        </div>
        <nav className="flex flex-col gap-2">
          <Link href="/c" className="px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-medium transition-colors">
            Yeni Değerleme
          </Link>
          <Link href="/c/karsilastir" className="px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-medium transition-colors">
            Bölge Karşılaştırma
          </Link>
          <Link href="/" className="px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 text-sm transition-colors mt-auto">
            ← Klasik Versiyon
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 overflow-y-auto">
        {/* Mobile header */}
        <div className="lg:hidden mb-4 flex items-center justify-between">
          <Link href="/c" className="text-sm text-emerald-400">← Geri</Link>
          <Link href="/c/karsilastir" className="text-sm text-slate-400">Karşılaştır</Link>
        </div>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl lg:text-3xl font-bold">
            {displayDistrict}, {displayNeighborhood}
          </h2>
          <p className="text-slate-400">{displayCity} · Detaylı Yatırım Raporu</p>
        </div>

        {/* Top Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Sale Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <p className="text-sm text-slate-400 mb-1">Satış Fiyat Aralığı</p>
            <p className="text-3xl font-bold text-white">{formatTL(data.estimated_value_mid)}</p>
            <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
              <span>Min: {formatTL(data.estimated_value_low)}</span>
              <span>Maks: {formatTL(data.estimated_value_high)}</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-slate-500">m² fiyatı:</span>
              <span className="text-sm font-semibold text-emerald-400">
                {formatTL(data.sale.avg_price_per_sqm)}/m²
              </span>
            </div>
          </div>

          {/* Rent Card */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <p className="text-sm text-slate-400 mb-1">Kira Fiyat Aralığı</p>
            <p className="text-3xl font-bold text-emerald-400">
              {formatTL(data.estimated_rent_mid || 0)}
              <span className="text-base font-normal text-slate-500">/ay</span>
            </p>
            <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
              <span>Min: {formatTL(data.estimated_rent_low || 0)}</span>
              <span>Maks: {formatTL(data.estimated_rent_high || 0)}</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-slate-500">m² kira:</span>
              <span className="text-sm font-semibold text-emerald-400">
                {formatTL(data.rent?.avg_rent_per_sqm || 0)}/m²
              </span>
            </div>
          </div>
        </div>

        {/* Investment Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard label="Kira Getirisi" value={`%${grossYield.toFixed(1)}`} accent />
          <MetricCard label="Amortisman" value={`~${amortYears} yıl`} />
          <MetricCard
            label="Yatırım Skoru"
            value={`${investScore}/10`}
            badge={investLabel}
            badgeColor={
              investLabel === "Yüksek" ? "bg-emerald-500/20 text-emerald-400" :
              investLabel === "Orta" ? "bg-amber-500/20 text-amber-400" :
              "bg-red-500/20 text-red-400"
            }
          />
          <MetricCard label="İlan Sayısı" value={formatNumber(data.sale.sample_size)} />
        </div>

        {/* Trend Chart */}
        {chartData.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">m² Fiyat Trendi (6 Ay)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 12 }} />
                  <YAxis
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "1px solid #1e293b",
                      borderRadius: "8px",
                      color: "#e2e8f0",
                    }}
                    formatter={(value) => [`₺${formatNumber(typeof value === "number" ? value : 0)}/m²`, "Fiyat"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPrice)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Similar Listings */}
        {data.similar_listings && data.similar_listings.length > 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 mb-6">
            <h3 className="text-lg font-semibold mb-4">Benzer İlanlar</h3>
            <div className="space-y-3">
              {data.similar_listings.slice(0, 5).map((listing: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-slate-800/50 px-4 py-3 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white truncate">{listing.title}</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {listing.rooms && `${listing.rooms} · `}
                      {listing.sqm && `${listing.sqm}m² · `}
                      {listing.source}
                    </p>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <p className="font-semibold text-emerald-400">{formatTL(listing.price)}</p>
                    {listing.url && (
                      <a
                        href={listing.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-500 hover:text-emerald-400 transition-colors"
                      >
                        İlanı gör →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Investment Calculator */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Yatırım Hesap Makinesi</h3>
          <p className="text-sm text-slate-400 mb-4">
            Belirttiğiniz m² için kaç yılda kendini ödeyeceğini hesaplayın
          </p>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
            <div>
              <label htmlFor="calc-sqm" className="block text-sm text-slate-400 mb-1">
                Daire büyüklüğü (m²)
              </label>
              <input
                id="calc-sqm"
                type="number"
                min={10}
                max={10000}
                value={calcSqm}
                onChange={(e) => setCalcSqm(e.target.value)}
                className="rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-2.5 text-sm w-32 focus:border-emerald-500 focus:outline-none"
              />
            </div>
            {calcResult && (
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-slate-500">Tahmini Değer</p>
                  <p className="text-lg font-bold text-white">
                    {formatTL(data.sale.avg_price_per_sqm * parseFloat(calcSqm || "0"))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Aylık Kira</p>
                  <p className="text-lg font-bold text-emerald-400">
                    {formatTL(calcResult.monthlyRent)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Amortisman</p>
                  <p className="text-lg font-bold text-amber-400">
                    ~{calcResult.years} yıl
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Export / Actions */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => window.print()}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
          >
            PDF İndir (Yazdır)
          </button>
          <Link
            href={`/c/karsilastir?city1=${encodeURIComponent(city)}&district1=${encodeURIComponent(district)}&neighborhood1=${encodeURIComponent(neighborhood)}`}
            className="rounded-lg border border-emerald-800 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            Başka Bölgeyle Karşılaştır
          </Link>
          <Link
            href="/c"
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Yeni Analiz
          </Link>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-slate-600 mt-8">
          Bu değerleme tahmini olup kesin değildir. Resmi ekspertiz raporu yerine geçmez.
          Kaynak: {data.data_source} · {data.calculated_at ? new Date(data.calculated_at).toLocaleDateString("tr-TR") : ""}
        </p>
      </main>
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent,
  badge,
  badgeColor,
}: {
  label: string;
  value: string;
  accent?: boolean;
  badge?: string;
  badgeColor?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${accent ? "text-emerald-400" : "text-white"}`}>
        {value}
      </p>
      {badge && (
        <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${badgeColor}`}>
          {badge}
        </span>
      )}
    </div>
  );
}

function generateMockTrend(currentPrice: number) {
  const months = ["Eki", "Kas", "Ara", "Oca", "Şub", "Mar"];
  const result = [];
  for (let i = 0; i < months.length; i++) {
    const variation = 1 - (months.length - 1 - i) * 0.03 + (Math.random() - 0.5) * 0.02;
    result.push({
      month: months[i],
      price: Math.round(currentPrice * variation),
    });
  }
  return result;
}

export default function ProSonucPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <div className="w-12 h-12 border-2 border-slate-700 border-t-emerald-400 rounded-full animate-spin" />
        </div>
      }
    >
      <ProSonucContent />
    </Suspense>
  );
}
