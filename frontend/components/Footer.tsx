import Link from "next/link";

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
];

const rehberLinks = [
  { name: "Türkiye Ev Fiyatları 2026", slug: "turkiye-ev-fiyatlari-2026" },
  { name: "Evinizin Değerini Nasıl Öğrenirsiniz?", slug: "ev-degerini-nasil-ogrenirsiniz" },
  { name: "İstanbul En Pahalı İlçeler", slug: "istanbul-en-pahali-ilceler" },
  { name: "Kiralık Yatırım Getirisi", slug: "kiralik-yatirim-getirisi" },
  { name: "Emlak Değerleme Nasıl Yapılır?", slug: "emlak-degerleme-nasil-yapilir" },
];

export function Footer() {
  return (
    <footer className="bg-slate-950 text-white">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Hakkımızda */}
          <div>
            <div className="flex items-center gap-2.5 mb-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-slate-900 font-bold text-lg">
                E
              </div>
              <span className="text-xl font-bold">
                Ev<span className="text-emerald-500">Değer</span>
              </span>
            </div>
            <p className="text-sm text-white/50 leading-relaxed max-w-xs">
              Türkiye genelinde 81 ilde ücretsiz emlak değerleme platformu. Güncel ilan verilerini
              analiz ederek bölgenize özel tahmini ev fiyatları ve kira değerleri sunuyoruz.
            </p>
          </div>

          {/* Popüler Şehirler */}
          <div>
            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-5">
              Popüler Şehirler
            </h3>
            <ul className="space-y-3">
              {popularCities.map((city) => (
                <li key={city.slug}>
                  <Link
                    href={`/${city.slug}`}
                    className="text-sm text-white/50 hover:text-emerald-400 transition-colors"
                  >
                    {city.name} ev fiyatları
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Rehber */}
          <div>
            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-5">
              Emlak Rehberi
            </h3>
            <ul className="space-y-3">
              {rehberLinks.map((link) => (
                <li key={link.slug}>
                  <Link
                    href={`/rehber/${link.slug}`}
                    className="text-sm text-white/50 hover:text-emerald-400 transition-colors"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/rehber"
                  className="text-sm text-emerald-400/70 hover:text-emerald-400 transition-colors font-medium"
                >
                  Tüm yazılar →
                </Link>
              </li>
            </ul>
          </div>

          {/* İletişim */}
          <div>
            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-5">
              İletişim
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="mailto:info@evdeger.com"
                  className="text-sm text-white/50 hover:text-emerald-400 transition-colors flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                  </svg>
                  info@evdeger.com
                </Link>
              </li>
              <li>
                <Link
                  href="#nasil-calisir"
                  className="text-sm text-white/50 hover:text-emerald-400 transition-colors flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
                  </svg>
                  Nasıl Çalışır?
                </Link>
              </li>
              <li>
                <Link
                  href="/rehber"
                  className="text-sm text-white/50 hover:text-emerald-400 transition-colors flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                  </svg>
                  Emlak Rehberi
                </Link>
              </li>
              <li>
                <Link
                  href="/gizlilik"
                  className="text-sm text-white/50 hover:text-emerald-400 transition-colors flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                  </svg>
                  Gizlilik Politikası
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider & Bottom */}
        <div className="mt-12 border-t border-white/10 pt-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <p className="text-xs text-white/30">
                © {new Date().getFullYear()} EvDeğer. Tüm hakları saklıdır.
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[10px] text-white/40">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Powered by EvDeğer AI
              </span>
            </div>
            <p className="text-xs text-white/20 text-center sm:text-right max-w-md">
              EvDeğer bir tahmini değerleme platformudur. Kesin değer için profesyonel ekspertiz gereklidir.
              Gösterilen değerler yatırım tavsiyesi niteliği taşımaz.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
