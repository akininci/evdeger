"use client";

import { useState, useCallback, useMemo, memo, useEffect, useRef } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { useRouter } from "next/navigation";
import { getCitySlugFromGeoJson, getGeoJsonNameFromSlug, formatPriceFull } from "@/lib/city-slug-map";
import { getCityAvgPrice, getDistrictsForCity, getDistrictAvgPrice } from "@/lib/mock-data";
import { formatTL } from "@/lib/api";

const GEO_URL = "/data/tr-cities.json";

/* ── Color scale: green (cheap) → yellow → orange → red (expensive) ── */
function getPriceColor(price: number, minPrice: number, maxPrice: number): string {
  const ratio = Math.max(0, Math.min(1, (price - minPrice) / (maxPrice - minPrice)));
  if (ratio < 0.25) {
    const t = ratio / 0.25;
    return `rgb(${Math.round(34 + t * 98)},${Math.round(197 + t * 7)},${Math.round(94 - t * 72)})`;
  } else if (ratio < 0.5) {
    const t = (ratio - 0.25) / 0.25;
    return `rgb(${Math.round(132 + t * 102)},${Math.round(204 - t * 25)},${Math.round(22 - t * 14)})`;
  } else if (ratio < 0.75) {
    const t = (ratio - 0.5) / 0.25;
    return `rgb(${Math.round(234 + t * 5)},${Math.round(179 - t * 111)},${Math.round(8 + t * 60)})`;
  } else {
    const t = (ratio - 0.75) / 0.25;
    return `rgb(${Math.round(239 - t * 19)},${Math.round(68 - t * 30)},${Math.round(68 - t * 30)})`;
  }
}

/* ── Types ── */
interface TooltipData {
  name: string;
  slug: string;
  price: number;
  x: number;
  y: number;
}

interface DistrictInfo {
  name: string;
  slug: string;
  price: number;
}

interface SelectedCity {
  name: string;
  slug: string;
  price: number;
  districts: DistrictInfo[];
}

/* ── All city slugs ── */
const ALL_CITY_SLUGS = [
  "istanbul","ankara","izmir","bursa","antalya","mugla","kocaeli","tekirdag",
  "aydin","canakkale","yalova","adana","konya","gaziantep","mersin","kayseri",
  "eskisehir","samsun","denizli","sakarya","trabzon","balikesir","diyarbakir",
  "manisa","edirne","hatay","malatya","erzurum","van","sanliurfa","ordu","rize",
  "bolu","duzce","isparta","kirklareli","adiyaman","afyonkarahisar","agri",
  "aksaray","amasya","artvin","bartin","batman","bayburt","bilecik","bingol",
  "bitlis","burdur","cankiri","corum","elazig","erzincan","giresun","gumushane",
  "hakkari","igdir","kahramanmaras","karabuk","karaman","kars","kastamonu",
  "kilis","kirikkale","kirsehir","kutahya","mardin","mus","nevsehir","nigde",
  "osmaniye","siirt","sinop","sirnak","sivas","tokat","tunceli","usak",
  "yozgat","zonguldak","ardahan",
];

/* ── Legend ── */
function MapLegend({ minPrice, maxPrice }: { minPrice: number; maxPrice: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mt-4 text-xs text-slate-500 dark:text-slate-400">
      <span>{formatPriceFull(minPrice)}/m²</span>
      <div className="flex h-3 w-32 sm:w-48 rounded-full overflow-hidden">
        <div className="flex-1" style={{ background: "rgb(34,197,94)" }} />
        <div className="flex-1" style={{ background: "rgb(132,204,22)" }} />
        <div className="flex-1" style={{ background: "rgb(234,179,8)" }} />
        <div className="flex-1" style={{ background: "rgb(239,68,68)" }} />
        <div className="flex-1" style={{ background: "rgb(220,38,38)" }} />
      </div>
      <span>{formatPriceFull(maxPrice)}/m²</span>
    </div>
  );
}

