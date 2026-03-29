"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getCities, getDistricts, getNeighborhoods, formatTL, formatNumber } from "@/lib/api";
import type { City, District, Neighborhood } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* eslint-disable @typescript-eslint/no-explicit-any */

function LocationSelector({
  label,
  onResult,
  defaultCity,
  defaultDistrict,
  defaultNeighborhood,
}: {
  label: string;
  onResult: (data: any) => void;
  defaultCity?: string;
  defaultDistrict?: string;
  defaultNeighborhood?: string;
}) {
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [selectedCity, setSelectedCity] = useState(defaultCity || "");
  const [selectedDistrict, setSelectedDistrict] = useState(defaultDistrict || "");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState(defaultNeighborhood || "");
  const [loading, setLoading] = useState(false);
  const [loadingCities, setLoadingCities] = useState(true);

  useEffect(() => {
    getCities().then(setCities).finally(() => setLoadingCities(false));
  }, []);

  useEffect(() => {
    if (defaultCity) {
      getDistricts(defaultCity).then(setDistricts);
    }
  }, [defaultCity]);

  useEffect(() => {
    if (defaultCity && defaultDistrict) {
      getNeighborhoods(defaultCity, defaultDistrict).then(setNeighborhoods);
    }
  }, [defaultCity, defaultDistrict]);

  const handleCityChange = useCallback(async (slug: string) => {
    setSelectedCity(slug);
    setSelectedDistrict("");
    setSelectedNeighborhood("");
    setDistricts([]);
    setNeighborhoods([]);
    if (slug) setDistricts(await getDistricts(slug));
  }, []);

  const handleDistrictChange = useCallback(
    async (slug: string) => {
      setSelectedDistrict(slug);
      setSelectedNeighborhood("");
      setNeighborhoods([]);
      if (slug && selectedCity) setNeighborhoods(await getNeighborhoods(selectedCity, slug));
    },
    [selectedCity]
  );

  const handleFetch = async () => {
    if (!selectedCity || !selectedDistrict || !selectedNeighborhood) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/api/valuation?city=${encodeURIComponent(selectedCity)}&district=${encodeURIComponent(selectedDistrict)}&neighborhood=${encodeURIComponent(selectedNeighborhood)}`
      );
      if (!res.ok) throw new Error();
      const d = await res.json();
      onResult(d);
    } catch {
      onResult(null);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch if defaults provided
  useEffect(() => {
    if (defaultCity && defaultDistrict && defaultNeighborhood) {
      handleFetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">{label}</h3>
      <div className="space-y-2">
        <select
          value={selectedCity}
          onChange={(e) => handleCityChange(e.target.value)}
          disabled={loadingCities}
          className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
        >
          <option value="">İl seçin</option>
          {cities.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </select>
        <select
          value={selectedDistrict}
          onChange={(e) => handleDistrictChange(e.target.value)}
          disabled={!selectedCity}
          className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:opacity-50"
        >
          <option value="">{!selectedCity ? "Önce il seçin" : "İlçe seçin"}</option>
          {districts.map((d) => (
            <option key={d.slug} value={d.slug}>{d.name}</option>
          ))}
        </select>
        <select
          value={selectedNeighborhood}
          onChange={(e) => setSelectedNeighborhood(e.target.value)}
          disabled={!selectedDistrict}
          className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none disabled:opacity-50"
        >
          <option value="">{!selectedDistrict ? "Önce ilçe seçin" : "Mahalle seçin"}</option>
          {neighborhoods.map((n) => (
            <option key={n.slug} value={n.slug}>{n.name}</option>
          ))}
        </select>
        <button
          onClick={handleFetch}
          disabled={!selectedCity || !selectedDistrict || !selectedNeighborhood || loading}
          className="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium py-2 text-sm transition-colors"
        >
          {loading ? "Yükleniyor..." : "Getir"}
        </button>
      </div>
    </div>
  );
}

function CompareRow({ label, val1, val2 }: { label: string; val1: string; val2: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 py-3 border-b border-slate-800 text-sm">
      <p className="text-slate-400">{label}</p>
      <p className="text-white font-medium text-center">{val1}</p>
      <p className="text-white font-medium text-center">{val2}</p>
    </div>
  );
}

function KarsilastirContent() {
  const searchParams = useSearchParams();
  const [data1, setData1] = useState<any>(null);
  const [data2, setData2] = useState<any>(null);

  const defaultCity1 = searchParams.get("city1") || "";
  const defaultDistrict1 = searchParams.get("district1") || "";
  const defaultNeighborhood1 = searchParams.get("neighborhood1") || "";

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
            Değerleme
          </Link>
          <Link href="/c/karsilastir" className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium">
            Bölge Karşılaştırma
          </Link>
          <Link href="/" className="px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 text-sm transition-colors mt-auto">
            ← Klasik Versiyon
          </Link>
        </nav>
      </aside>

      <main className="flex-1 p-4 lg:p-8">
        {/* Mobile header */}
        <div className="lg:hidden mb-4 flex items-center justify-between">
          <Link href="/c" className="text-sm text-emerald-400">← Geri</Link>
          <h2 className="text-sm font-semibold">Karşılaştırma</h2>
        </div>

        <h2 className="text-2xl lg:text-3xl font-bold mb-2">Bölge Karşılaştırma</h2>
        <p className="text-slate-400 mb-6">İki bölgeyi yan yana kıyaslayın</p>

        {/* Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <LocationSelector
            label="Bölge 1"
            onResult={setData1}
            defaultCity={defaultCity1}
            defaultDistrict={defaultDistrict1}
            defaultNeighborhood={defaultNeighborhood1}
          />
          <LocationSelector label="Bölge 2" onResult={setData2} />
        </div>

        {/* Comparison Table */}
        {data1 && data2 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            <h3 className="text-lg font-semibold mb-4">Karşılaştırma Tablosu</h3>

            {/* Headers */}
            <div className="grid grid-cols-3 gap-2 pb-3 border-b border-slate-700 text-sm">
              <p className="text-slate-500">Metrik</p>
              <p className="text-emerald-400 font-medium text-center">
                {data1.district}, {data1.neighborhood}
              </p>
              <p className="text-emerald-400 font-medium text-center">
                {data2.district}, {data2.neighborhood}
              </p>
            </div>

            <CompareRow
              label="m² Fiyatı"
              val1={formatTL(data1.sale.avg_price_per_sqm)}
              val2={formatTL(data2.sale.avg_price_per_sqm)}
            />
            <CompareRow
              label="Tahmini Değer"
              val1={formatTL(data1.estimated_value_mid)}
              val2={formatTL(data2.estimated_value_mid)}
            />
            <CompareRow
              label="Aylık Kira"
              val1={formatTL(data1.estimated_rent_mid || 0)}
              val2={formatTL(data2.estimated_rent_mid || 0)}
            />
            <CompareRow
              label="Kira Getirisi"
              val1={`%${(data1.stats?.gross_rental_yield || 0).toFixed(1)}`}
              val2={`%${(data2.stats?.gross_rental_yield || 0).toFixed(1)}`}
            />
            <CompareRow
              label="Amortisman"
              val1={`~${data1.stats?.amortization_years || "-"} yıl`}
              val2={`~${data2.stats?.amortization_years || "-"} yıl`}
            />
            <CompareRow
              label="Yatırım Skoru"
              val1={`${data1.stats?.investment_score || "-"}/10 (${data1.stats?.investment_label || "-"})`}
              val2={`${data2.stats?.investment_score || "-"}/10 (${data2.stats?.investment_label || "-"})`}
            />
            <CompareRow
              label="İlan Sayısı"
              val1={formatNumber(data1.sale.sample_size)}
              val2={formatNumber(data2.sale.sample_size)}
            />
            <CompareRow
              label="Ort. m²"
              val1={`${data1.stats?.avg_sqm || "-"} m²`}
              val2={`${data2.stats?.avg_sqm || "-"} m²`}
            />
          </div>
        )}

        {(!data1 || !data2) && (
          <div className="text-center py-12 text-slate-500">
            <p>İki bölge seçip &quot;Getir&quot; butonuna tıklayın</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default function KarsilastirPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
          <div className="w-12 h-12 border-2 border-slate-700 border-t-emerald-400 rounded-full animate-spin" />
        </div>
      }
    >
      <KarsilastirContent />
    </Suspense>
  );
}
