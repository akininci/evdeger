import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "EvDeğer C — Yatırımcı Modu",
  description: "Profesyonel emlak yatırımcıları için detaylı analiz, bölge karşılaştırma, kira getirisi ve yatırım skorları.",
};

export default function EvDegerCLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {children}
    </div>
  );
}