/* ── District Panel (appears when city is clicked) ── */
function DistrictPanel({
  city,
  onClose,
  onDistrictClick,
}: {
  city: SelectedCity;
  onClose: () => void;
  onDistrictClick: (citySlug: string, districtSlug: string) => void;
}) {
  const [search, setSearch] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  const filteredDistricts = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = city.districts.filter((d) =>
      !q || d.name.toLowerCase().includes(q)
    );
    return filtered.sort((a, b) => b.price - a.price);
  }, [city.districts, search]);

  const maxDistrictPrice = useMemo(
    () => Math.max(...city.districts.map((d) => d.price), 1),
    [city.districts]
  );

  useEffect(() => {
    panelRef.current?.scrollTo({ top: 0 });
  }, [city.slug]);

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-white/98 dark:bg-slate-900/98 backdrop-blur-sm rounded-2xl overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <div className="flex-none px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Haritaya Dön
          </button>
          <a
            href={`/${city.slug}`}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {city.name} Detay →
          </a>
        </div>
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              {city.name}
            </h3>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
              Ort. {formatTL(city.price)}/m²
            </p>
          </div>
        </div>
        {/* Search */}
        {city.districts.length > 8 && (
          <div className="mt-2 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              placeholder="İlçe ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
        )}
      </div>

      {/* District list */}
      <div ref={panelRef} className="flex-1 overflow-y-auto px-2 py-2">
        {filteredDistricts.length === 0 ? (
          <p className="text-center text-sm text-slate-400 py-8">Sonuç bulunamadı</p>
        ) : (
          <div className="space-y-1">
            {filteredDistricts.map((district) => {
              const barWidth = Math.max(8, (district.price / maxDistrictPrice) * 100);
              return (
                <button
                  key={district.slug}
                  onClick={() => onDistrictClick(city.slug, district.slug)}
                  className="w-full group flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                        {district.name}
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap ml-2">
                        {formatTL(district.price)}/m²
                      </span>
                    </div>
                    {/* Price bar */}
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${barWidth}%`,
                          background: getPriceColor(
                            district.price,
                            Math.min(...city.districts.map((d) => d.price)),
                            maxDistrictPrice
                          ),
                        }}
                      />
                    </div>
                  </div>
                  <svg className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors flex-none" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-none px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        <p className="text-[11px] text-slate-400 text-center">
          {filteredDistricts.length} ilçe · İlçeye tıklayarak detaylı fiyat bilgisi görün
        </p>
      </div>
    </div>
  );
}

/* ── Mobile Searchable City List ── */
function MobileCityList({
  priceMap,
  minPrice,
  maxPrice,
  onCitySelect,
}: {
  priceMap: Record<string, number>;
  minPrice: number;
  maxPrice: number;
  onCitySelect: (slug: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "price-asc" | "price-desc">("name");

  const cities = useMemo(() => {
    const list = ALL_CITY_SLUGS.map((slug) => {
      const geoName = getGeoJsonNameFromSlug(slug);
      return {
        slug,
        name: geoName || slug,
        price: priceMap[slug] || 0,
      };
    }).filter((c) => c.price > 0);

    const q = search.toLowerCase().trim();
    const filtered = q ? list.filter((c) => c.name.toLowerCase().includes(q)) : list;

    if (sortBy === "price-desc") return filtered.sort((a, b) => b.price - a.price);
    if (sortBy === "price-asc") return filtered.sort((a, b) => a.price - b.price);
    return filtered.sort((a, b) => a.name.localeCompare(b.name, "tr"));
  }, [search, sortBy, priceMap]);

  return (
    <div className="sm:hidden mt-4">
      {/* Search & Sort */}
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="Şehir ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          className="px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        >
          <option value="name">A-Z</option>
          <option value="price-desc">Pahalı → Ucuz</option>
          <option value="price-asc">Ucuz → Pahalı</option>
        </select>
      </div>

      {/* City List */}
      <div className="space-y-1 max-h-[400px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        {cities.map((city) => (
          <button
            key={city.slug}
            onClick={() => onCitySelect(city.slug)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-b-0"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full flex-none"
                style={{ background: getPriceColor(city.price, minPrice, maxPrice) }}
              />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {city.name}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {formatTL(city.price)}/m²
              </span>
              <svg className="h-4 w-4 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </div>
          </button>
        ))}
        {cities.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">Sonuç bulunamadı</p>
        )}
      </div>

      <MapLegend minPrice={minPrice} maxPrice={maxPrice} />
    </div>
  );
}

/* ── Mobile District Panel ── */
function MobileDistrictPanel({
  city,
  onClose,
  onDistrictClick,
}: {
  city: SelectedCity;
  onClose: () => void;
  onDistrictClick: (citySlug: string, districtSlug: string) => void;
}) {
  const [search, setSearch] = useState("");

  const filteredDistricts = useMemo(() => {
    const q = search.toLowerCase().trim();
    const filtered = city.districts.filter((d) =>
      !q || d.name.toLowerCase().includes(q)
    );
    return filtered.sort((a, b) => b.price - a.price);
  }, [city.districts, search]);

  const maxDistrictPrice = useMemo(
    () => Math.max(...city.districts.map((d) => d.price), 1),
    [city.districts]
  );

  return (
    <div className="sm:hidden mt-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={onClose}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          Geri
        </button>
        <a
          href={`/${city.slug}`}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          {city.name} Detay →
        </a>
      </div>

      <div className="mb-3">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">
          {city.name} İlçeleri
        </h3>
        <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold">
          Ortalama {formatTL(city.price)}/m²
        </p>
      </div>

      {/* Search */}
      {city.districts.length > 8 && (
        <div className="relative mb-3">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            placeholder="İlçe ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          />
        </div>
      )}

      {/* District List */}
      <div className="space-y-1 max-h-[400px] overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        {filteredDistricts.map((district) => {
          const barWidth = Math.max(8, (district.price / maxDistrictPrice) * 100);
          return (
            <button
              key={district.slug}
              onClick={() => onDistrictClick(city.slug, district.slug)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-b-0 text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                    {district.name}
                  </span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap ml-2">
                    {formatTL(district.price)}/m²
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${barWidth}%`,
                      background: getPriceColor(
                        district.price,
                        Math.min(...city.districts.map((d) => d.price)),
                        maxDistrictPrice
                      ),
                    }}
                  />
                </div>
              </div>
              <svg className="h-4 w-4 text-slate-300 flex-none" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          );
        })}
        {filteredDistricts.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">Sonuç bulunamadı</p>
        )}
      </div>

      <p className="text-[11px] text-slate-400 text-center mt-2">
        {filteredDistricts.length} ilçe · İlçeye tıklayarak detaylı fiyat bilgisi görün
      </p>
    </div>
  );
}

