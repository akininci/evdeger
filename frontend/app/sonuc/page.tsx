"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import { StatCard } from "@/components/StatCard";
import { TrendChart } from "@/components/TrendChart";
import { EmailSignupForm } from "@/components/EmailSignupForm";
import { EmailModal } from "@/components/EmailModal";
import { PriceTrendSection } from "@/components/PriceTrendSection";
import { DetailForm } from "@/components/DetailForm";
import { SimilarListings } from "@/components/SimilarListings";
import { NearbyListings } from "@/components/NearbyListings";
import { SkeletonLoader } from "@/components/SkeletonLoader";
import { SocialShare } from "@/components/SocialShare";
import { SearchAnimation } from "@/components/SearchAnimation";
import { incrementValuationCount } from "@/components/SocialProof";
import { trackEvent } from "@/components/Analytics";
import { AuthGate, SaveHomeButton } from "@/components/AuthGate";
import { getValuation, formatTL, formatPercent, formatNumber } from "@/lib/api";
import { getMockValuation } from "@/lib/mock-data";
import type { ValuationResult } from "@/lib/api";

const USE_MOCK = !process.env.NEXT_PUBLIC_API_URL;

function useAnimatedNumber(target: number, duration: number = 1200) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.floor(target * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [target, duration]);
  return current;
}

function getCurrentReportDate(): string {
  const months = [
    "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
    "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
  ];
  const now = new Date();
  return `${months[now.getMonth()]} ${now.getFullYear()}`;
}

function StarRating({ score, max = 10 }: { score: number; max?: number }) {
  const normalizedScore = (score / max) * 5;
  const fullStars = Math.floor(normalizedScore);
  const hasHalf = normalizedScore - fullStars >= 0.3;
  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <span key={i} className="text-sm">
          {i < fullStars ? "⭐" : i === fullStars && hasHalf ? "⭐" : "☆"}
        </span>
      ))}
      <span className="text-xs font-bold ml-1">{score}/10</span>
    </div>
  );
}

/** Save search to history (localStorage) */
function saveSearchHistory(city: string, district: string, neighborhood: string, estimatedValue?: number) {
  try {
    const history = JSON.parse(localStorage.getItem("evdeger_search_history") || "[]");
    const entry = { city, district, neighborhood, estimatedValue, timestamp: new Date().toISOString() };
    // Remove duplicate if exists
    const filtered = history.filter(
      (h: { city: string; district: string; neighborhood: string }) =>
        !(h.city === city && h.district === district && h.neighborhood === neighborhood)
    );
    filtered.unshift(entry);
    // Keep last 50
    localStorage.setItem("evdeger_search_history", JSON.stringify(filtered.slice(0, 50)));
  } catch {}
}

