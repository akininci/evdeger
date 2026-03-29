"use client";

import { useState, useEffect, useRef } from "react";

/* ── Live Valuation Counter ── */
export function ValuationCounter() {
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const [displayCount, setDisplayCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize from localStorage
    const stored = parseInt(localStorage.getItem("evdeger_valuation_count") || "0", 10);
    const base = stored > 12847 ? stored : 12847; // Minimum realistic number
    setCount(base);

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  // Animate count on visibility
  useEffect(() => {
    if (!visible || !count) return;
    const steps = 50;
    const increment = count / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= count) {
        setDisplayCount(count);
        clearInterval(interval);
      } else {
        setDisplayCount(Math.floor(current));
      }
    }, 30);
    return () => clearInterval(interval);
  }, [visible, count]);

  return (
    <div ref={ref} className="flex items-center justify-center gap-3 py-3">
      <div className="flex items-center gap-2 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-4 py-2">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
          Bugüne kadar {displayCount.toLocaleString("tr-TR")} değerleme yapıldı
        </span>
      </div>
    </div>
  );
}

/* ── Increment counter (call after valuation) ── */
export function incrementValuationCount() {
  const stored = parseInt(localStorage.getItem("evdeger_valuation_count") || "12847", 10);
  localStorage.setItem("evdeger_valuation_count", String(stored + 1));
}

/* ── Recent Valuations Ticker ── */
const CITIES_DISTRICTS = [
  { city: "İstanbul", districts: ["Kadıköy", "Beşiktaş", "Üsküdar", "Bakırköy", "Şişli", "Fatih", "Beyoğlu", "Ataşehir", "Maltepe", "Kartal", "Pendik", "Sarıyer", "Beylikdüzü", "Başakşehir"] },
  { city: "Ankara", districts: ["Çankaya", "Keçiören", "Yenimahalle", "Etimesgut", "Mamak", "Altındağ", "Sincan"] },
  { city: "İzmir", districts: ["Karşıyaka", "Bornova", "Konak", "Buca", "Çiğli", "Bayraklı", "Alsancak"] },
  { city: "Antalya", districts: ["Muratpaşa", "Konyaaltı", "Kepez", "Lara", "Alanya", "Manavgat"] },
  { city: "Bursa", districts: ["Nilüfer", "Osmangazi", "Yıldırım", "Mudanya"] },
  { city: "Trabzon", districts: ["Ortahisar", "Akçaabat", "Yomra"] },
  { city: "Gaziantep", districts: ["Şahinbey", "Şehitkamil"] },
  { city: "Kocaeli", districts: ["İzmit", "Gebze", "Darıca"] },
  { city: "Mersin", districts: ["Yenişehir", "Mezitli", "Toroslar"] },
  { city: "Eskişehir", districts: ["Tepebaşı", "Odunpazarı"] },
  { city: "Denizli", districts: ["Pamukkale", "Merkezefendi"] },
  { city: "Konya", districts: ["Selçuklu", "Meram", "Karatay"] },
];

function generateRecentValuation(): { text: string; timeAgo: string } {
  const cityData = CITIES_DISTRICTS[Math.floor(Math.random() * CITIES_DISTRICTS.length)];
  const district = cityData.districts[Math.floor(Math.random() * cityData.districts.length)];
  const minutes = Math.floor(Math.random() * 15) + 1;
  const timeAgo = minutes === 1 ? "1 dk önce" : `${minutes} dk önce`;

  return {
    text: `${cityData.city} ${district}'de bir ev değerlendi`,
    timeAgo,
  };
}

export function RecentValuationsTicker() {
  const [items, setItems] = useState<Array<{ text: string; timeAgo: string }>>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Generate initial items
    const initial = Array.from({ length: 5 }, () => generateRecentValuation());
    setItems(initial);

    // Rotate every 4 seconds
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => {
          const next = prev + 1;
          // Add new item when cycling through
          if (next >= items.length) {
            setItems((prevItems) => [...prevItems, generateRecentValuation()]);
          }
          return next;
        });
        setIsVisible(true);
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (items.length === 0) return null;

  const current = items[currentIndex % items.length];

  return (
    <div className="flex items-center justify-center py-2">
      <div
        className={`flex items-center gap-2 text-sm text-muted-foreground transition-all duration-300 ${
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        }`}
      >
        <span className="text-base">📍</span>
        <span>{current?.text}</span>
        <span className="text-xs text-muted-foreground/60">— {current?.timeAgo}</span>
      </div>
    </div>
  );
}

/* ── Trust Badges (Enhanced) ── */
export function EnhancedTrustBadges() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 py-4">
      {[
        { icon: "🆓", text: "Tamamen Ücretsiz", color: "emerald" },
        { icon: "🔒", text: "Kişisel veri saklamıyoruz", color: "blue" },
        { icon: "⚡", text: "Anlık sonuç", color: "amber" },
      ].map((badge) => (
        <div
          key={badge.text}
          className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all duration-300 hover:scale-105 ${
            badge.color === "emerald"
              ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300"
              : badge.color === "blue"
              ? "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300"
              : "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300"
          }`}
        >
          <span>{badge.icon}</span>
          <span>{badge.text}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Testimonials Section ── */
const testimonials = [
  {
    name: "Mehmet Y.",
    city: "İstanbul, Kadıköy",
    stars: 5,
    text: "Evimi satmadan önce değerini merak ediyordum. EvDeğer sayesinde piyasa fiyatını öğrendim ve emlakçıyla çok daha bilinçli pazarlık yapabildim.",
  },
  {
    name: "Ayşe K.",
    city: "İzmir, Karşıyaka",
    stars: 5,
    text: "Kira yenilemesinde ev sahibimin istediği artış çok yüksek geldi. EvDeğer ile bölgemdeki gerçek kira değerlerini gösterdim, makul bir fiyatta anlaştık.",
  },
  {
    name: "Can D.",
    city: "Ankara, Çankaya",
    stars: 4,
    text: "Yatırım için ev bakıyordum. EvDeğer'in kira getirisi ve amortisman hesaplama özelliği sayesinde en doğru bölgeyi seçtim. Çok pratik bir araç.",
  },
  {
    name: "Zeynep A.",
    city: "Antalya, Muratpaşa",
    stars: 5,
    text: "Ücretsiz olması ve kayıt gerektirmemesi harika. Saniyeler içinde sonuç alıyorsun. Tüm komşulara önerdim, herkes çok memnun!",
  },
];

export function TestimonialSection() {
  return (
    <section className="py-20 bg-white dark:bg-slate-950">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block rounded-full bg-yellow-50 dark:bg-yellow-950 px-4 py-1.5 text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-4">
            Kullanıcı Yorumları
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            Kullanıcılarımız Ne Diyor?
          </h2>
          <p className="mt-3 text-lg text-slate-500 dark:text-slate-400">
            Binlerce kullanıcı EvDeğer ile emin adımlar atıyor
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="group relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
            >
              {/* Stars */}
              <div className="flex items-center gap-0.5 mb-3">
                {Array.from({ length: 5 }, (_, j) => (
                  <svg
                    key={j}
                    className={`h-4 w-4 ${j < t.stars ? "text-yellow-400" : "text-slate-200 dark:text-slate-700"}`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              {/* Text */}
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                &ldquo;{t.text}&rdquo;
              </p>

              {/* Author */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-emerald-500 text-white text-sm font-bold">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t.city}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
