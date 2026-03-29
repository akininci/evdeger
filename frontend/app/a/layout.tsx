import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EvDeğer — Hızlı Değerleme",
  description: "Sadece il ve ilçe seçerek evinizin tahmini değerini anında öğrenin.",
};

export default function EvDegerALayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-page-a="true">
      <style dangerouslySetInnerHTML={{ __html: `
        [data-page-a] ~ *, body > :not(#main-content):not(main):not(script):not(style) {
          /* handled by specific selectors below */
        }
        /* Hide header, footer, skip-link, and AB banner for /a pages */
        body > header,
        body > footer,
        body > a.skip-link,
        body > .relative.bg-gradient-to-r,
        body > div.relative {
          display: none !important;
        }
        body {
          background: #ffffff !important;
          color: #000000 !important;
        }
        main#main-content {
          padding-top: 0 !important;
        }
      `}} />
      {children}
    </div>
  );
}