function SonucContent() {
  const searchParams = useSearchParams();
  const city = searchParams.get("city") || "";
  const district = searchParams.get("district") || "";
  const neighborhood = searchParams.get("neighborhood") || "";
  const propertyType = searchParams.get("property_type") || "daire";

  const [data, setData] = useState<ValuationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [animationDone, setAnimationDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailModal, setShowEmailModal] = useState(false);

  useEffect(() => {
    if (!city || !district) {
      setError("Eksik adres bilgisi. Lütfen ana sayfadan tekrar deneyin.");
      setLoading(false);
      return;
    }

    async function loadData() {
      try {
        let result: ValuationResult;
        if (USE_MOCK) {
          await new Promise((r) => setTimeout(r, 1500));
          result = getMockValuation(city, district, neighborhood);
        } else {
          result = await getValuation(city, district, neighborhood, propertyType);
        }
        setData(result);
        
        // Save to search history
        saveSearchHistory(city, district, neighborhood, result.estimated_value_avg);
        
        incrementValuationCount();
        trackEvent("valuation_completed", { city, district, neighborhood });

        const subscribed = localStorage.getItem("evdeger_email_subscribed");
        if (!subscribed) {
          setTimeout(() => setShowEmailModal(true), 3000);
        }
      } catch {
        setError("Değerleme yapılırken bir hata oluştu. Lütfen tekrar deneyin.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [city, district, neighborhood]);

  if (!animationDone) {
    return <SearchAnimation onComplete={() => setAnimationDone(true)} />;
  }

  if (loading) {
    return <SkeletonLoader />;
  }

  if (error || !data) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-4">
        <div className="text-5xl">😕</div>
        <h2 className="text-xl font-semibold text-foreground">
          {error || "Bir hata oluştu"}
        </h2>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          ← Ana Sayfaya Dön
        </Link>
      </div>
    );
  }

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const displayCity = capitalize(city);
  const displayDistrict = capitalize(district);
  const displayNeighborhood = capitalize(neighborhood);
  const reportDate = getCurrentReportDate();
  const today = new Date().toLocaleDateString("tr-TR");
  const propertyKey = `${city}-${district}-${neighborhood}`;

  return (
    <div className="py-6 sm:py-10">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">

        {/* HERO SECTION */}
        <div className="text-center mb-10 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Link href="/" className="hover:text-foreground transition-colors">
              Ana Sayfa
            </Link>
            <span>/</span>
            <span>Değerleme Raporu</span>
          </div>
          <div className="flex items-center justify-center gap-3">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
              📍 {displayDistrict}, {displayNeighborhood}
            </h1>
            <SaveHomeButton
              propertyKey={propertyKey}
              propertyData={{
                city, district, neighborhood,
                estimatedValue: data.estimated_value_avg,
              }}
              className="mt-2"
            />
          </div>
          <p className="text-xl sm:text-2xl text-brand-navy font-medium mt-1">
            — {displayCity}
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            {reportDate} Değerleme Raporu
          </p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <Badge variant="secondary" className="text-xs">
              {data.sample_size} ilan analiz edildi
            </Badge>
            <Badge variant="outline" className="text-xs">
              Güncel Veri
            </Badge>
          </div>
        </div>

        {/* SATIŞ + KİRA DEĞERİ KARTLARI — always visible (range shown to all) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 stagger-children">
          <SaleValueCard data={data} />
          <RentValueCard data={data} />
        </div>

        <Separator className="my-8" />

        {/* BÖLGE İSTATİSTİKLERİ — gated: investment metrics behind auth */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <span>📊</span>
            Bölge İstatistikleri
          </h2>
          {/* Free stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 stagger-children mb-4">
            <StatCard icon="💰" label="Ort. m² Fiyatı" value={formatTL(data.avg_price_per_sqm)} />
            <StatCard
              icon={data.yoy_change >= 0 ? "📈" : "📉"}
              label="Yıllık Değer Artışı"
              value={formatPercent(data.yoy_change)}
              subtext="son 12 ay"
              valueColor={data.yoy_change >= 0 ? "text-emerald-600" : "text-red-500"}
            />
            <StatCard icon="📋" label="Aktif İlan Sayısı" value={formatNumber(data.active_listings)} subtext="bu bölgede" />
            <StatCard icon="📐" label="Ort. Daire Büyüklüğü" value={`${data.avg_apartment_size} m²`} />
          </div>
          {/* Email signup CTA — above gated content */}
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/20 dark:to-blue-950/20 border border-emerald-200/50 dark:border-emerald-800/50">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
              <div className="flex-1 text-center sm:text-left">
                <p className="font-semibold text-slate-900 dark:text-white text-sm">📬 Her ay evinizin değerini alın</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Aylık değerleme raporu — ücretsiz</p>
              </div>
              <EmailSignupForm variant="inline" context={`gate_${city}_${district}`} />
            </div>
          </div>
          {/* Gated investment stats */}
          <AuthGate>
            <div className="grid grid-cols-2 gap-4">
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6 text-center">
                  <span className="text-2xl mb-2 block">⭐</span>
                  <p className="text-sm text-muted-foreground mb-1">Bölge Puanı</p>
                  <StarRating score={data.region_score} />
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6 text-center">
                  <span className="text-2xl mb-2 block">🎯</span>
                  <p className="text-sm text-muted-foreground mb-1">Yatırım Potansiyeli</p>
                  <Badge
                    className={`text-sm font-bold mt-1 ${
                      data.investment_potential === "Yüksek"
                        ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                        : data.investment_potential === "Orta"
                        ? "bg-amber-100 text-amber-700 hover:bg-amber-100"
                        : "bg-red-100 text-red-700 hover:bg-red-100"
                    }`}
                  >
                    {data.investment_potential}
                  </Badge>
                </CardContent>
              </Card>
            </div>
          </AuthGate>
        </div>

        {/* FİYAT TRENDİ GRAFİĞİ */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
          <TrendChart data={data.trend_data} />
        </div>

        {/* FİYAT TRENDİ — SON 6 AY */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "0.32s" }}>
          <PriceTrendSection
            currentPricePerSqm={data.avg_price_per_sqm}
            district={displayDistrict}
            city={displayCity}
          />
        </div>

        <Separator className="my-8" />

        {/* DETAY GİRİŞ BÖLÜMÜ */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "0.35s" }}>
          <DetailForm basePricePerSqm={data.avg_price_per_sqm} />
        </div>

        <Separator className="my-8" />

        {/* BENZER İLANLAR — gated */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
          <AuthGate>
            <SimilarListings listings={data.similar_listings} />
          </AuthGate>
        </div>

        <Separator className="my-8" />

        {/* BÖLGEDEKİ İLANLAR — gated */}
        {data.nearby_links && (
          <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "0.42s" }}>
            <AuthGate>
              <NearbyListings links={data.nearby_links} />
            </AuthGate>
          </div>
        )}

        {/* Social Share */}
        <div className="mb-8 animate-fade-in-up" style={{ animationDelay: "0.43s" }}>
          <SocialShare city={city} district={district} neighborhood={neighborhood} />
        </div>

        <Separator className="my-8" />

        {/* EMAIL SIGNUP CTA — works without auth */}
        <div className="max-w-lg mx-auto mb-8 animate-fade-in-up" style={{ animationDelay: "0.45s" }}>
          <div className="text-center mb-4">
            <h3 className="text-lg font-semibold text-foreground">
              📬 Her ay evinizin güncel değerini öğrenin
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Email adresini gir, her ay evin değerini gönderelim — ücretsiz, kayıtsız.
            </p>
          </div>
          <EmailSignupForm variant="inline" context={`sonuc_${city}_${district}`} />
        </div>

        {/* Email Modal */}
        <EmailModal
          isOpen={showEmailModal}
          onClose={() => setShowEmailModal(false)}
          location={`${displayCity} ${displayDistrict}`}
        />

        {/* DISCLAIMER + FOOTER */}
        <div className="mt-10 p-5 rounded-xl bg-muted/50 border border-border/50 text-center animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
          <p className="text-xs text-muted-foreground leading-relaxed">
            ⚠️ Bu değerleme tahmini olup kesin bir fiyat taahhüdü değildir.
            Gerçek değer profesyonel ekspertiz ile belirlenmelidir.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Veri kaynakları: Hepsiemlak, Endeksa, TCMB · Son güncelleme: {today}
          </p>
        </div>

        {/* Back Button */}
        <div className="text-center mt-8 mb-4">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-6 py-3 text-sm font-semibold hover:bg-muted transition-colors"
          >
            ← Yeni Değerleme Yap
          </Link>
        </div>
      </div>
    </div>
  );
}

/* SATIŞ DEĞERİ KARTI */
function SaleValueCard({ data }: { data: ValuationResult }) {
  const animatedAvg = useAnimatedNumber(data.estimated_value_avg, 1200);
  return (
    <Card className="border-t-4 border-t-brand-navy shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-muted-foreground font-medium">
          <span className="text-2xl">🏠</span>
          Tahmini Satış Değeri
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">
            {formatTL(data.estimated_value_low)} — {formatTL(data.estimated_value_high)}
          </p>
          <p className="text-4xl sm:text-5xl font-bold text-brand-navy animate-count-up">
            {formatTL(animatedAvg)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">ortalama değer</p>
        </div>
        <ConfidenceBar
          low={data.estimated_value_low}
          average={data.estimated_value_avg}
          high={data.estimated_value_high}
          accentColor="blue"
        />
        <div className="flex items-center justify-center gap-2 pt-2 border-t border-border/50">
          <span className="text-sm text-muted-foreground">m² fiyatı:</span>
          <span className="text-sm font-bold text-brand-navy">
            {formatTL(data.avg_price_per_sqm)}/m²
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

/* KİRA DEĞERİ KARTI */
function RentValueCard({ data }: { data: ValuationResult }) {
  const animatedAvg = useAnimatedNumber(data.estimated_rent_avg, 1200);
  return (
    <Card className="border-t-4 border-t-brand-green shadow-lg hover:shadow-xl transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-muted-foreground font-medium">
          <span className="text-2xl">🔑</span>
          Tahmini Kira Değeri
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">
            {formatTL(data.estimated_rent_low)} — {formatTL(data.estimated_rent_high)}
          </p>
          <p className="text-4xl sm:text-5xl font-bold text-brand-green animate-count-up">
            {formatTL(animatedAvg)}
            <span className="text-lg font-normal text-muted-foreground ml-1">/ ay</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">ortalama aylık kira</p>
        </div>
        <ConfidenceBar
          low={data.estimated_rent_low}
          average={data.estimated_rent_avg}
          high={data.estimated_rent_high}
          accentColor="green"
        />
        {/* Gated: yield + amortization */}
        <AuthGate>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Brüt Kira Getirisi</p>
              <p className="text-sm font-bold text-brand-green">
                %{data.gross_rental_yield} <span className="text-xs font-normal">yıllık</span>
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Amortisman Süresi</p>
              <p className="text-sm font-bold text-foreground">
                ~{data.amortization_years} yıl
              </p>
            </div>
          </div>
        </AuthGate>
      </CardContent>
    </Card>
  );
}

export default function SonucPage() {
  return (
    <Suspense fallback={<SkeletonLoader />}>
      <SonucContent />
    </Suspense>
  );
}
