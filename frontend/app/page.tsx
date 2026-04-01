"use client";

import { useEffect, useRef, useState } from "react";
import { AddressForm } from "@/components/AddressForm";
import { AddressSearch } from "@/components/AddressSearch";
import { StickyCTA } from "@/components/StickyCTA";
import { EmailSignupForm } from "@/components/EmailSignupForm";
import { ValuationCounter, RecentValuationsTicker, EnhancedTrustBadges, TestimonialSection } from "@/components/SocialProof";
import MapExploreSection from "@/components/MapExploreSection";
import CityDistrictGrid from "@/components/CityDistrictGrid";
import Link from "next/link";

/* ── JSON-LD Structured Data ── */
function StructuredData() {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "EvDeğer",
    url: "https://evdeger.durinx.com",
    description: "Türkiye genelinde 81 ilde ücretsiz emlak değerleme. Adresini gir, saniyeler içinde tahmini satış ve kira değerini öğren.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://evdeger.durinx.com/{search_term_string}",
      "query-input": "required name=search_term_string",
    },
    inLanguage: "tr-TR",
  };

  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "EvDeğer",
    url: "https://evdeger.durinx.com",
    logo: "https://evdeger.durinx.com/favicon-32x32.png",
    description: "Türkiye'nin ücretsiz emlak değerleme platformu",
    areaServed: {
      "@type": "Country",
      name: "Türkiye",
    },
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "Evimin değerini nasıl öğrenebilirim?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "EvDeğer'de adresinizi (il, ilçe, mahalle) girerek evinizin tahmini satış ve kira değerini saniyeler içinde ücretsiz öğrenebilirsiniz. Platform, binlerce aktif ilan verisini analiz ederek bölgenize özel sonuçlar üretir.",
        },
      },
      {
        "@type": "Question",
        name: "EvDeğer güvenilir mi?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "EvDeğer, Endeksa, TCMB Konut Fiyat Endeksi, EVA Gayrimenkul ve aktif ilan verileri gibi birden fazla güvenilir kaynağı çapraz doğrulayarak tahmini değerler üretir. Sonuçlar gösterge niteliğindedir; resmi işlemler için SPK lisanslı ekspertiz raporu önerilir.",
        },
      },
      {
        "@type": "Question",
        name: "Hangi şehirlerde hizmet veriyorsunuz?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "EvDeğer, Türkiye'nin 81 ilinde, 973+ ilçesinde ve 50.000'den fazla mahallede emlak değerleme hizmeti sunmaktadır. İstanbul, Ankara, İzmir, Antalya, Bursa ve tüm diğer illerde ücretsiz değerleme yapabilirsiniz.",
        },
      },
      {
        "@type": "Question",
        name: "Değerleme nasıl hesaplanıyor?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "EvDeğer, bölgenizdeki aktif satılık ve kiralık ilan verilerini, TCMB konut fiyat endeksini, bölgesel fiyat trendlerini ve yapay zeka algoritmalarını kullanarak tahmini değer hesaplar. Karşılaştırmalı piyasa analizi yöntemiyle m² bazlı fiyat tahmini yapar.",
        },
      },
      {
        "@type": "Question",
        name: "EvDeğer ücretsiz mi?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Evet, EvDeğer tamamen ücretsizdir. Kayıt gerektirmez, kişisel bilgi istemez. Adresinizi girerek sınırsız sayıda değerleme yapabilirsiniz.",
        },
      },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </>
  );
}

/* ── Animated Counter ── */
function AnimatedCounter({ end, suffix = "", duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const steps = 60;
    const increment = end / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(interval);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(interval);
  }, [started, end, duration]);

  return (
    <div ref={ref} className="text-center">
      <p className="text-4xl sm:text-5xl font-bold text-white tabular-nums">
        {count.toLocaleString("tr-TR")}{suffix}
      </p>
    </div>
  );
}

