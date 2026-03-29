import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCityBySlug,
  getDistrictBySlug,
  getDistrictsForCity,
  getNeighborhoodsForDistrict,
  getDistrictAvgPrice,
  getDistrictAvgRent,
  getAllCityDistrictPairs,
  TOP_CITIES,
} from "@/lib/mock-data";
import { formatTL } from "@/lib/api";
import { DistrictValuationForm } from "./DistrictValuationForm";

interface DistrictPageProps {
  params: Promise<{ city: string; district: string }>;
}

export async function generateStaticParams() {
  return getAllCityDistrictPairs().filter((p) => TOP_CITIES.includes(p.city));
}

export async function generateMetadata({ params }: DistrictPageProps): Promise<Metadata> {
  const { city: citySlug, district: districtSlug } = await params;
  const city = getCityBySlug(citySlug);
  const district = getDistrictBySlug(citySlug, districtSlug);
  if (!city || !district) return {};

  const avgPrice = getDistrictAvgPrice(citySlug, districtSlug);
  const avgRent = getDistrictAvgRent(citySlug, districtSlug);
  const year = new Date().getFullYear();

  const title = `${district.name}, ${city.name} — Ev Fiyatları ve Kira Değerleri ${year}`;
  const description = `${district.name}, ${city.name} ev fiyatları ${year}: Güncel m² fiyatı ${formatTL(avgPrice)}, m² kira ${formatTL(avgRent)}. Mahalle bazlı konut fiyatları, kira değerleri ve ücretsiz emlak değerleme.`;

  return {
    title,
    description,
    keywords: [
      `${district.name} ev fiyatları`,
      `${district.name} ev fiyatları ${year}`,
      `${district.name} emlak değerleme`,
      `${district.name} m² fiyat`,
      `${district.name} kira değeri`,
      `${district.name} kira fiyatları`,
      `${city.name} ${district.name} konut fiyatları`,
      `${district.name} mahalle fiyatları`,
      `${district.name} daire fiyatları`,
      "emlak değerleme",
      "ev değeri hesaplama",
    ],
    alternates: {
      canonical: `https://evdeger.durinx.com/${citySlug}/${districtSlug}`,
      languages: {
        "tr-TR": `https://evdeger.durinx.com/${citySlug}/${districtSlug}`,
      },
    },
    openGraph: {
      title: `${district.name}, ${city.name} — Ev Fiyatları ${year}`,
      description,
      url: `https://evdeger.durinx.com/${citySlug}/${districtSlug}`,
      siteName: "EvDeğer",
      locale: "tr_TR",
      type: "website",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: `${district.name}, ${city.name} Ev Fiyatları ${year}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${district.name} Ev Fiyatları ${year}`,
      description,
      images: ["/og-image.png"],
    },
  };
}