/* ── Skeleton Loader ── */
function MapSkeleton() {
  return (
    <div className="relative w-full aspect-[2/1] sm:aspect-[2.2/1] rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden animate-pulse">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-12 w-12 text-slate-300 dark:text-slate-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498 4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 0 0-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0Z" />
          </svg>
          <span className="text-sm text-slate-400 dark:text-slate-500">Harita yükleniyor…</span>
        </div>
      </div>
      <div className="absolute top-[30%] left-[15%] w-[70%] h-[40%] bg-slate-200 dark:bg-slate-700 rounded-[40%] opacity-50" />
    </div>
  );
}

/* ── Main Map Component ── */
const TurkeyMap = memo(function TurkeyMap() {
  const router = useRouter();
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<SelectedCity | null>(null);

  // Precompute price range for color scaling
  const { priceMap, minPrice, maxPrice } = useMemo(() => {
    const map: Record<string, number> = {};
    let min = Infinity;
    let max = -Infinity;
    for (const slug of ALL_CITY_SLUGS) {
      const price = getCityAvgPrice(slug);
      if (price > 0) {
        map[slug] = price;
        if (price < min) min = price;
        if (price > max) max = price;
      }
    }
    return { priceMap: map, minPrice: min, maxPrice: max };
  }, []);

  const handleCitySelect = useCallback(
    (slug: string, geoName?: string) => {
      const price = getCityAvgPrice(slug);
      const districts = getDistrictsForCity(slug);
      const districtInfos: DistrictInfo[] = districts.map((d) => ({
        name: d.name,
        slug: d.slug,
        price: getDistrictAvgPrice(slug, d.slug),
      }));
      
      const name = geoName || getGeoJsonNameFromSlug(slug) || slug;
      setSelectedCity({
        name,
        slug,
        price,
        districts: districtInfos,
      });
    },
    []
  );

  const handleMapClick = useCallback(
    (geoName: string) => {
      const slug = getCitySlugFromGeoJson(geoName);
      if (slug) {
        handleCitySelect(slug, geoName);
      }
    },
    [handleCitySelect]
  );

  const handleDistrictClick = useCallback(
    (citySlug: string, districtSlug: string) => {
      router.push(`/${citySlug}/${districtSlug}`);
    },
    [router]
  );

  const handleClosePanel = useCallback(() => {
    setSelectedCity(null);
  }, []);

  const handleMouseEnter = useCallback(
    (geo: { properties: { name: string } }, evt: React.MouseEvent) => {
      const geoName = geo.properties.name;
      const slug = getCitySlugFromGeoJson(geoName);
      if (!slug) return;
      const price = priceMap[slug] || 0;
      setHoveredSlug(slug);
      setTooltip({
        name: geoName,
        slug,
        price,
        x: evt.clientX,
        y: evt.clientY,
      });
    },
    [priceMap]
  );

  const handleMouseMove = useCallback(
    (evt: React.MouseEvent) => {
      if (tooltip) {
        setTooltip((prev) => prev ? { ...prev, x: evt.clientX, y: evt.clientY } : null);
      }
    },
    [tooltip]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredSlug(null);
    setTooltip(null);
  }, []);

  return (
    <div className="relative w-full">
      {/* ═══ Desktop: Map + District Panel ═══ */}
      <div className="hidden sm:block">
        {!isLoaded && <MapSkeleton />}
        <div className={isLoaded ? "block" : "hidden"}>
          <div className="relative">
            {/* Map */}
            <div
              className={`relative w-full aspect-[2/1] sm:aspect-[2.2/1] transition-all duration-300 ${
                selectedCity ? "opacity-30 pointer-events-none blur-[1px]" : ""
              }`}
              onMouseMove={handleMouseMove}
            >
              <ComposableMap
                projection="geoMercator"
                projectionConfig={{
                  center: [35.5, 39],
                  scale: 2800,
                }}
                width={800}
                height={380}
                style={{ width: "100%", height: "100%" }}
              >
                <ZoomableGroup
                  center={[35.5, 39]}
                  zoom={1}
                  minZoom={1}
                  maxZoom={6}
                >
                  <Geographies geography={GEO_URL} onError={() => setIsLoaded(true)}>
                    {({ geographies }) => {
                      if (!isLoaded && geographies.length > 0) {
                        setTimeout(() => setIsLoaded(true), 0);
                      }
                      return geographies.map((geo) => {
                        const geoName = geo.properties.name as string;
                        const slug = getCitySlugFromGeoJson(geoName);
                        const price = slug ? priceMap[slug] || 0 : 0;
                        const fill = price > 0
                          ? getPriceColor(price, minPrice, maxPrice)
                          : "#e2e8f0";
                        const isHovered = slug === hoveredSlug;
                        const isSelected = slug === selectedCity?.slug;

                        return (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            onClick={() => handleMapClick(geoName)}
                            onMouseEnter={(evt) => handleMouseEnter(geo, evt as unknown as React.MouseEvent)}
                            onMouseLeave={handleMouseLeave}
                            style={{
                              default: {
                                fill: isSelected ? "#3b82f6" : isHovered ? "#60a5fa" : fill,
                                stroke: "#1e293b",
                                strokeWidth: isSelected ? 1.5 : 0.5,
                                outline: "none",
                                cursor: "pointer",
                                transition: "fill 0.2s ease",
                              },
                              hover: {
                                fill: "#3b82f6",
                                stroke: "#1e293b",
                                strokeWidth: 1,
                                outline: "none",
                                cursor: "pointer",
                              },
                              pressed: {
                                fill: "#2563eb",
                                stroke: "#1e293b",
                                strokeWidth: 1,
                                outline: "none",
                              },
                            }}
                          />
                        );
                      });
                    }}
                  </Geographies>
                </ZoomableGroup>
              </ComposableMap>
            </div>

            {/* Tooltip (only when no city is selected) */}
            {tooltip && !selectedCity && (
              <div
                className="fixed z-50 pointer-events-none px-4 py-3 rounded-xl bg-slate-900/95 dark:bg-slate-800/95 text-white shadow-xl backdrop-blur-sm border border-white/10 transition-opacity duration-150"
                style={{
                  left: tooltip.x + 12,
                  top: tooltip.y - 60,
                  transform: "translateX(-50%)",
                }}
              >
                <p className="font-bold text-sm">{tooltip.name}</p>
                <p className="text-emerald-400 text-lg font-bold">
                  {formatPriceFull(tooltip.price)}<span className="text-xs font-normal text-white/60">/m²</span>
                </p>
                <p className="text-[10px] text-white/40 mt-1">Tıkla → İlçe fiyatlarını gör</p>
              </div>
            )}

            {/* District Panel Overlay */}
            {selectedCity && (
              <DistrictPanel
                city={selectedCity}
                onClose={handleClosePanel}
                onDistrictClick={handleDistrictClick}
              />
            )}
          </div>

          {!selectedCity && <MapLegend minPrice={minPrice} maxPrice={maxPrice} />}
        </div>
      </div>

      {/* ═══ Mobile: Searchable List ═══ */}
      {!selectedCity ? (
        <MobileCityList
          priceMap={priceMap}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onCitySelect={(slug) => handleCitySelect(slug)}
        />
      ) : (
        <MobileDistrictPanel
          city={selectedCity}
          onClose={handleClosePanel}
          onDistrictClick={handleDistrictClick}
        />
      )}
    </div>
  );
});

export default TurkeyMap;
