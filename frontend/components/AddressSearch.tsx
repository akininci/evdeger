"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

interface LocationResult {
  city: string;
  district: string;
  neighborhood: string;
  display: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function AddressSearch() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationResult[]>([]);
  const [selected, setSelected] = useState<LocationResult | null>(null);
  const [sqm, setSqm] = useState("");
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [showDetailForm, setShowDetailForm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>(undefined);

  // Debounced search
  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/search/locations?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
        setShowResults(true);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!selected) {
      debounceRef.current = setTimeout(() => search(query), 300);
    }
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, search, selected]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (item: LocationResult) => {
    setSelected(item);
    setQuery(item.display);
    setShowResults(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
    } else if (e.key === "Escape") {
      setShowResults(false);
    }
  };

  const handleSubmit = () => {
    if (!selected) return;
    const params = new URLSearchParams({
      city: selected.city,
      district: selected.district,
      neighborhood: selected.neighborhood,
    });
    if (sqm) params.set("sqm", sqm);
    router.push(`/sonuc?${params.toString()}`);
  };

  const handleInputChange = (val: string) => {
    setQuery(val);
    if (selected) {
      setSelected(null);
    }
    setActiveIndex(-1);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Main Search */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative flex items-center">
          {/* Search Icon */}
          <div className="absolute left-4 text-muted-foreground pointer-events-none">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => results.length > 0 && setShowResults(true)}
            placeholder="Adresinizi yazın... (örn: Kadıköy Caferağa)"
            className="w-full pl-12 pr-4 py-4 text-lg rounded-2xl border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all shadow-lg"
            autoComplete="off"
          />
          {loading && (
            <div className="absolute right-4">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Dropdown Results */}
        {showResults && results.length > 0 && (
          <div className="absolute z-50 w-full mt-2 bg-background border border-border rounded-xl shadow-2xl overflow-hidden">
            {results.map((item, i) => (
              <button
                key={`${item.city}-${item.district}-${item.neighborhood}`}
                onClick={() => handleSelect(item)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                  i === activeIndex
                    ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300"
                    : "hover:bg-muted"
                }`}
              >
                <span className="text-lg flex-shrink-0">📍</span>
                <div>
                  <div className="font-medium text-foreground">{item.neighborhood}</div>
                  <div className="text-sm text-muted-foreground">{item.district}, {item.city}</div>
                </div>
              </button>
            ))}
          </div>
        )}

        {showResults && results.length === 0 && query.length >= 2 && !loading && (
          <div className="absolute z-50 w-full mt-2 bg-background border border-border rounded-xl shadow-2xl p-4 text-center text-muted-foreground">
            Sonuç bulunamadı. Farklı bir arama deneyin.
          </div>
        )}
      </div>

      {/* Selected → m² input + Submit */}
      {selected && (
        <div className="mt-4 flex flex-col sm:flex-row gap-3 animate-fade-in">
          <div className="flex-1">
            <input
              type="number"
              value={sqm}
              onChange={e => setSqm(e.target.value)}
              placeholder="m² (opsiyonel, varsayılan: bölge ortalaması)"
              className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all"
            />
          </div>
          <button
            onClick={handleSubmit}
            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            🏠 Değerle
          </button>
        </div>
      )}

      {/* Fallback link */}
      <div className="mt-3 text-center">
        <button
          onClick={() => setShowDetailForm(!showDetailForm)}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
        >
          {showDetailForm ? "↑ Arama kutusunu kullan" : "Detaylı seçim (il/ilçe/mahalle)"}
        </button>
      </div>
    </div>
  );
}
