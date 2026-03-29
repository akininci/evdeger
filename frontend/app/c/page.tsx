"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCities, getDistricts, getNeighborhoods } from "@/lib/api";
import type { City, District, Neighborhood } from "@/lib/api";
import Link from "next/link";

export default function EvDegerCPage() {
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [selectedNeighborhood, setSelectedNeighborhood] = useState("");
  const [squareMeters, setSquareMeters] = useState("");
  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);

  useEffect(() => {
    async function loadCities() {
      try {
        const data = await getCities();
        setCities(data);
      } catch {
        /* ignore */
      } finally {
        setLoadingCities(false);
      }
    }
    loadCities();
  }, []);

  const handleCityChange = useCallback(async (slug: string) => {
    setSelectedCity(slug);
    setSelectedDistrict("");
    setSelectedNeighborhood("");
    setDistricts([]);
    setNeighborhoods([]);
    if (!slug) return;
    setLoadingDistricts(true);
    try {
      setDistricts(await getDistricts(slug));
    } catch {
      /* ignore */
    } finally {
      setLoadingDistricts(false);
    }
  }, []);

  const handleDistrictChange = useCallback(
    async (slug: string) => {
      setSelectedDistrict(slug);
      setSelectedNeighborhood("");
      setNeighborhoods([]);
      if (!slug || !selectedCity) return;
      setLoadingNeighborhoods(true);
      try {
        setNeighborhoods(await getNeighborhoods(selectedCity, slug));
      } catch {
        /* ignore */
      } finally {
        setLoadingNeighborhoods(false);
      }
    },
    [selectedCity]
  );

  const handleSubmit = () => {
    if (!selectedCity || !selectedDistrict || !selectedNeighborhood) return;
    let url = `/c/sonuc?city=${encodeURIComponent(selectedCity)}&district=${encodeURIComponent(selectedDistrict)}&neighborhood=${encodeURIComponent(selectedNeighborhood)}`;
    if (squareMeters) url += `&m2=${encodeURIComponent(squareMeters)}`;
    router.push(url);
  };

  const isReady = selectedCity && selectedDistrict && selectedNeighborhood;

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 p-6">
        <div className="mb-8">
          <h1 className="text-xl font-bold">
            Ev<span className="text-emerald-400">Değer</span>
            <span className="text-xs ml-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">PRO</span>
          </h1>
        </div>
        <nav className="flex flex-col gap-2">
          <Link
            href="/c"
            className="px-3 py-2 rounded-lg bg-slate-800 text-white text-sm font-medium"
          >
            Değerleme
          </Link>
          <Link
            href="/c/karsilastir"
            className="px-3 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-medium transition-colors"
          >
            Bölge Karşılaştırma
          </Link>
          <Link
            href="/"
            className="px-3 py-2 rounded-lg text-slate-500 hover:text-slate-300 text-sm transition-colors mt-auto"
          >
            ← Klasik Versiyon
          </Link>
        </nav>
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 lg:p-10">
        {/* Mobile header */}
        <div className="lg:hidden mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold">
            Ev<span className="text-emerald-400">Değer</span>
            <span className="text-xs ml-2 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">PRO</span>
          </h1>
          <Link href="/c/karsilastir" className="text-sm text-emerald-400 hover:underline">
            Karşılaştırma
          </Link>
        </div>

        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl lg:text-3xl font-bold mb-2">Profesyonel Değerleme</h2>
          <p className="text-slate-400 mb-8">
            Detaylı emlak analizi, yatırım skorları ve bölge karşılaştırma
          </p>

          {/* Form Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 lg:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* İl */}
              <div>
                <label htmlFor="c-city" className="block text-sm font-medium text-slate-400 mb-1.5">
                  İl
                </label>
                <select
                  id="c-city"
                  value={selectedCity}
                  onChange={(e) => handleCityChange(e.target.value)}
                  disabled={loadingCities}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none transition-colors"
                >
                  <option value="">{loadingCities ? "Yükleniyor..." : "İl seçin"}</option>
                  {cities.map((c) => (
                    <option key={c.slug} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* İlçe */}
              <div>
                <label htmlFor="c-district" className="block text-sm font-medium text-slate-400 mb-1.5">
                  İlçe
                </label>
                <select
                  id="c-district"
                  value={selectedDistrict}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  disabled={!selectedCity || loadingDistricts}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none transition-colors disabled:opacity-50"
                >
                  <option value="">
                    {loadingDistricts ? "Yükleniyor..." : !selectedCity ? "Önce il seçin" : "İlçe seçin"}
                  </option>
                  {districts.map((d) => (
                    <option key={d.slug} value={d.slug}>{d.name}</option>
                  ))}
                </select>
              </div>

              {/* Mahalle */}
              <div>
                <label htmlFor="c-neighborhood" className="block text-sm font-medium text-slate-400 mb-1.5">
                  Mahalle
                </label>
                <select
                  id="c-neighborhood"
                  value={selectedNeighborhood}
                  onChange={(e) => setSelectedNeighborhood(e.target.value)}
                  disabled={!selectedDistrict || loadingNeighborhoods}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none transition-colors disabled:opacity-50"
                >
                  <option value="">
                    {loadingNeighborhoods ? "Yükleniyor..." : !selectedDistrict ? "Önce ilçe seçin" : "Mahalle seçin"}
                  </option>
                  {neighborhoods.map((n) => (
                    <option key={n.slug} value={n.slug}>{n.name}</option>
                  ))}
                </select>
              </div>

              {/* m² */}
              <div>
                <label htmlFor="c-sqm" className="block text-sm font-medium text-slate-400 mb-1.5">
                  m² (isteğe bağlı)
                </label>
                <input
                  id="c-sqm"
                  type="number"
                  min={10}
                  max={10000}
                  placeholder="Ör: 120"
                  value={squareMeters}
                  onChange={(e) => setSquareMeters(e.target.value)}
                  className="w-full rounded-lg bg-slate-800 border border-slate-700 text-white px-4 py-3 text-sm focus:border-emerald-500 focus:outline-none transition-colors placeholder:text-slate-500"
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={!isReady}
              className="mt-6 w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3.5 text-base transition-all"
            >
              Detaylı Analiz Yap
            </button>
          </div>

          {/* Quick links */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
              <p className="text-emerald-400 font-semibold text-sm mb-1">Yatırım Analizi</p>
              <p className="text-slate-500 text-xs">Kira getirisi, amortisman süresi, yatırım skoru</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
              <p className="text-emerald-400 font-semibold text-sm mb-1">Fiyat Trendi</p>
              <p className="text-slate-500 text-xs">Son 6 aylık m² fiyat değişim grafiği</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-5">
              <p className="text-emerald-400 font-semibold text-sm mb-1">Bölge Karşılaştırma</p>
              <p className="text-slate-500 text-xs">İki bölgeyi yan yana kıyasla</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
