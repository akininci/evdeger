// Blog article data for EvDeğer Rehber section
export interface Article {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  date: string;
  author: string;
  readTime: string;
  category: string;
  coverImage: string;
  excerpt: string;
}

export const articles: Article[] = [
  {
    slug: "turkiye-ev-fiyatlari-2026",
    title: "Türkiye'de Ev Fiyatları 2026: İl Bazlı Güncel Analiz",
    metaTitle: "Türkiye Ev Fiyatları 2026 — İl Bazlı Güncel Konut Fiyat Analizi | EvDeğer",
    metaDescription: "2026 yılında Türkiye'de ev fiyatları nasıl şekilleniyor? 81 ilde güncel m² fiyatları, en pahalı ve en uygun şehirler, bölgesel fiyat karşılaştırmaları.",
    date: "2026-03-15",
    author: "EvDeğer Araştırma Ekibi",
    readTime: "8 dk",
    category: "Piyasa Analizi",
    coverImage: "/og-image.png",
    excerpt: "2026 yılında Türkiye emlak piyasasında il bazlı fiyat farklılıkları dikkat çekici boyutlara ulaştı. İşte güncel verilerle 81 ilin ev fiyatları analizi.",
  },
  {
    slug: "ev-degerini-nasil-ogrenirsiniz",
    title: "Evinizin Değerini Nasıl Öğrenirsiniz? 5 Adımda Rehber",
    metaTitle: "Evinizin Değerini Nasıl Öğrenirsiniz? 5 Adımda Rehber | EvDeğer",
    metaDescription: "Evinizin gerçek piyasa değerini öğrenmenin 5 pratik yolu. Online değerleme, ekspertiz, emlak danışmanı ve karşılaştırmalı analiz yöntemleri.",
    date: "2026-03-12",
    author: "EvDeğer Araştırma Ekibi",
    readTime: "6 dk",
    category: "Rehber",
    coverImage: "/og-image.png",
    excerpt: "Evinizi satmayı ya da kiralamayı düşünüyorsanız, doğru fiyat belirlemek kritik önem taşır. İşte evinizin değerini öğrenmenin 5 adımı.",
  },
  {
    slug: "istanbul-en-pahali-ilceler",
    title: "İstanbul'un En Pahalı 10 İlçesi — 2026 Güncel Fiyatlar",
    metaTitle: "İstanbul En Pahalı İlçeler 2026 — Güncel m² Fiyatları | EvDeğer",
    metaDescription: "İstanbul'un en pahalı 10 ilçesinde 2026 güncel m² fiyatları. Beşiktaş, Sarıyer, Kadıköy ve diğer premium ilçelerin emlak fiyat analizi.",
    date: "2026-03-10",
    author: "EvDeğer Araştırma Ekibi",
    readTime: "7 dk",
    category: "İstanbul",
    coverImage: "/og-image.png",
    excerpt: "İstanbul'da emlak fiyatları ilçeden ilçeye büyük farklılıklar gösteriyor. İşte 2026 yılında en pahalı 10 ilçe ve güncel m² fiyatları.",
  },
  {
    slug: "kiralik-yatirim-getirisi",
    title: "Kiralık Ev Yatırımı: Hangi Şehirler En Çok Kazandırıyor?",
    metaTitle: "Kiralık Ev Yatırımı 2026 — En Kazançlı Şehirler | EvDeğer",
    metaDescription: "Kiralık ev yatırımında hangi şehirler en yüksek getiriyi sunuyor? Brüt kira getirisi, amortisman süreleri ve yatırım analizi.",
    date: "2026-03-08",
    author: "EvDeğer Araştırma Ekibi",
    readTime: "9 dk",
    category: "Yatırım",
    coverImage: "/og-image.png",
    excerpt: "Türkiye'de kiralık ev yatırımı hâlâ cazip mi? Şehirlere göre brüt kira getirisi oranları ve yatırım karşılaştırması.",
  },
  {
    slug: "emlak-degerleme-nasil-yapilir",
    title: "Emlak Değerleme Nasıl Yapılır? Profesyonel Yöntemler",
    metaTitle: "Emlak Değerleme Nasıl Yapılır? Profesyonel Yöntemler ve Adımlar | EvDeğer",
    metaDescription: "Emlak değerleme yöntemleri: karşılaştırma, gelir kapitalizasyonu, maliyet yaklaşımı. Profesyonel ekspertiz süreci ve online değerleme araçları.",
    date: "2026-03-05",
    author: "EvDeğer Araştırma Ekibi",
    readTime: "10 dk",
    category: "Eğitim",
    coverImage: "/og-image.png",
    excerpt: "Bir gayrimenkulün gerçek değerini belirlemek hem bilim hem sanattır. İşte profesyonel değerleme yöntemleri ve nasıl çalıştıkları.",
  },
];

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}

export function getAllArticleSlugs(): string[] {
  return articles.map((a) => a.slug);
}
