"use client";

import { useState, useEffect, useRef } from "react";
import { MapPin, Search, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface SearchResult {
  display: string;
  city: string;
  district: string;
  neighborhood: string;
  street?: string;
  source: "backend" | "nominatim";
}

export function FullAddressAutocomplete() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const merged: SearchResult[] = [];

        // 1. Backend search (city/district/neighborhood — our own data)
        try {
          const backendRes = await fetch(`${API_URL}/api/search/locations?q=${encodeURIComponent(query)}`);
          if (backendRes.ok) {
            const data = await backendRes.json();
            for (const item of data.slice(0, 5)) {
              merged.push({
                display: item.display,
                city: item.city || "",
                district: item.district || "",
                neighborhood: item.neighborhood || "",
                source: "backend",
              });
            }
          }
        } catch {}

        // 2. Nominatim (street-level — OpenStreetMap)
        if (query.length >= 4) {
          try {
            const nomRes = await fetch(
              `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=tr&accept-language=tr`,
              { headers: { "User-Agent": "EvDeger/1.0" } }
            );
            if (nomRes.ok) {
              const nomData = await nomRes.json();
              for (const nr of nomData) {
                const addr = nr.address || {};
                const street = addr.road || "";
                const suburb = (addr.suburb || "").replace(" Mahallesi", "").replace(" mahallesi", "");
                const district = addr.town || addr.city || addr.county || "";
                
                // Resolve city from backend if we have a district
                let city = addr.province || addr.state || "";
                if ((!city || city.includes("Bölgesi") || city.includes("Region")) && district) {
                  // Look up in merged results or use district name
                  const existing = merged.find(m => m.district.toLowerCase() === district.toLowerCase());
                  if (existing) {
                    city = existing.city;
                  }
                }

                // Skip if it duplicates a backend result
                const isDup = merged.some(m => 
                  m.district === district && m.neighborhood === suburb && !street
                );
                if (!isDup && (street || suburb)) {
                  merged.push({
                    display: nr.display_name,
                    city,
                    district,
                    neighborhood: suburb,
                    street,
                    source: "nominatim",
                  });
                }
              }
            }
          } catch {}
        }

        setResults(merged);
        setIsOpen(merged.length > 0);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 500);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    setQuery(result.display);
    setIsOpen(false);
    router.push(
      `/sonuc?city=${encodeURIComponent(result.city)}&district=${encodeURIComponent(result.district)}&neighborhood=${encodeURIComponent(result.neighborhood)}&property_type=daire`
    );
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Tam adresinizi yazın... (örn: 120 Sokak Esenyalı Karabağlar)"
          className="w-full pl-12 pr-12 py-4 text-lg border-2 border-white/30 rounded-xl bg-white/90 backdrop-blur-sm focus:border-emerald-500 focus:outline-none focus:bg-white transition-all placeholder:text-gray-400"
        />
        {loading ? (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 animate-spin" />
        ) : (
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-80 overflow-auto">
          {results.map((result, idx) => (
            <button
              key={idx}
              onClick={() => handleSelect(result)}
              className="w-full px-4 py-3 text-left hover:bg-emerald-50 border-b last:border-0 transition-colors flex items-start gap-3"
            >
              <MapPin className="h-4 w-4 text-emerald-500 mt-1 flex-shrink-0" />
              <div className="min-w-0">
                <div className="font-medium text-gray-900">
                  {result.street || result.neighborhood || result.district}
                </div>
                <div className="text-sm text-gray-500 truncate">
                  {result.street 
                    ? `${result.neighborhood ? result.neighborhood + ", " : ""}${result.district}, ${result.city}`
                    : result.display}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
