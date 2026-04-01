import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCityBySlug,
  getDistrictsForCity,
  getCityAvgPrice,
  getDistrictAvgPrice,
  getDistrictAvgRent,
  TOP_CITIES,
  mockCities,
} from "@/lib/mock-data";
import { formatTL } from "@/lib/api";
import { getCityEmoji } from "@/lib/city-emojis";
import { EmailSignupForm } from "@/components/EmailSignupForm";

interface CityPageProps {
  params: Promise<{ city: string }>;
}

export async function generateStaticParams() {
  return TOP_CITIES.map((city) => ({ city }));
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
  const { city: citySlug } = await params;
  const city = getCityBySlug(citySlug);
  if (!city) return {};

  const avgPrice = getCityAvgPrice(citySlug);
  const year = new Date().getFullYear();

  const title = `${city.name} Ev Fiyatları ${year} — Güncel Konut Değerleme`;
  const description = `${city.name} ev fiyatları ${year}: Güncel m² fiyatı ${formatTL(avgPrice)}. İlçe bazlı konut fiyatları, kira değerleri, emlak değerleme ve bölge analizi. Ücretsiz değerleme yapın.`;

  return {
    title,
    description,
    keywords: [
      `${city.name} ev fiyatları`,
      `${city.name} ev fiyatları ${year}`,
      `${city.name} emlak değerleme`,
      `${city.name} m² fiyat`,
      `${city.name} m2 fiyat`,
      `${city.name} kira değeri`,
      `${city.name} konut fiyatları`,
      `${city.name} daire fiyatları`,
      `${city.name} kira fiyatları`,
      "emlak değerleme",
      "ev değeri hesaplama",
    ],
    alternates: {
      canonical: `https://evdeger.durinx.com/${citySlug}`,
      languages: {
        "tr-TR": `https://evdeger.durinx.com/${citySlug}`,
      },
    },
    openGraph: {
      title: `${city.name} Ev Fiyatları ${year} — Güncel Konut Değerleme`,
      description,
      url: `https://evdeger.durinx.com/${citySlug}`,
      siteName: "EvDeğer",
      locale: "tr_TR",
      type: "website",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: `${city.name} Ev Fiyatları ${year}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${city.name} Ev Fiyatları ${year}`,
      description,
      images: ["/og-image.png"],
    },
  };
}

/* Neighboring/related cities for internal linking */
const cityNeighbors: Record<string, string[]> = {
  istanbul: ["kocaeli", "tekirdag", "bursa", "yalova", "sakarya"],
  ankara: ["eskisehir", "konya", "kayseri", "kirikkale", "bolu"],
  izmir: ["manisa", "aydin", "mugla", "balikesir", "denizli"],
  bursa: ["istanbul", "kocaeli", "balikesir", "yalova", "eskisehir"],
  antalya: ["mugla", "burdur", "isparta", "mersin", "konya"],
  adana: ["mersin", "hatay", "gaziantep", "osmaniye", "konya"],
  konya: ["ankara", "eskisehir", "antalya", "karaman", "aksaray"],
  gaziantep: ["adana", "hatay", "sanliurfa", "diyarbakir", "mersin"],
  mersin: ["adana", "antalya", "hatay", "konya", "gaziantep"],
  kayseri: ["ankara", "konya", "sivas", "nevsehir", "yozgat"],
  eskisehir: ["ankara", "bursa", "konya", "kutahya", "balikesir"],
  diyarbakir: ["gaziantep", "sanliurfa", "mardin", "batman", "van"],
  samsun: ["trabzon", "ordu", "tokat", "amasya", "sinop"],
  trabzon: ["samsun", "rize", "giresun", "artvin", "erzurum"],
  mugla: ["izmir", "antalya", "aydin", "denizli", "burdur"],
  kocaeli: ["istanbul", "sakarya", "bursa", "yalova", "duzce"],
};

