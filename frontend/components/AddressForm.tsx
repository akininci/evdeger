"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getCities, getDistricts, getNeighborhoods } from "@/lib/api";
import type { City, District, Neighborhood } from "@/lib/api";
import { mockCities, mockDistricts, mockNeighborhoods } from "@/lib/mock-data";

const USE_MOCK = !process.env.NEXT_PUBLIC_API_URL;

interface AddressFormProps {
  variant?: "hero" | "default";
}

export function AddressForm({ variant = "default" }: AddressFormProps) {
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
  const [error, setError] = useState<string | null>(null);

  const isHero = variant === "hero";

  // Load cities on mount
  useEffect(() => {
    async function loadCities() {
      try {
        if (USE_MOCK) {
          setCities(mockCities);
        } else {
          const data = await getCities();
          setCities(data);
        }
      } catch {
        setError("Şehirler yüklenemedi. Lütfen tekrar deneyin.");
      } finally {
        setLoadingCities(false);
      }
    }
    loadCities();
  }, []);

  // Load districts when city changes
  const handleCityChange = useCallback(async (citySlug: string | null) => {
    const slug = citySlug || "";
    setSelectedCity(slug);
    setSelectedDistrict("");
    setSelectedNeighborhood("");
    setDistricts([]);
    setNeighborhoods([]);
    setError(null);

    if (!slug) return;

    setLoadingDistricts(true);
    try {
      if (USE_MOCK) {
        setDistricts(mockDistricts[slug] || []);
      } else {
        const data = await getDistricts(slug);
        setDistricts(data);
      }
    } catch {
      setError("İlçeler yüklenemedi.");
    } finally {
      setLoadingDistricts(false);
    }
  }, []);

  // Load neighborhoods when district changes
  const handleDistrictChange = useCallback(async (districtSlug: string | null) => {
    const dSlug = districtSlug || "";
    setSelectedDistrict(dSlug);
    setSelectedNeighborhood("");
    setNeighborhoods([]);
    setError(null);

    if (!dSlug || !selectedCity) return;

    setLoadingNeighborhoods(true);
    try {
      if (USE_MOCK) {
        setNeighborhoods(mockNeighborhoods[dSlug] || []);
      } else {
        const data = await getNeighborhoods(selectedCity, dSlug);
        setNeighborhoods(data);
      }
    } catch {
      setError("Mahalleler yüklenemedi.");
    } finally {
      setLoadingNeighborhoods(false);
    }
  }, [selectedCity]);

  const handleSubmit = () => {
    if (!selectedCity || !selectedDistrict || !selectedNeighborhood) return;
    let url = `/sonuc?city=${encodeURIComponent(selectedCity)}&district=${encodeURIComponent(selectedDistrict)}&neighborhood=${encodeURIComponent(selectedNeighborhood)}`;
    if (squareMeters) {
      url += `&m2=${encodeURIComponent(squareMeters)}`;
    }
    router.push(url);
  };

  const isReady = selectedCity && selectedDistrict && selectedNeighborhood;

  // Hero variant: dark-themed selects with glassmorphism
  const selectTriggerClass = isHero
    ? "flex-1 h-12 bg-white/15 border-white/30 text-white text-base placeholder:text-white/50 hover:bg-white/20 focus:bg-white/20 focus:border-white/50 transition-colors [&>span]:text-white/60 data-[state=open]:border-white/40"
    : "flex-1 h-12 bg-white dark:bg-muted border-border text-base";

  const inputClass = isHero
    ? "h-12 bg-white/15 border-white/30 text-white placeholder:text-white/50 hover:bg-white/20 focus:bg-white/20 focus-visible:border-white/50 focus-visible:ring-white/30 transition-colors"
    : "h-12 bg-white dark:bg-muted border-border";

  return (
    <div className="w-full max-w-3xl mx-auto">
      {isHero && (
        <p id="address-form-hint" className="text-sm text-white/50 mb-4 text-center">
          Adresini seç, anında sonucunu gör
        </p>
      )}

      <fieldset>
        <legend className="sr-only">Adres Bilgileri</legend>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* İl */}
        <Select
          value={selectedCity}
          onValueChange={handleCityChange}
          disabled={loadingCities}
        >
          <SelectTrigger
            className={selectTriggerClass}
            aria-label="İl seçin"
            aria-describedby={isHero ? "address-form-hint" : undefined}
          >
            <SelectValue placeholder={loadingCities ? "Yükleniyor..." : "İl seçin"} />
          </SelectTrigger>
          <SelectContent>
            {cities.map((city) => (
              <SelectItem key={city.slug} value={city.slug}>
                {city.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* İlçe */}
        <Select
          value={selectedDistrict}
          onValueChange={handleDistrictChange}
          disabled={!selectedCity || loadingDistricts}
        >
          <SelectTrigger
            className={selectTriggerClass}
            aria-label="İlçe seçin"
          >
            <SelectValue
              placeholder={
                loadingDistricts
                  ? "Yükleniyor..."
                  : !selectedCity
                    ? "Önce il seçin"
                    : "İlçe seçin"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {districts.map((d) => (
              <SelectItem key={d.slug} value={d.slug}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Mahalle */}
        <Select
          value={selectedNeighborhood}
          onValueChange={(v) => setSelectedNeighborhood(v || "")}
          disabled={!selectedDistrict || loadingNeighborhoods}
        >
          <SelectTrigger
            className={selectTriggerClass}
            aria-label="Mahalle seçin"
          >
            <SelectValue
              placeholder={
                loadingNeighborhoods
                  ? "Yükleniyor..."
                  : !selectedDistrict
                    ? "Önce ilçe seçin"
                    : "Mahalle seçin"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {neighborhoods.map((n) => (
              <SelectItem key={n.slug} value={n.slug}>
                {n.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* m² input (optional) + submit */}
      <div className="mt-3 flex flex-col sm:flex-row gap-3">
        <Input
          type="number"
          min={10}
          max={10000}
          placeholder="m² (isteğe bağlı)"
          value={squareMeters}
          onChange={(e) => setSquareMeters(e.target.value)}
          className={`sm:w-44 ${inputClass}`}
          aria-label="Metrekare"
        />
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={!isReady}
          className={`flex-1 h-12 text-lg font-semibold transition-all ${
            isHero
              ? "bg-emerald-500 hover:bg-emerald-400 text-white shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 disabled:opacity-40 disabled:shadow-none"
              : "bg-brand-green hover:bg-brand-green-dark text-white shadow-lg shadow-brand-green/25 hover:shadow-xl hover:shadow-brand-green/30 disabled:opacity-50 disabled:shadow-none"
          }`}
        >
          🔍 Değerini Öğren
        </Button>
      </div>

      </fieldset>
      {error && (
        <p className={`mt-3 text-sm text-center ${isHero ? "text-red-300" : "text-destructive"}`} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
