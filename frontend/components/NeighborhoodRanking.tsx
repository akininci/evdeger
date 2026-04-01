"use client";

import { useEffect, useState } from "react";
import { formatTL } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface NeighborhoodData {
  neighborhood: string;
  listing_count: number;
  avg_price_per_sqm: number | null;
  avg_price: number | null;
  avg_sqm: number | null;
  avg_rent_per_sqm?: number | null;
  avg_rent?: number | null;
  gross_yield?: number | null;
  selected?: boolean;
}

export default function NeighborhoodRanking({
  city,
  district,
  neighborhood,
}: {
  city: string;
  district: string;
  neighborhood: string;
}) {
  const [data, setData] = useState<NeighborhoodData[]>([]);
  const [districtAvg, setDistrictAvg] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `${API_URL}/api/compare?city=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}&neighborhood=${encodeURIComponent(neighborhood)}`
        );
        if (!res.ok) return;
        const json = await res.json();
        setData(json.neighborhoods || []);
        setDistrictAvg(json.district_avg_price_per_sqm || 0);
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [city, district, neighborhood]);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6 animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-48 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-slate-800 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (!data.length) return null;

  const maxPrice = Math.max(...data.map((n) => n.avg_price_per_sqm || 0));

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          📊 {district} İlçesindeki Mahalleler
        </h3>
        <span className="text-xs text-slate-500">
          İlçe ort: {formatTL(districtAvg)}/m²
        </span>
      </div>

      <div className="space-y-2">
        {data.map((n, idx) => {
          const pct = maxPrice > 0 ? ((n.avg_price_per_sqm || 0) / maxPrice) * 100 : 0;
          const isSelected = n.selected;

          return (
            <div
              key={`${n.neighborhood}-${idx}`}
              className={`relative rounded-lg p-3 transition-colors ${
                isSelected
                  ? "bg-emerald-500/10 border border-emerald-500/30"
                  : "bg-slate-800/50 hover:bg-slate-800"
              }`}
            >
              {/* Bar background */}
              <div
                className={`absolute inset-0 rounded-lg opacity-10 ${
                  isSelected ? "bg-emerald-400" : "bg-slate-600"
                }`}
                style={{ width: `${pct}%` }}
              />

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 w-5">#{idx + 1}</span>
                  <span className={`text-sm font-medium ${isSelected ? "text-emerald-400" : "text-white"}`}>
                    {n.neighborhood}
                    {isSelected && (
                      <span className="ml-2 text-xs px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">
                        seçili
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-sm font-bold text-white">
                      {formatTL(n.avg_price_per_sqm || 0)}/m²
                    </p>
                    <p className="text-xs text-slate-500">{n.listing_count} ilan</p>
                  </div>
                  {n.gross_yield && (
                    <div className="hidden sm:block">
                      <p className="text-xs text-slate-400">Kira Getirisi</p>
                      <p className={`text-sm font-semibold ${
                        n.gross_yield >= 7 ? "text-emerald-400" : n.gross_yield >= 5 ? "text-yellow-400" : "text-red-400"
                      }`}>
                        %{n.gross_yield}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
