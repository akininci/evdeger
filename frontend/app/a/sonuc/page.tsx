"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { formatTL } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface SimpleResult {
  estimatedValue: number;
  estimatedRent: number;
  cityName: string;
  districtName: string;
}

function SonucContent() {
  const searchParams = useSearchParams();
  const city = searchParams.get("city") || "";
  const district = searchParams.get("district") || "";

  const [data, setData] = useState<SimpleResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!city || !district) {
      setError("Eksik bilgi. Lütfen tekrar deneyin.");
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        // Try to get neighborhoods and pick first one for valuation
        const nRes = await fetch(
          `${API_URL}/api/locations/neighborhoods?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}`
        );
        if (!nRes.ok) throw new Error("Veri yüklenemedi");
        const neighborhoods = await nRes.json();

        if (!neighborhoods || neighborhoods.length === 0) {
          throw new Error("Bu ilçede veri bulunamadı");
        }

        // Get valuation for first neighborhood as district representative
        const firstNeighborhood = neighborhoods[0].slug;
        const vRes = await fetch(
          `${API_URL}/api/valuation?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}&neighborhood=${encodeURIComponent(firstNeighborhood)}`
        );
        if (!vRes.ok) throw new Error("Değerleme yapılamadı");
        const valuation = await vRes.json();

        // Format city/district names nicely
        const capitalize = (s: string) =>
          s.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

        setData({
          estimatedValue: valuation.estimated_value_mid || valuation.estimated_value_avg || 0,
          estimatedRent: valuation.estimated_rent_mid || valuation.estimated_rent_avg || 0,
          cityName: valuation.city || capitalize(city),
          districtName: valuation.district || capitalize(district),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Bir hata oluştu.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [city, district]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-5"
        style={{ backgroundColor: "#ffffff" }}
      >
        <div
          className="rounded-full border-4 border-gray-200 mb-6"
          style={{
            width: "64px",
            height: "64px",
            borderTopColor: "#16a34a",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <p className="text-black font-bold" style={{ fontSize: "28px" }}>
          Hesaplanıyor...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-5"
        style={{ backgroundColor: "#ffffff" }}
      >
        <p className="text-black font-bold text-center mb-6" style={{ fontSize: "24px" }}>
          {error || "Bir hata oluştu"}
        </p>
        <a
          href="/a"
          className="rounded-2xl font-bold text-white inline-block text-center"
          style={{
            fontSize: "22px",
            padding: "18px 40px",
            backgroundColor: "#16a34a",
          }}
        >
          Tekrar Dene
        </a>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-8"
      style={{ backgroundColor: "#ffffff" }}
    >
      {/* Location */}
      <p className="text-gray-500 mb-6" style={{ fontSize: "22px" }}>
        {data.districtName}, {data.cityName}
      </p>

      {/* Sale Value - DEV rakam */}
      <p className="text-gray-700 mb-1" style={{ fontSize: "20px" }}>
        Tahmini Değer
      </p>
      <p
        className="font-extrabold text-center mb-8"
        style={{
          fontSize: "clamp(40px, 10vw, 56px)",
          color: "#16a34a",
          lineHeight: 1.1,
        }}
      >
        {formatTL(data.estimatedValue)}
      </p>

      {/* Rent Value */}
      <p className="text-gray-700 mb-1" style={{ fontSize: "20px" }}>
        Aylık Kira Tahmini
      </p>
      <p
        className="font-bold text-center mb-10"
        style={{
          fontSize: "clamp(32px, 8vw, 44px)",
          color: "#2563eb",
          lineHeight: 1.1,
        }}
      >
        {formatTL(data.estimatedRent)}
      </p>

      {/* YENİDEN HESAPLA butonu */}
      <a
        href="/a"
        className="rounded-2xl font-bold text-white text-center block active:scale-95 transition-transform"
        style={{
          fontSize: "26px",
          height: "72px",
          lineHeight: "72px",
          backgroundColor: "#16a34a",
          width: "100%",
          maxWidth: "500px",
          boxShadow: "0 4px 14px rgba(22,163,74,0.4)",
        }}
      >
        YENİDEN HESAPLA
      </a>

      {/* Disclaimer */}
      <p className="text-gray-400 mt-8 text-center" style={{ fontSize: "14px", maxWidth: "400px" }}>
        Bu değerleme tahminidir. Kesin değer için ekspertiz raporu alınız.
      </p>
    </div>
  );
}

export default function EvDegerASonucPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex flex-col items-center justify-center"
          style={{ backgroundColor: "#ffffff" }}
        >
          <p className="text-black font-bold" style={{ fontSize: "28px" }}>
            Yükleniyor...
          </p>
        </div>
      }
    >
      <SonucContent />
    </Suspense>
  );
}
