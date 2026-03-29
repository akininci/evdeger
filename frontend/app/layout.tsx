import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { PlausibleAnalytics, PageViewTracker } from "@/components/Analytics";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://evdeger.durinx.com"),
  alternates: {
    canonical: "https://evdeger.durinx.com",
    languages: {
      "tr-TR": "https://evdeger.durinx.com",
    },
  },
  title: {
    default: "EvDeğer — Evinin Değerini Ücretsiz Öğren",
    template: "%s | EvDeğer",
  },
  description:
    "Türkiye genelinde 81 ilde ücretsiz emlak değerleme. Adresini gir, saniyeler içinde tahmini satış ve kira değerini öğren.",
  keywords: [
    "emlak değerleme",
    "ev değeri",
    "konut fiyatı",
    "kira tahmini",
    "m2 fiyat",
    "Türkiye emlak",
  ],
  openGraph: {
    title: "EvDeğer — Evinin Değerini Ücretsiz Öğren",
    description:
      "Adresini gir, saniyeler içinde tahmini satış ve kira değerini öğren. 81 ilde ücretsiz emlak değerleme.",
    type: "website",
    locale: "tr_TR",
    siteName: "EvDeğer",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "EvDeğer — Evinin Değerini Ücretsiz Öğren",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EvDeğer — Evinin Değerini Ücretsiz Öğren",
    description:
      "Adresini gir, saniyeler içinde tahmini satış ve kira değerini öğren.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <GoogleAnalytics />
        <PlausibleAnalytics />
        <PageViewTracker />
        <a href="#main-content" className="skip-link">
          İçeriğe Atla
        </a>
        <Header />
        <ErrorBoundary>
          <main id="main-content" className="flex-1 pt-0" role="main">{children}</main>
        </ErrorBoundary>
        <Footer />
      </body>
    </html>
  );
}
