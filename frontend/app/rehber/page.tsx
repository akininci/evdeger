import { Metadata } from "next";
import Link from "next/link";
import { articles } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Emlak Rehberi — Ev Fiyatları, Değerleme ve Yatırım Rehberi",
  description:
    "Türkiye'de ev fiyatları, emlak değerleme yöntemleri, kira yatırımı ve bölge analizleri hakkında kapsamlı rehber yazıları. EvDeğer Araştırma Ekibi tarafından hazırlanmıştır.",
  keywords: [
    "emlak rehberi",
    "ev fiyatları rehberi",
    "emlak değerleme rehberi",
    "konut yatırım rehberi",
    "kira getirisi",
    "Türkiye emlak piyasası",
  ],
  alternates: {
    canonical: "https://evdeger.durinx.com/rehber",
  },
  openGraph: {
    title: "Emlak Rehberi",
    description:
      "Ev fiyatları, emlak değerleme, kira yatırımı ve bölge analizleri hakkında kapsamlı rehber yazıları.",
    url: "https://evdeger.durinx.com/rehber",
    siteName: "EvDeğer",
    locale: "tr_TR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Emlak Rehberi — Ev Fiyatları, Değerleme ve Yatırım Rehberi",
    description:
      "Ev fiyatları, emlak değerleme, kira yatırımı ve bölge analizleri hakkında kapsamlı rehber yazıları.",
    images: ["/og-image.png"],
  },
};

const categoryColors: Record<string, string> = {
  "Piyasa Analizi": "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  Rehber: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  İstanbul: "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  Yatırım: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  Eğitim: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

export default function RehberPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Emlak Rehberi",
    description:
      "Türkiye'de ev fiyatları, emlak değerleme ve yatırım rehberi.",
    url: "https://evdeger.durinx.com/rehber",
    isPartOf: {
      "@type": "WebSite",
      name: "EvDeğer",
      url: "https://evdeger.durinx.com",
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
          name: "Rehber",
          item: "https://evdeger.durinx.com/rehber",
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
      <section className="bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900 py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <nav
            className="flex items-center justify-center gap-2 text-sm text-white/50 mb-8"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-white/80 transition-colors">
              Ana Sayfa
            </Link>
            <span>/</span>
            <span className="text-white/80 font-medium">Rehber</span>
          </nav>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
            Emlak{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">
              Rehberi
            </span>
          </h1>
          <p className="mt-4 text-lg text-white/60 max-w-2xl mx-auto">
            Türkiye emlak piyasası hakkında güncel analizler, değerleme
            rehberleri ve yatırım önerileri. EvDeğer Araştırma Ekibi tarafından
            hazırlanmıştır.
          </p>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article) => (
              <Link
                key={article.slug}
                href={`/rehber/${article.slug}`}
                className="group flex flex-col rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-emerald-200 dark:hover:border-emerald-800"
              >
                {/* Gradient accent */}
                <div className="h-1.5 bg-gradient-to-r from-blue-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex flex-col flex-1 p-6">
                  {/* Category + Read time */}
                  <div className="flex items-center gap-3 mb-4">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${categoryColors[article.category] || "bg-slate-100 text-slate-600"}`}
                    >
                      {article.category}
                    </span>
                    <span className="text-xs text-slate-400">
                      {article.readTime} okuma
                    </span>
                  </div>

                  {/* Title */}
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-2">
                    {article.title}
                  </h2>

                  {/* Excerpt */}
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 line-clamp-3 flex-1">
                    {article.excerpt}
                  </p>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-xs text-slate-400">
                      <time dateTime={article.date}>
                        {new Date(article.date).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </time>
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Oku
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                        />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-4">
            Evinizin Değerini Hemen Öğrenin
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            81 ilde, binlerce mahallede ücretsiz emlak değerleme. Adresini gir,
            saniyeler içinde sonucunu gör.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:shadow-xl hover:-translate-y-0.5"
          >
            🔍 Ücretsiz Değerleme Yap
          </Link>
        </div>
      </section>
    </>
  );
}
