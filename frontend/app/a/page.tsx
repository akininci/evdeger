"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCities, getDistricts } from "@/lib/api";
import type { City, District } from "@/lib/api";

export default function EvDegerAPage() {
  const router = useRouter();
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [loadingCities, setLoadingCities] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCities() {
      try {
        const data = await getCities();
        setCities(data);
      } catch {
        setError("Şehirler yüklenemedi.");
      } finally {
        setLoadingCities(false);
      }
    }
    loadCities();
  }, []);

  const handleCityChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const slug = e.target.value;
    setSelectedCity(slug);
    setSelectedDistrict("");
    setDistricts([]);
    setError(null);
    if (!slug) return;

    setLoadingDistricts(true);
    try {
      const data = await getDistricts(slug);
      setDistricts(data);
    } catch {
      setError("İlçeler yüklenemedi.");
    } finally {
      setLoadingDistricts(false);
    }
  }, []);

  const handleSubmit = () => {
    if (!selectedCity || !selectedDistrict) return;
    router.push(`/a/sonuc?city=${encodeURIComponent(selectedCity)}&district=${encodeURIComponent(selectedDistrict)}`);
  };

  const isReady = selectedCity && selectedDistrict;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-8"
      style={{ backgroundColor: "#ffffff" }}
    >
      {/* Title */}
      <h1
        className="font-extrabold text-black text-center leading-tight mb-3"
        style={{ fontSize: "clamp(36px, 9vw, 48px)" }}
      >
        EVİNİN DEĞERİNİ ÖĞREN
      </h1>

      {/* Subtitle */}
      <p
        className="text-gray-600 text-center mb-10"
        style={{ fontSize: "clamp(20px, 5vw, 24px)" }}
      >
        İl ve ilçe seç, hemen öğren!
      </p>

      {/* Form */}
      <div className="w-full" style={{ maxWidth: "500px" }}>
        {/* İl Seçimi */}
        <select
          id="city-select"
          aria-label="İl seçin"
          value={selectedCity}
          onChange={handleCityChange}
          disabled={loadingCities}
          className="w-full border-2 border-gray-300 rounded-xl text-black bg-white mb-5 appearance-none"
          style={{
            fontSize: "22px",
            padding: "18px 16px",
            minHeight: "60px",
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Cpath fill='%23666' d='M7 7l3 3 3-3'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 16px center",
            backgroundSize: "20px",
          }}
        >
          <option value="">{loadingCities ? "Yükleniyor..." : "İl Seçin"}</option>
          {cities.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>

        {/* İlçe Seçimi */}
        <select
          id="district-select"
          aria-label="İlçe seçin"
          value={selectedDistrict}
          onChange={(e) => setSelectedDistrict(e.target.value)}
          disabled={!selectedCity || loadingDistricts}
          className="w-full border-2 border-gray-300 rounded-xl text-black bg-white mb-8 appearance-none"
          style={{
            fontSize: "22px",
            padding: "18px 16px",
            minHeight: "60px",
            opacity: !selectedCity ? 0.5 : 1,
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 20 20'%3E%3Cpath fill='%23666' d='M7 7l3 3 3-3'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 16px center",
            backgroundSize: "20px",
          }}
        >
          <option value="">
            {loadingDistricts
              ? "Yükleniyor..."
              : !selectedCity
                ? "Önce il seçin"
                : "İlçe Seçin"}
          </option>
          {districts.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.name}
            </option>
          ))}
        </select>

        {/* DEV Yeşil Buton */}
        <button
          onClick={handleSubmit}
          disabled={!isReady}
          className="w-full rounded-2xl font-bold text-white transition-all active:scale-95"
          style={{
            fontSize: "28px",
            height: "80px",
            backgroundColor: isReady ? "#16a34a" : "#d1d5db",
            cursor: isReady ? "pointer" : "not-allowed",
            boxShadow: isReady ? "0 4px 14px rgba(22,163,74,0.4)" : "none",
          }}
        >
          DEĞERİNİ ÖĞREN
        </button>

        {error && (
          <p className="text-red-600 text-center mt-4" style={{ fontSize: "18px" }}>
            {error}
          </p>
        )}
      </div>

      {/* Footer */}
      <p className="text-gray-400 mt-10 text-center" style={{ fontSize: "16px" }}>
        Tamamen ücretsiz · Kayıt gerektirmez
      </p>

      <div className="mt-3 text-center" style={{ fontSize: "14px" }}>
        <a href="/" className="text-gray-400 underline">
          Detaylı versiyona geç →
        </a>
      </div>
    </div>
  );
}