/* ── FAQ Accordion ── */
function FAQItem({ question, answer, defaultOpen = false }: { question: string; answer: string; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-slate-200 dark:border-slate-700">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-5 text-left"
        aria-expanded={open}
      >
        <span className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white pr-4">
          {question}
        </span>
        <svg
          className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="pb-5 text-slate-600 dark:text-slate-400 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}

/* ── Stats Data ── */
const stats = [
  { value: 81, suffix: "", label: "İl" },
  { value: 973, suffix: "+", label: "İlçe" },
  { value: 50000, suffix: "+", label: "Mahalle" },
  { value: 0, suffix: "", label: "Ücretsiz", isText: true },
];

/* ── How It Works ── */
const steps = [
  {
    icon: "📍",
    title: "Adresini Gir",
    description: "İl, ilçe ve mahallenizi seçin",
    gradient: "from-blue-500 to-blue-600",
  },
  {
    icon: "🔍",
    title: "Analiz",
    description: "Yapay zeka binlerce ilan analiz eder",
    gradient: "from-emerald-500 to-emerald-600",
  },
  {
    icon: "📊",
    title: "Sonucunu Gör",
    description: "Tahmini satış ve kira değeri",
    gradient: "from-purple-500 to-purple-600",
  },
];

/* ── USPs ── */
const usps = [
  { icon: "🎯", title: "Doğru", desc: "Binlerce aktif ilandan analiz" },
  { icon: "⚡", title: "Hızlı", desc: "Sonuç saniyeler içinde" },
  { icon: "🆓", title: "Ücretsiz", desc: "Tamamen bedava" },
  { icon: "🔒", title: "Güvenli", desc: "Kişisel bilgi istemiyoruz" },
  { icon: "📊", title: "Detaylı", desc: "Satış + kira + trend + yatırım analizi" },
  { icon: "🇹🇷", title: "Türkiye Geneli", desc: "81 ilde hizmet" },
];

/* ── Popular Areas ── */
const popularAreas = [
  { city: "İstanbul", district: "Kadıköy", avgPrice: "85.000", slug: "istanbul/kadikoy" },
  { city: "İstanbul", district: "Beşiktaş", avgPrice: "110.000", slug: "istanbul/besiktas" },
  { city: "Ankara", district: "Çankaya", avgPrice: "42.000", slug: "ankara/cankaya" },
  { city: "İzmir", district: "Karşıyaka", avgPrice: "48.000", slug: "izmir/karsiyaka" },
  { city: "Antalya", district: "Muratpaşa", avgPrice: "52.000", slug: "antalya/muratpasa" },
  { city: "Bursa", district: "Nilüfer", avgPrice: "35.000", slug: "bursa/nilufer" },
];

/* ── Popular Cities for Internal Linking ── */
const popularCities = [
  { name: "İstanbul", slug: "istanbul" },
  { name: "Ankara", slug: "ankara" },
  { name: "İzmir", slug: "izmir" },
  { name: "Antalya", slug: "antalya" },
  { name: "Bursa", slug: "bursa" },
  { name: "Trabzon", slug: "trabzon" },
  { name: "Muğla", slug: "mugla" },
  { name: "Kocaeli", slug: "kocaeli" },
  { name: "Adana", slug: "adana" },
  { name: "Gaziantep", slug: "gaziantep" },
  { name: "Mersin", slug: "mersin" },
  { name: "Konya", slug: "konya" },
  { name: "Eskişehir", slug: "eskisehir" },
  { name: "Diyarbakır", slug: "diyarbakir" },
  { name: "Samsun", slug: "samsun" },
  { name: "Denizli", slug: "denizli" },
  { name: "Kayseri", slug: "kayseri" },
  { name: "Hatay", slug: "hatay" },
  { name: "Sakarya", slug: "sakarya" },
  { name: "Tekirdağ", slug: "tekirdag" },
];

/* ── FAQ Data ── */
const faqItems = [
  {
    question: "Evimin değerini nasıl öğrenebilirim?",
    answer: "EvDeğer'de adresinizi (il, ilçe, mahalle) girerek evinizin tahmini satış ve kira değerini saniyeler içinde ücretsiz öğrenebilirsiniz. Platform, binlerce aktif ilan verisini analiz ederek bölgenize özel sonuçlar üretir. Sadece adresinizi girin, kayıt veya kişisel bilgi gerekmez.",
  },
  {
    question: "EvDeğer güvenilir mi?",
    answer: "EvDeğer, Endeksa, TCMB Konut Fiyat Endeksi, EVA Gayrimenkul ve aktif ilan verileri gibi birden fazla güvenilir kaynağı çapraz doğrulayarak tahmini değerler üretir. Sonuçlar gösterge niteliğindedir ve genel piyasa koşullarını yansıtır. Resmi işlemler için SPK lisanslı ekspertiz raporu önerilir.",
  },
  {
    question: "Hangi şehirlerde hizmet veriyorsunuz?",
    answer: "EvDeğer, Türkiye'nin 81 ilinde, 973+ ilçesinde ve 50.000'den fazla mahallede emlak değerleme hizmeti sunmaktadır. İstanbul, Ankara, İzmir, Antalya, Bursa dahil tüm illerde ücretsiz değerleme yapabilirsiniz.",
  },
  {
    question: "Değerleme nasıl hesaplanıyor?",
    answer: "EvDeğer, bölgenizdeki aktif satılık ve kiralık ilan verilerini, TCMB konut fiyat endeksini, bölgesel fiyat trendlerini ve yapay zeka algoritmalarını kullanarak tahmini değer hesaplar. Karşılaştırmalı piyasa analizi (emsal yöntemi) ile m² bazlı fiyat tahmini yapar.",
  },
  {
    question: "EvDeğer ücretsiz mi?",
    answer: "Evet, EvDeğer tamamen ücretsizdir. Kayıt gerektirmez, kişisel bilgi istemez. Adresinizi girerek sınırsız sayıda değerleme yapabilirsiniz. Hiçbir gizli ücret veya abonelik yoktur.",
  },
];

export default function HomePage() {
  return (
    <>
      <StructuredData />
      <StickyCTA />

      {/* ═══════════════ HERO SECTION ═══════════════ */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-b from-slate-900 via-blue-950 to-slate-900">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-20 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[120px]" />
          <div className="absolute bottom-1/4 -right-20 h-[400px] w-[400px] rounded-full bg-emerald-500/8 blur-[100px]" />
          <div className="absolute top-10 right-1/4 h-[300px] w-[300px] rounded-full bg-indigo-500/5 blur-[80px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-20">
          {/* Badge */}
          <div className="flex justify-center mb-8 animate-fade-in-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-sm text-white/80 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Türkiye&apos;nin 81 ilinde aktif
            </span>
          </div>

          {/* Heading — SEO-optimized H1 */}
          <div className="text-center mb-10">
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-white leading-tight animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
              Türkiye&apos;de Evinin Değerini
              <br />
              <span className="bg-gradient-to-r from-emerald-400 to-green-300 bg-clip-text text-transparent">
                Ücretsiz Öğren
              </span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-white/60 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
              81 ilde emlak değerlemesi — ev fiyatları, konut fiyatları, m² fiyat ve kira değeri
              analizi. Adresini gir, tahmini değerini anında öğren.
            </p>
          </div>

          {/* Address Form Card (Glassmorphism) */}
          <div className="animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
            <div className="relative mx-auto max-w-3xl rounded-2xl border-2 border-white/30 bg-white/[0.18] p-6 sm:p-8 shadow-2xl shadow-black/30 backdrop-blur-xl ring-1 ring-white/10">
              <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-white/15 to-white/5 pointer-events-none" />
              <div className="relative">
                <AddressSearch />
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-white/40 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
              Ücretsiz
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
              Kayıt gerektirmez
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="h-4 w-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
              Anında sonuç
            </span>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="h-6 w-6 text-white/30" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3" />
          </svg>
        </div>
      </section>

      {/* ═══════════════ STATS BAND ═══════════════ */}
      <section className="relative -mt-1 bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 py-12 border-y border-white/5">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                {stat.isText ? (
                  <p className="text-4xl sm:text-5xl font-bold text-white">🆓</p>
                ) : (
                  <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                )}
                <p className="mt-2 text-sm font-medium text-white/50 uppercase tracking-wider">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ SOCIAL PROOF ═══════════════ */}
      <div className="bg-white dark:bg-slate-950 pt-6">
        <ValuationCounter />
        <RecentValuationsTicker />
        <EnhancedTrustBadges />
      </div>

      {/* City Grid — clickable with district expansion */}
      <CityDistrictGrid />

      {/* ═══════════════ INTERACTIVE MAP ═══════════════ */}
      <MapExploreSection />

      {/* ═══════════════ SEO CONTENT — Keyword-rich section ═══════════════ */}
      <section className="py-16 sm:py-20 bg-white dark:bg-slate-950">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white">
              Türkiye&apos;de Ev Fiyatları ve Emlak Değerleme
            </h2>
            <p className="mt-4 text-lg text-slate-500 dark:text-slate-400 max-w-3xl mx-auto">
              Güncel konut fiyatları, m² fiyat analizi ve kira değeri bilgileri
            </p>
          </div>

          <div className="prose prose-lg dark:prose-invert max-w-none text-slate-600 dark:text-slate-300">
            <p>
              Türkiye&apos;de <strong>ev fiyatları</strong> bölgeden bölgeye büyük farklılıklar
              göstermektedir. 2026 yılı itibarıyla <strong>konut fiyatları</strong> ülke genelinde
              ortalama %28 artış gösterirken, bazı illerde bu oran %50&apos;yi aşmıştır.
              <strong> Emlak değerleme</strong> yaparken güncel piyasa verilerine erişmek, doğru
              yatırım ve satış kararları almak için kritik önem taşır.
            </p>
            <p>
              EvDeğer, Türkiye&apos;nin 81 ilinde, 973+ ilçesinde ve 50.000&apos;den fazla
              mahallede ücretsiz <strong>emlak değerleme</strong> hizmeti sunmaktadır. Platformumuz,
              binlerce aktif ilan verisini analiz ederek bölgenize özel <strong>m² fiyat</strong>,
              tahmini satış değeri ve <strong>kira değeri</strong> bilgilerini sunmaktadır.
            </p>
            <p>
              İster evinizi satmayı düşünün, ister kiralamak isteyin, ister yatırım planı
              yapın — doğru <strong>daire fiyatları</strong> bilgisine sahip olmak her zaman
              avantajınıza olacaktır. EvDeğer ile adresinizi girerek saniyeler içinde tahmini
              değerinizi öğrenebilirsiniz.
            </p>
          </div>

          {/* Popular cities internal links */}
          <div className="mt-10">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Popüler Şehirlerde Emlak Değerleme
            </h3>
            <div className="flex flex-wrap gap-2">
              {popularCities.map((city) => (
                <Link
                  key={city.slug}
                  href={`/${city.slug}`}
                  className="inline-flex items-center rounded-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 dark:hover:bg-emerald-950 dark:hover:text-emerald-300 dark:hover:border-emerald-800 transition-colors"
                >
                  {city.name} ev fiyatları
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════ HOW IT WORKS ═══════════════ */}
      <section id="nasil-calisir" className="py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block rounded-full bg-blue-50 dark:bg-blue-950 px-4 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 mb-4">
              Nasıl Çalışır?
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white">
              3 Adımda Evinizin Değerini Öğrenin
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12">
            {steps.map((step, i) => (
              <div key={step.title} className="relative group">
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-12 left-[calc(50%+60px)] w-[calc(100%-120px)] h-px bg-gradient-to-r from-slate-200 to-slate-200 dark:from-slate-700 dark:to-slate-700" />
                )}
                <div className="flex flex-col items-center text-center">
                  <div className={`relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br ${step.gradient} text-4xl shadow-lg shadow-black/10 mb-6 group-hover:scale-110 transition-transform duration-300`}>
                    {step.icon}
                    <span className="absolute -top-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white shadow-md border border-slate-100 dark:border-slate-700">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 max-w-xs">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ NEDEN EVDEGER (USPs) ═══════════════ */}
      <section className="py-24 bg-white dark:bg-slate-950">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block rounded-full bg-emerald-50 dark:bg-emerald-950 px-4 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-4">
              Avantajlar
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white">
              Neden EvDeğer?
            </h2>
            <p className="mt-4 text-lg text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
              Türkiye&apos;nin en kapsamlı ücretsiz emlak değerleme platformu
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {usps.map((usp) => (
              <div
                key={usp.title}
                className="group relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 hover:-translate-y-1 hover:border-emerald-200 dark:hover:border-emerald-800"
              >
                <span className="text-3xl mb-4 block">{usp.icon}</span>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                  {usp.title}
                </h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  {usp.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ POPULAR AREAS ═══════════════ */}
      <section className="py-24 bg-slate-50 dark:bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block rounded-full bg-purple-50 dark:bg-purple-950 px-4 py-1.5 text-sm font-medium text-purple-600 dark:text-purple-400 mb-4">
              Popüler
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-white">
              Popüler Bölgeler
            </h2>
            <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
              En çok sorgulanan bölgelerdeki güncel m² fiyatları
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularAreas.map((area) => (
              <Link
                key={area.slug}
                href={`/${area.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 hover:-translate-y-1"
              >
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{area.city}</p>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
                      {area.district}
                    </h3>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-emerald-50 dark:group-hover:bg-emerald-950 transition-colors">
                    <svg className="h-5 w-5 text-slate-400 group-hover:text-emerald-500 transition-colors" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 19.5 15-15m0 0H8.25m11.25 0v11.25" />
                    </svg>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Ortalama m² fiyat</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
                    ₺{area.avgPrice}
                    <span className="text-sm font-normal text-slate-400">/m²</span>
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-sm font-medium text-emerald-600 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Değerle
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ TESTIMONIALS ═══════════════ */}
      <TestimonialSection />

      {/* ═══════════════ FAQ SECTION ═══════════════ */}
      <section className="py-20 bg-white dark:bg-slate-950">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block rounded-full bg-amber-50 dark:bg-amber-950 px-4 py-1.5 text-sm font-medium text-amber-600 dark:text-amber-400 mb-4">
              SSS
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
              Sıkça Sorulan Sorular
            </h2>
            <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
              EvDeğer hakkında merak edilen her şey
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
            {faqItems.map((faq, i) => (
              <FAQItem key={i} question={faq.question} answer={faq.answer} defaultOpen={i === 0} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════ BLOG TEASER ═══════════════ */}
      <section className="py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block rounded-full bg-rose-50 dark:bg-rose-950 px-4 py-1.5 text-sm font-medium text-rose-600 dark:text-rose-400 mb-4">
              Rehber
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
              Emlak Rehberi
            </h2>
            <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
              Ev fiyatları, yatırım rehberleri ve piyasa analizleri
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/rehber/turkiye-ev-fiyatlari-2026"
              className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <span className="text-xs text-slate-400">8 dk okuma</span>
              <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Türkiye&apos;de Ev Fiyatları 2026: İl Bazlı Güncel Analiz
              </h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                81 ilde güncel m² fiyatları, en pahalı ve en uygun şehirler, bölgesel karşılaştırmalar.
              </p>
            </Link>
            <Link
              href="/rehber/ev-degerini-nasil-ogrenirsiniz"
              className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <span className="text-xs text-slate-400">6 dk okuma</span>
              <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Evinizin Değerini Nasıl Öğrenirsiniz? 5 Adımda Rehber
              </h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                Online değerleme, ekspertiz, emlak danışmanı ve karşılaştırmalı analiz yöntemleri.
              </p>
            </Link>
            <Link
              href="/rehber/kiralik-yatirim-getirisi"
              className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              <span className="text-xs text-slate-400">9 dk okuma</span>
              <h3 className="mt-2 text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Kiralık Ev Yatırımı: Hangi Şehirler En Çok Kazandırıyor?
              </h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                Brüt kira getirisi oranları, amortisman süreleri ve şehir bazlı yatırım karşılaştırması.
              </p>
            </Link>
          </div>

          <div className="mt-8 text-center">
            <Link
              href="/rehber"
              className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
            >
              Tüm rehber yazılarını gör
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════ EMAIL SIGNUP ═══════════════ */}
      <section className="py-16 bg-slate-50 dark:bg-slate-900/50">
        <div className="mx-auto max-w-xl px-4 sm:px-6 lg:px-8">
          <EmailSignupForm variant="inline" context="homepage" />
        </div>
      </section>

      {/* ═══════════════ CTA BAND ═══════════════ */}
      <section className="relative py-20 overflow-hidden bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-[100px]" />
          <div className="absolute bottom-0 right-1/4 h-[200px] w-[200px] rounded-full bg-blue-500/10 blur-[80px]" />
        </div>
        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Evinin Değerini Öğrenmeye Hazır mısın?
          </h2>
          <p className="text-lg text-white/60 mb-6">
            Tamamen ücretsiz, kayıt gerektirmez. Hemen dene!
          </p>
          <Link
            href="#"
            onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all duration-300 hover:bg-emerald-400 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-1 hover:scale-[1.02] active:scale-[0.98] active:translate-y-0 btn-animate"
          >
            🔍 Değerini Öğren
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0-6.75-6.75M19.5 12l-6.75 6.75" />
            </svg>
          </Link>
        </div>
      </section>
    </>
  );
}
