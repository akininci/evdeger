import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sayfa Bulunamadı",
  description: "Aradığınız sayfa bulunamadı.",
};

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center px-4 text-center">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 h-[300px] w-[300px] rounded-full bg-blue-500/5 blur-[100px]" />
        <div className="absolute bottom-1/3 right-1/4 h-[200px] w-[200px] rounded-full bg-emerald-500/5 blur-[80px]" />
      </div>

      <div className="relative z-10">
        <div className="text-8xl mb-6">🏠</div>
        <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Sayfa Bulunamadı
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Aradığınız sayfa mevcut değil veya taşınmış olabilir.
          Ana sayfadan evinizin değerini öğrenebilirsiniz.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:shadow-xl hover:-translate-y-0.5"
          >
            🔍 Ana Sayfaya Dön
          </Link>
          <Link
            href="/istanbul"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-background px-6 py-3 text-base font-medium text-foreground transition-all hover:bg-muted"
          >
            İstanbul Fiyatları →
          </Link>
        </div>

        {/* Popular links */}
        <div className="mt-12">
          <p className="text-sm text-muted-foreground mb-3">Popüler Bölgeler</p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { name: "İstanbul", slug: "istanbul" },
              { name: "Ankara", slug: "ankara" },
              { name: "İzmir", slug: "izmir" },
              { name: "Antalya", slug: "antalya" },
              { name: "Bursa", slug: "bursa" },
            ].map((city) => (
              <Link
                key={city.slug}
                href={`/${city.slug}`}
                className="inline-flex items-center rounded-full border border-border/50 bg-background px-4 py-1.5 text-sm text-muted-foreground hover:text-emerald-500 hover:border-emerald-500/50 transition-colors"
              >
                {city.name}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