export default async function CityPage({ params }: CityPageProps) {
  const { city: citySlug } = await params;
  const city = getCityBySlug(citySlug);

  if (!city) {
    notFound();
  }

  const districts = getDistrictsForCity(citySlug);
  const avgPrice = getCityAvgPrice(citySlug);
  const avgRent = Math.round(avgPrice * 0.005);
  const year = new Date().getFullYear();
  const emoji = getCityEmoji(citySlug);

  // Get neighbor cities
  const neighborSlugs = cityNeighbors[citySlug] || [];
  const neighborCities = neighborSlugs
    .map((slug) => {
      const c = getCityBySlug(slug);
      return c ? { name: c.name, slug } : null;
    })
    .filter(Boolean) as { name: string; slug: string }[];

  // Sort districts by price for "most expensive" section
  const districtsByPrice = districts
    .map((d) => ({
      ...d,
      price: getDistrictAvgPrice(citySlug, d.slug),
      rent: getDistrictAvgRent(citySlug, d.slug),
    }))
    .sort((a, b) => b.price - a.price);

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `${city.name} Ev Fiyatları ${year} — Güncel Konut Değerleme`,
    description: `${city.name} ili emlak değerleme ve güncel m² fiyatları. Ortalama m² fiyat: ${formatTL(avgPrice)}.`,
    url: `https://evdeger.durinx.com/${citySlug}`,
    inLanguage: "tr-TR",
    isPartOf: {
      "@type": "WebSite",
      name: "EvDeğer",
      url: "https://evdeger.durinx.com",
    },
    about: {
      "@type": "City",
      name: city.name,
      containedInPlace: {
        "@type": "Country",
        name: "Türkiye",
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
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero — Dark gradient matching homepage style */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 pt-24 pb-16 sm:pt-28 sm:pb-20">
        {/* Decorative grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        {/* Radial glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-emerald-500/10 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-white/50 mb-8" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white/80 transition-colors">
              Ana Sayfa
            </Link>
            <span>/</span>
            <span className="text-white/80 font-medium">{city.name}</span>
          </nav>

          <div className="text-center">
            {/* City emoji — large */}
            <div className="text-7xl sm:text-8xl mb-4 animate-bounce-slow">
              {emoji}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
              {city.name} Ev Fiyatları {year}
              <span className="block mt-2 bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">
                Güncel Konut Değerleme
              </span>
            </h1>
            <p className="mt-5 text-lg text-slate-300 max-w-3xl mx-auto">
              {city.name}&apos;de ortalama konut m² fiyatı{" "}
              <strong className="text-white">{formatTL(avgPrice)}</strong>&apos;dir.
              İlçe bazlı detaylı fiyat bilgisi için aşağıya göz atın.
            </p>
          </div>

          {/* Stats bar — on dark bg */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto mt-10">
            <div className="text-center p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <p className="text-2xl font-bold text-white">{formatTL(avgPrice)}</p>
              <p className="text-xs text-slate-400 mt-1">Ort. m² Fiyatı</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <p className="text-2xl font-bold text-emerald-400">{formatTL(avgRent)}</p>
              <p className="text-xs text-slate-400 mt-1">Ort. m² Kira</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <p className="text-2xl font-bold text-white">{districts.length}</p>
              <p className="text-xs text-slate-400 mt-1">İlçe Sayısı</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <p className="text-2xl font-bold text-white">{formatTL(avgPrice * 100)}</p>
              <p className="text-xs text-slate-400 mt-1">100m² Tahmini</p>
            </div>
          </div>
        </div>
      </section>

      {/* Districts Table */}
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {city.name} İlçeleri — {year} Güncel m² Fiyatları
          </h2>
          <p className="text-muted-foreground mb-6">
            {city.name}&apos;ın tüm ilçelerinde güncel konut fiyatları ve kira değerleri. İlçe adına tıklayarak detaylı değerleme yapabilirsiniz.
          </p>

          {districts.length > 0 ? (
            <>
              {/* Table view for larger screens */}
              <div className="hidden sm:block overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-foreground">İlçe</th>
                      <th className="px-6 py-3 text-right font-semibold text-foreground">Ort. m² Fiyat</th>
                      <th className="px-6 py-3 text-right font-semibold text-foreground">Ort. m² Kira</th>
                      <th className="px-6 py-3 text-center font-semibold text-foreground">Değerle</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {districtsByPrice.map((district) => (
                      <tr key={district.slug} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <Link
                            href={`/${citySlug}/${district.slug}`}
                            className="font-medium text-foreground hover:text-brand-green transition-colors"
                          >
                            {district.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-brand-navy">
                          {formatTL(district.price)}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-brand-green">
                          {formatTL(district.rent)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Link
                            href={`/${citySlug}/${district.slug}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-brand-green/10 px-3 py-1.5 text-xs font-medium text-brand-green hover:bg-brand-green/20 transition-colors"
                          >
                            Değerle →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Card view for mobile */}
              <div className="sm:hidden grid grid-cols-1 gap-4">
                {districtsByPrice.map((district) => (
                  <Link
                    key={district.slug}
                    href={`/${citySlug}/${district.slug}`}
                    className="group relative flex flex-col p-5 rounded-xl border border-border/50 bg-white dark:bg-muted hover:border-brand-green/50 hover:shadow-lg transition-all"
                  >
                    <h3 className="text-lg font-semibold text-foreground group-hover:text-brand-green transition-colors">
                      {district.name}
                    </h3>
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">m² Fiyatı</p>
                        <p className="text-base font-bold text-brand-navy">{formatTL(district.price)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">m² Kira</p>
                        <p className="text-base font-bold text-brand-green">{formatTL(district.rent)}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">
                {city.name} ili için ilçe verileri henüz eklenmemiştir.
              </p>
              <Link
                href="/"
                className="mt-4 inline-flex items-center text-brand-green hover:underline font-medium"
              >
                ← Ana Sayfaya Dön
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Email Signup — city page CTA */}
      <section className="py-12 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/20 dark:to-blue-950/20 border-y border-border/30">
        <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-foreground">
              📬 Her ay evinizin değerini alın
            </h3>
            <p className="text-sm text-muted-foreground mt-2">
              {city.name}&apos;daki evinizin güncel değerini her ay e-posta ile göndeririz — ücretsiz.
            </p>
          </div>
          <EmailSignupForm variant="inline" context={`city_${citySlug}`} />
        </div>
      </section>

      {/* SEO Content */}
      <section className="py-12 bg-muted/30">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-xl font-bold text-foreground mb-4">
            {city.name} Emlak Piyasası Hakkında
          </h2>
          <div className="prose prose-sm text-muted-foreground max-w-none space-y-4">
            <p>
              {city.name}, Türkiye&apos;nin önemli illerinden biridir. {year} yılı itibarıyla
              {city.name}&apos;da ortalama <strong>konut m² fiyatı</strong>{" "}
              <strong>{formatTL(avgPrice)}</strong> seviyesindedir. Ortalama <strong>m² kira bedeli</strong> ise{" "}
              <strong>{formatTL(avgRent)}</strong>&apos;dir. {city.name} genelinde{" "}
              {districts.length} ilçede emlak değerleme hizmeti sunulmaktadır.
            </p>
            <p>
              EvDeğer ile {city.name}&apos;daki evinizin tahmini satış ve <strong>kira değerini</strong>{" "}
              ücretsiz olarak öğrenebilirsiniz. İlçe bazlı detaylı fiyat analizleri için yukarıdaki
              listeden bir ilçe seçin veya{" "}
              <Link href="/" className="text-brand-green hover:underline font-medium">
                ana sayfadan değerleme formunu
              </Link>{" "}
              kullanın.
            </p>
            <p>
              {city.name} <strong>emlak piyasası</strong> hakkında daha fazla bilgi almak,{" "}
              {city.name} <strong>kira fiyatları</strong> ve <strong>yatırım analizi</strong> için
              ilçe sayfalarımızı ziyaret edebilirsiniz. Ayrıca{" "}
              <Link href="/rehber" className="text-brand-green hover:underline font-medium">
                emlak rehberimizde
              </Link>{" "}
              Türkiye genelinde piyasa analizleri ve yatırım önerileri bulabilirsiniz.
            </p>
          </div>
        </div>
      </section>

      {/* Neighboring Cities — Internal Linking */}
      {neighborCities.length > 0 && (
        <section className="py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="text-xl font-bold text-foreground mb-4">
              Yakın Şehirlerdeki Ev Fiyatları
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {city.name} çevresindeki diğer illerde de emlak değerleme yapabilirsiniz.
            </p>
            <div className="flex flex-wrap gap-3">
              {neighborCities.map((nc) => (
                <Link
                  key={nc.slug}
                  href={`/${nc.slug}`}
                  className="inline-flex items-center rounded-full border border-border/50 bg-white dark:bg-muted px-5 py-2.5 text-sm font-medium text-muted-foreground hover:text-brand-green hover:border-brand-green/50 transition-colors"
                >
                  {nc.name} ev fiyatları →
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-12 bg-brand-navy/5">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {city.name}&apos;da Evinizin Değerini Hemen Öğrenin
          </h2>
          <p className="text-muted-foreground mb-6">
            {city.name}&apos;daki evinizin güncel satış ve kira değerini saniyeler içinde ücretsiz öğrenin.
          </p>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg px-8 py-3 text-lg font-semibold bg-brand-green hover:bg-brand-green-dark text-white shadow-lg shadow-brand-green/25 transition-all hover:shadow-xl"
          >
            🔍 Ücretsiz Değerleme Yap
          </Link>
        </div>
      </section>
    </>
  );
}
