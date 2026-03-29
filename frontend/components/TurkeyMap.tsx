"use client";

import { useState, useCallback, useMemo, memo, useEffect } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { useRouter } from "next/navigation";
import { getCitySlugFromGeoJson, formatPriceFull } from "@/lib/city-slug-map";
import { getCityAvgPrice, getCityBySlug } from "@/lib/mock-data";

const GEO_URL = "/data/tr-cities.json";

/* ── Color scale: green (cheap) → yellow → orange → red (expensive) ── */
function getPriceColor(price: number, minPrice: number, maxPrice: number): string {
  const ratio = Math.max(0, Math.min(1, (price - minPrice) / (maxPrice - minPrice)));

  // Green → Yellow → Orange → Red gradient
  if (ratio < 0.25) {
    // Green to Light Green
    const t = ratio / 0.25;
    const r = Math.round(34 + t * (132 - 34));
    const g = Math.round(197 + t * (204 - 197));
    const b = Math.round(94 + t * (22 - 94));
    return `rgb(${r},${g},${b})`;
  } else if (ratio < 0.5) {
    // Light Green to Yellow
    const t = (ratio - 0.25) / 0.25;
    const r = Math.round(132 + t * (234 - 132));
    const g = Math.round(204 + t * (179 - 204));
    const b = Math.round(22 + t * (8 - 22));
    return `rgb(${r},${g},${b})`;
  } else if (ratio < 0.75) {
    // Yellow to Orange
    const t = (ratio - 0.5) / 0.25;
    const r = Math.round(234 + t * (239 - 234));
    const g = Math.round(179 + t * (68 - 179));
    const b = Math.round(8 + t * (68 - 8));
    return `rgb(${r},${g},${b})`;
  } else {
    // Orange to Red
    const t = (ratio - 0.75) / 0.25;
    const r = Math.round(239 + t * (220 - 239));
    const g = Math.round(68 + t * (38 - 68));
    const b = Math.round(68 + t * (38 - 68));
    return `rgb(${r},${g},${b})`;
  }
}

/* ── Tooltip ── */
interface TooltipData {
  name: string;
  slug: string;
  price: number;
  x: number;
  y: number;
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
      {/* Fake Turkey silhouette shapes */}
      <div className="absolute top-[30%] left-[15%] w-[70%] h-[40%] bg-slate-200 dark:bg-slate-700 rounded-[40%] opacity-50" />
    </div>
  );
}

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

/* ── Main Map Component ── */
const TurkeyMap = memo(function TurkeyMap() {
  const router = useRouter();
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);

  // Precompute price range for color scaling
  const { priceMap, minPrice, maxPrice } = useMemo(() => {
    const map: Record<string, number> = {};
    let min = Infinity;
    let max = -Infinity;
    // Get all city prices
    const slugs = [
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
    for (const slug of slugs) {
      const price = getCityAvgPrice(slug);
      if (price > 0) {
        map[slug] = price;
        if (price < min) min = price;
        if (price > max) max = price;
      }
    }
    return { priceMap: map, minPrice: min, maxPrice: max };
  }, []);

  const handleClick = useCallback(
    (geoName: string) => {
      const slug = getCitySlugFromGeoJson(geoName);
      if (slug) {
        router.push(`/${slug}`);
      }
    },
    [router]
  );

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
      {!isLoaded && <MapSkeleton />}
      <div className={isLoaded ? "block" : "hidden"}>
        <div
          className="relative w-full aspect-[2/1] sm:aspect-[2.2/1]"
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
                  // Set loaded after first render
                  if (!isLoaded && geographies.length > 0) {
                    // Use setTimeout to avoid setState during render
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

                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        onClick={() => handleClick(geoName)}
                        onMouseEnter={(evt) => handleMouseEnter(geo, evt as unknown as React.MouseEvent)}
                        onMouseLeave={handleMouseLeave}
                        style={{
                          default: {
                            fill: isHovered ? "#3b82f6" : fill,
                            stroke: "#ffffff",
                            strokeWidth: 0.5,
                            outline: "none",
                            cursor: "pointer",
                            transition: "fill 0.2s ease",
                          },
                          hover: {
                            fill: "#3b82f6",
                            stroke: "#ffffff",
                            strokeWidth: 1,
                            outline: "none",
                            cursor: "pointer",
                          },
                          pressed: {
                            fill: "#2563eb",
                            stroke: "#ffffff",
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

        {/* Tooltip */}
        {tooltip && (
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
            <p className="text-[10px] text-white/40 mt-1">Tıkla → Detaylı bilgi</p>
          </div>
        )}

        {/* Legend */}
        <MapLegend minPrice={minPrice} maxPrice={maxPrice} />

        {/* Zoom hint for mobile */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-2 sm:hidden">
          🔍 Yakınlaştırmak için çift dokun veya sıkıştır
        </p>
      </div>
    </div>
  );
});

export default TurkeyMap;