export default async function DistrictPage({ params }: DistrictPageProps) {
  const { city: citySlug, district: districtSlug } = await params;
  const city = getCityBySlug(citySlug);
  const district = getDistrictBySlug(citySlug, districtSlug);

  if (!city || !district) {
    notFound();
  }

  const neighborhoods = getNeighborhoodsForDistrict(districtSlug);
  const avgPrice = getDistrictAvgPrice(citySlug, districtSlug);
  const avgRent = getDistrictAvgRent(citySlug, districtSlug);
  const year = new Date().getFullYear();

  // Other districts in the same city for internal linking
  const otherDistricts = getDistrictsForCity(citySlug).filter(
    (d) => d.slug !== districtSlug
  );

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${district.name}, ${city.name} — Ev Fiyatları ve Kira Değerleri ${year}`,
    description: `${district.name}, ${city.name} — güncel ev fiyatları ve kira değerleri. m² fiyat: ${formatTL(avgPrice)}.`,
    url: `https://evdeger.durinx.com/${citySlug}/${districtSlug}`,
    inLanguage: "tr-TR",
    isPartOf: {
      "@type": "WebSite",
      name: "EvDeğer",
      url: "https://evdeger.durinx.com",
    },
    about: {
      "@type": "AdministrativeArea",
      name: district.name,
      containedInPlace: {
        "@type": "City",
        name: city.name,
        containedInPlace: {
          "@type": "Country",
          name: "Türkiye",
        },
      },
    },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Ana Sayfa",
          item: "https://evdeger.durinx.com",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: city.name,
          item: `https://evdeger.durinx.com/${citySlug}`,
        },
        {
          "@type": "ListItem",
          position: 3,
          name: district.name,
          item: `https://evdeger.durinx.com/${citySlug}/${districtSlug}`,
        },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-b from-brand-navy/5 via-background to-background py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6 flex-wrap" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-foreground transition-colors">
              Ana Sayfa
            </Link>
            <span>/</span>
            <Link href={`/${citySlug}`} className="hover:text-foreground transition-colors">
              {city.name}
            </Link>
            <span>/</span>
            <span className="text-foreground font-medium">{district.name}</span>
          </nav>

          <div className="text-center mb-10">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
              {district.name}, {city.name}{" "}
              <span className="block sm:inline text-brand-green">— Ev Fiyatları ve Kira Değerleri {year}</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
              {district.name}&apos;da ortalama konut m² fiyatı{" "}
              <strong className="text-foreground">{formatTL(avgPrice)}</strong>, m² kira bedeli{" "}
              <strong className="text-foreground">{formatTL(avgRent)}</strong>&apos;dir.
              {neighborhoods.length > 0 && (
                <> {district.name} ilçesinde {neighborhoods.length} mahallede detaylı fiyat analizi sunuyoruz.</>
              )}
            </p>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto mb-12">
            <div className="text-center p-4 rounded-xl bg-white dark:bg-muted border border-border/50">
              <p className="text-xl sm:text-2xl font-bold text-brand-navy">{formatTL(avgPrice)}</p>
              <p className="text-xs text-muted-foreground mt-1">Ort. m² Fiyatı</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white dark:bg-muted border border-border/50">
              <p className="text-xl sm:text-2xl font-bold text-brand-green">{formatTL(avgRent)}</p>
              <p className="text-xs text-muted-foreground mt-1">Ort. m² Kira</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white dark:bg-muted border border-border/50">
              <p className="text-xl sm:text-2xl font-bold text-brand-navy">{neighborhoods.length || "—"}</p>
              <p className="text-xs text-muted-foreground mt-1">Mahalle</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white dark:bg-muted border border-border/50">
              <p className="text-xl sm:text-2xl font-bold text-brand-navy">
                {formatTL(avgPrice * 100)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">100m² Tahmini</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA — Direct Valuation Form */}
      <section className="py-12 bg-brand-navy/5">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground mb-2 text-center">
            Bu Bölgede Değerleme Yap
          </h2>
          <p className="text-muted-foreground text-center mb-6">
            {district.name}&apos;da mahallenizi seçin, saniyeler içinde evinizin değerini öğrenin.
          </p>
          <DistrictValuationForm
            citySlug={citySlug}
            districtSlug={districtSlug}
            neighborhoods={neighborhoods}
          />
        </div>
      </section>

      {/* Neighborhoods Table */}
      {neighborhoods.length > 0 && (
        <section className="py-12 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">
              {district.name} Mahalleleri — {year} Güncel Fiyatlar
            </h2>
            <p className="text-muted-foreground mb-6">
              {district.name} ilçesindeki tüm mahallelerin tahmini m² fiyatları ve kira bedelleri.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {neighborhoods.map((neighborhood) => {
                const hash = (districtSlug + neighborhood.slug).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
                const variation = 0.8 + (hash % 40) / 100;
                const neighborhoodPrice = Math.round(avgPrice * variation);
                const neighborhoodRent = Math.round(neighborhoodPrice * 0.005);

                return (
                  <div
                    key={neighborhood.slug}
                    className="flex flex-col p-5 rounded-xl border border-border/50 bg-white dark:bg-muted"
                  >
                    <h3 className="text-lg font-semibold text-foreground">
                      {neighborhood.name}
                    </h3>
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">m² Fiyatı</p>
                        <p className="text-base font-bold text-brand-navy">{formatTL(neighborhoodPrice)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">m² Kira</p>
                        <p className="text-base font-bold text-brand-green">{formatTL(neighborhoodRent)}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* SEO Content */}
      <section className="py-12 bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-foreground mb-4">
            {district.name}, {city.name} Ev Fiyatları Hakkında
          </h2>
          <div className="prose prose-sm text-muted-foreground max-w-none space-y-4">
            <p>
              {district.name}, {city.name}&apos;nin önemli ilçelerinden biridir. {year} yılı itibarıyla
              {district.name}&apos;da ortalama <strong>konut m² fiyatı</strong>{" "}
              <strong>{formatTL(avgPrice)}</strong> seviyesindedir. Ortalama <strong>m² kira bedeli</strong> ise{" "}
              <strong>{formatTL(avgRent)}</strong>&apos;dir. 100 m² bir dairenin tahmini satış değeri{" "}
              <strong>{formatTL(avgPrice * 100)}</strong>, aylık kira bedeli ise{" "}
              <strong>{formatTL(avgRent * 100)}</strong> civarındadır.
            </p>
            <p>
              EvDeğer ile {district.name}&apos;daki evinizin tahmini satış ve <strong>kira değerini</strong>{" "}
              ücretsiz olarak öğrenebilirsiniz. Yukarıdaki formu kullanarak mahallenizi seçin
              ve detaylı değerleme raporunuzu anında alın.
            </p>
            {neighborhoods.length > 0 && (
              <p>
                {district.name}&apos;da {neighborhoods.length} mahalle için fiyat analizi sunuyoruz.
                En popüler mahalleler arasında {neighborhoods.slice(0, 5).map(n => n.name).join(", ")} yer almaktadır.
                Mahalle bazlı <strong>daire fiyatları</strong> ve <strong>kira fiyatları</strong> hakkında
                detaylı bilgi için yukarıdaki tabloya göz atabilirsiniz.
              </p>
            )}
            <p>
              {city.name}&apos;ın diğer ilçelerindeki <strong>ev fiyatlarını</strong> karşılaştırmak için
              aşağıdaki ilçe linklerini kullanabilirsiniz. Ayrıca{" "}
              <Link href="/rehber" className="text-brand-green hover:underline font-medium">
                emlak rehberimizde
              </Link>{" "}
              değerleme yöntemleri ve yatırım analizleri hakkında detaylı bilgi bulabilirsiniz.
            </p>
          </div>
        </div>
      </section>

      {/* Other Districts — Internal Linking */}
      <section className="py-12">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-foreground mb-2">
            {city.name}&apos;ın Diğer İlçeleri
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {city.name} genelinde diğer ilçelerdeki ev fiyatlarını da inceleyin.
          </p>
          <div className="flex flex-wrap gap-2">
            {otherDistricts.map((d) => (
              <Link
                key={d.slug}
                href={`/${citySlug}/${d.slug}`}
                className="inline-flex items-center rounded-full border border-border/50 bg-white dark:bg-muted px-4 py-2 text-sm font-medium text-muted-foreground hover:text-brand-green hover:border-brand-green/50 transition-colors"
              >
                {d.name}
              </Link>
            ))}
          </div>

          {/* Link back to city */}
          <div className="mt-6">
            <Link
              href={`/${citySlug}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-green hover:underline"
            >
              ← {city.name} tüm ilçeler
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
