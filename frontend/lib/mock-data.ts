// Mock data for development — will be replaced by real API calls
// =============================================================================
// DATA SOURCES & CROSS-VALIDATION (March 2026 projections):
// 1. Endeksa Mart 2025 Konut Değer Raporu (m² fiyatları + yıllık artışlar)
// 2. EVA Gayrimenkul Aralık 2025 İstanbul ilçe bazlı birim fiyatlar
// 3. TCMB Konut Fiyat Endeksi Ocak 2026 (bölgesel yıllık artışlar)
// 4. Hepsiemlak/Sahibinden piyasa verileri
// Methodology: March 2025 Endeksa base + city-specific YoY rates → March 2026
// İstanbul ilçe multipliers: EVA Dec 2025 data + 3-month growth (~8%)
// =============================================================================

import type { City, District, Neighborhood, ValuationResult } from "./api";

// All 81 cities of Turkey with realistic m² prices (TL) — March 2026
// Cross-validated against Endeksa, TCMB KFE, EVA Gayrimenkul data
// Projection: Endeksa March 2025 base × city-specific annual growth rate
const cityPrices: Record<string, number> = {
  // Tier 1: Major metros
  istanbul: 65000,   // Endeksa Mar'25: 47,913 × ~1.35 (EVA Dec'25: 60k + 3mo growth)
  ankara: 37000,     // Endeksa Mar'25: 27,814 × 1.33
  izmir: 57000,      // Endeksa Mar'25: 41,178 × 1.385 (TCMB: highest growth 38.5%)
  bursa: 36000,      // ~30% growth, sanayi + göç etkisi
  antalya: 51000,    // Endeksa Mar'25: 40,875 × 1.25
  // Tier 2: Strong secondary cities
  mugla: 83000,      // Endeksa Mar'25: 67,783 × 1.22 (en pahalı m², turizm primi)
  kocaeli: 38000,    // Sanayi koridoru, İstanbul yakınlığı
  tekirdag: 34000,   // İstanbul overflow etkisi
  aydin: 55000,      // Endeksa Nis'25: 44k × ~1.25 (Kuşadası/Didim turizm primi)
  canakkale: 58000,  // Endeksa Mar'25: 41,587 × 1.40 (yüksek artış, tarih+turizm)
  yalova: 34000,     // İstanbul bağlantılı, termal turizm
  // Tier 3: Mid-size cities
  adana: 24000,      // Çukurova bölgesi
  konya: 22000,      // Tarım + sanayi
  gaziantep: 21000,  // Sanayi, nüfus artışı
  mersin: 28000,     // Liman kenti, turizm potansiyeli
  kayseri: 24000,    // Sanayi odaklı büyüme
  eskisehir: 30000,  // Üniversite şehri, yaşam kalitesi yüksek
  samsun: 24000,     // Karadeniz'in merkezi
  denizli: 26000,    // Tekstil sanayi
  sakarya: 30000,    // İstanbul bağlantılı sanayi
  trabzon: 32000,    // Karadeniz turizmi, KTÜ
  balikesir: 28000,  // Bandırma/Edremit turizm+sanayi
  diyarbakir: 38000, // Endeksa Mar'25: 25,275 × 1.50 (en yüksek artış %61)
  manisa: 24000,     // Organize sanayi
  edirne: 24000,     // Sınır şehri turizm
  hatay: 28000,      // Endeksa Mar'25: 22,563 × 1.24 (deprem sonrası toparlanma)
  // Tier 4: Smaller / developing cities
  malatya: 20000,    // Deprem sonrası yeniden yapılanma
  erzurum: 18000,    // Doğu'nun merkezi
  van: 16000,        // Doğu Anadolu
  sanliurfa: 16000,  // Güneydoğu
  ordu: 18000,       // Karadeniz
  rize: 22000,       // Çay bölgesi, doğa turizmi
  bolu: 22000,       // Doğa turizmi
  duzce: 22000,      // İstanbul bağlantılı
  isparta: 18000,    // Gül ve lavanta
  kirklareli: 24000, // Trakya bölgesi
  // Tier 5: Eastern / less developed
  adiyaman: 14000,
  afyonkarahisar: 16000,  // Termal turizm
  agri: 8000,        // En düşük m² fiyatlı iller
  aksaray: 16000,    // Kapadokya yakınlığı
  amasya: 18000,
  artvin: 18000,
  bartin: 16000,
  batman: 14000,
  bayburt: 12000,
  bilecik: 18000,
  bingol: 12000,
  bitlis: 10000,
  burdur: 16000,
  cankiri: 14000,
  corum: 18000,
  elazig: 18000,
  erzincan: 16000,
  giresun: 18000,
  gumushane: 14000,
  hakkari: 8000,     // En düşük m² fiyatlı iller
  igdir: 10000,
  karabuk: 18000,    // Demir-çelik sanayi
  karaman: 16000,
  kars: 10000,
  kastamonu: 16000,
  kahramanmaras: 16000,  // Deprem sonrası
  kilis: 12000,
  kirikkale: 18000,
  kirsehir: 16000,
  kutahya: 16000,
  mardin: 16000,     // Turizm potansiyeli
  mus: 10000,
  nevsehir: 20000,   // Kapadokya turizm primi
  nigde: 16000,
  osmaniye: 16000,
  siirt: 12000,
  sinop: 20000,      // Doğa turizmi
  sirnak: 10000,
  sivas: 18000,
  tokat: 16000,
  tunceli: 14000,
  usak: 18000,
  yozgat: 14000,
  zonguldak: 18000,  // Maden bölgesi
  ardahan: 8000,     // En düşük m² fiyatlı iller
};

// Region scores (1-10) — based on general livability, infrastructure, services
const cityRegionScores: Record<string, number> = {
  istanbul: 8.5, ankara: 7.8, izmir: 8.2, bursa: 7.5, antalya: 8.7,
  mugla: 8.5, eskisehir: 7.9, trabzon: 7.2, kocaeli: 7.0, mersin: 7.3,
  denizli: 6.8, sakarya: 6.5, tekirdag: 6.7, balikesir: 6.8, aydin: 7.1,
  canakkale: 7.4, yalova: 7.0, bolu: 6.5, edirne: 6.6, adana: 6.2,
  gaziantep: 6.0, konya: 6.5, kayseri: 6.3, samsun: 6.5, diyarbakir: 5.5,
  hatay: 5.8, malatya: 5.5, rize: 6.2, sinop: 6.8, nevsehir: 6.5,
};

// Investment potential mapping
const cityInvestment: Record<string, "Düşük" | "Orta" | "Yüksek"> = {
  istanbul: "Yüksek", ankara: "Yüksek", izmir: "Yüksek", antalya: "Yüksek",
  mugla: "Yüksek", bursa: "Yüksek", kocaeli: "Yüksek", mersin: "Orta",
  eskisehir: "Orta", trabzon: "Orta", tekirdag: "Orta", sakarya: "Orta",
  yalova: "Orta", canakkale: "Yüksek", denizli: "Orta", balikesir: "Orta",
  diyarbakir: "Yüksek", aydin: "Yüksek", gaziantep: "Orta", hatay: "Orta",
  samsun: "Orta", adana: "Orta", konya: "Orta", kayseri: "Orta",
  nevsehir: "Orta", rize: "Orta",
};

// City-level annual gross rental yield (%)
// Source: Endeksa amortisman verileri, TCMB YKKE, piyasa verileri
// Turkey avg: ~6.1% (195.7 ay amortisman), but varies significantly by city
// İstanbul center: ~3.5-4.5%, Anadolu: ~6-8%
const cityRentalYields: Record<string, number> = {
  istanbul: 4.8,    // Pahalı m², kira/satış dengesi düşük
  ankara: 5.8,      // Memur+öğrenci talebi, uygun fiyatlar
  izmir: 5.2,       // Orta segment
  bursa: 6.0,       // Sanayi kira talebi
  antalya: 5.5,     // Turizm kaynaklı kısa dönem kira avantajı
  mugla: 4.0,       // Çok pahalı m², sezonluk kira
  kocaeli: 6.5,     // Sanayi bölgesi, güçlü kira talebi
  eskisehir: 6.5,   // Üniversite, yüksek doluluk
  trabzon: 5.8,
  mersin: 6.0,
  gaziantep: 7.0,   // Sanayi, uygun fiyat, güçlü kira
  konya: 6.5,
  adana: 6.5,
  kayseri: 7.0,
  diyarbakir: 7.5,  // Hızlı kira artışı
  samsun: 6.0,
  denizli: 6.5,
  tekirdag: 5.5,
  sakarya: 6.0,
  balikesir: 5.5,
  hatay: 6.5,
  canakkale: 4.5,   // Pahalı m², turizm şehri
  yalova: 5.5,
  edirne: 6.0,
  aydin: 4.5,       // Turizm primi, pahalı m²
  malatya: 7.0,
  erzurum: 7.5,
  van: 8.0,         // Ucuz m², yüksek kira oranı
  sanliurfa: 7.5,
  manisa: 6.5,
};

export const mockCities: City[] = [
  { name: "Adana", slug: "adana" },
  { name: "Adıyaman", slug: "adiyaman" },
  { name: "Afyonkarahisar", slug: "afyonkarahisar" },
  { name: "Ağrı", slug: "agri" },
  { name: "Aksaray", slug: "aksaray" },
  { name: "Amasya", slug: "amasya" },
  { name: "Ankara", slug: "ankara" },
  { name: "Antalya", slug: "antalya" },
  { name: "Ardahan", slug: "ardahan" },
  { name: "Artvin", slug: "artvin" },
  { name: "Aydın", slug: "aydin" },
  { name: "Balıkesir", slug: "balikesir" },
  { name: "Bartın", slug: "bartin" },
  { name: "Batman", slug: "batman" },
  { name: "Bayburt", slug: "bayburt" },
  { name: "Bilecik", slug: "bilecik" },
  { name: "Bingöl", slug: "bingol" },
  { name: "Bitlis", slug: "bitlis" },
  { name: "Bolu", slug: "bolu" },
  { name: "Burdur", slug: "burdur" },
  { name: "Bursa", slug: "bursa" },
  { name: "Çanakkale", slug: "canakkale" },
  { name: "Çankırı", slug: "cankiri" },
  { name: "Çorum", slug: "corum" },
  { name: "Denizli", slug: "denizli" },
  { name: "Diyarbakır", slug: "diyarbakir" },
  { name: "Düzce", slug: "duzce" },
  { name: "Edirne", slug: "edirne" },
  { name: "Elazığ", slug: "elazig" },
  { name: "Erzincan", slug: "erzincan" },
  { name: "Erzurum", slug: "erzurum" },
  { name: "Eskişehir", slug: "eskisehir" },
  { name: "Gaziantep", slug: "gaziantep" },
  { name: "Giresun", slug: "giresun" },
  { name: "Gümüşhane", slug: "gumushane" },
  { name: "Hakkari", slug: "hakkari" },
  { name: "Hatay", slug: "hatay" },
  { name: "Iğdır", slug: "igdir" },
  { name: "Isparta", slug: "isparta" },
  { name: "İstanbul", slug: "istanbul" },
  { name: "İzmir", slug: "izmir" },
  { name: "Kahramanmaraş", slug: "kahramanmaras" },
  { name: "Karabük", slug: "karabuk" },
  { name: "Karaman", slug: "karaman" },
  { name: "Kars", slug: "kars" },
  { name: "Kastamonu", slug: "kastamonu" },
  { name: "Kayseri", slug: "kayseri" },
  { name: "Kilis", slug: "kilis" },
  { name: "Kırıkkale", slug: "kirikkale" },
  { name: "Kırklareli", slug: "kirklareli" },
  { name: "Kırşehir", slug: "kirsehir" },
  { name: "Kocaeli", slug: "kocaeli" },
  { name: "Konya", slug: "konya" },
  { name: "Kütahya", slug: "kutahya" },
  { name: "Malatya", slug: "malatya" },
  { name: "Manisa", slug: "manisa" },
  { name: "Mardin", slug: "mardin" },
  { name: "Mersin", slug: "mersin" },
  { name: "Muğla", slug: "mugla" },
  { name: "Muş", slug: "mus" },
  { name: "Nevşehir", slug: "nevsehir" },
  { name: "Niğde", slug: "nigde" },
  { name: "Ordu", slug: "ordu" },
  { name: "Osmaniye", slug: "osmaniye" },
  { name: "Rize", slug: "rize" },
  { name: "Sakarya", slug: "sakarya" },
  { name: "Samsun", slug: "samsun" },
  { name: "Şanlıurfa", slug: "sanliurfa" },
  { name: "Siirt", slug: "siirt" },
  { name: "Sinop", slug: "sinop" },
  { name: "Şırnak", slug: "sirnak" },
  { name: "Sivas", slug: "sivas" },
  { name: "Tekirdağ", slug: "tekirdag" },
  { name: "Tokat", slug: "tokat" },
  { name: "Trabzon", slug: "trabzon" },
  { name: "Tunceli", slug: "tunceli" },
  { name: "Uşak", slug: "usak" },
  { name: "Van", slug: "van" },
  { name: "Yalova", slug: "yalova" },
  { name: "Yozgat", slug: "yozgat" },
  { name: "Zonguldak", slug: "zonguldak" },
];

export const mockDistricts: Record<string, District[]> = {
  istanbul: [
    { name: "Adalar", slug: "adalar" },
    { name: "Arnavutköy", slug: "arnavutkoy" },
    { name: "Ataşehir", slug: "atasehir" },
    { name: "Avcılar", slug: "avcilar" },
    { name: "Bağcılar", slug: "bagcilar" },
    { name: "Bahçelievler", slug: "bahcelievler" },
    { name: "Bakırköy", slug: "bakirkoy" },
    { name: "Başakşehir", slug: "basaksehir" },
    { name: "Bayrampaşa", slug: "bayrampasa" },
    { name: "Beşiktaş", slug: "besiktas" },
    { name: "Beykoz", slug: "beykoz" },
    { name: "Beylikdüzü", slug: "beylikduzu" },
    { name: "Beyoğlu", slug: "beyoglu" },
    { name: "Büyükçekmece", slug: "buyukcekmece" },
    { name: "Çatalca", slug: "catalca" },
    { name: "Çekmeköy", slug: "cekmekoy" },
    { name: "Esenler", slug: "esenler" },
    { name: "Esenyurt", slug: "esenyurt" },
    { name: "Eyüpsultan", slug: "eyupsultan" },
    { name: "Fatih", slug: "fatih" },
    { name: "Gaziosmanpaşa", slug: "gaziosmanpasa" },
    { name: "Güngören", slug: "gungoren" },
    { name: "Kadıköy", slug: "kadikoy" },
    { name: "Kağıthane", slug: "kagithane" },
    { name: "Kartal", slug: "kartal" },
    { name: "Küçükçekmece", slug: "kucukcekmece" },
    { name: "Maltepe", slug: "maltepe" },
    { name: "Pendik", slug: "pendik" },
    { name: "Sancaktepe", slug: "sancaktepe" },
    { name: "Sarıyer", slug: "sariyer" },
    { name: "Silivri", slug: "silivri" },
    { name: "Sultanbeyli", slug: "sultanbeyli" },
    { name: "Sultangazi", slug: "sultangazi" },
    { name: "Şile", slug: "sile" },
    { name: "Şişli", slug: "sisli" },
    { name: "Tuzla", slug: "tuzla" },
    { name: "Ümraniye", slug: "umraniye" },
    { name: "Üsküdar", slug: "uskudar" },
    { name: "Zeytinburnu", slug: "zeytinburnu" },
  ],
  ankara: [
    { name: "Akyurt", slug: "akyurt" },
    { name: "Altındağ", slug: "altindag" },
    { name: "Ayaş", slug: "ayas" },
    { name: "Bala", slug: "bala" },
    { name: "Beypazarı", slug: "beypazari" },
    { name: "Çamlıdere", slug: "camlidere" },
    { name: "Çankaya", slug: "cankaya" },
    { name: "Çubuk", slug: "cubuk" },
    { name: "Elmadağ", slug: "elmadag" },
    { name: "Etimesgut", slug: "etimesgut" },
    { name: "Evren", slug: "evren" },
    { name: "Gölbaşı", slug: "golbasi" },
    { name: "Güdül", slug: "gudul" },
    { name: "Haymana", slug: "haymana" },
    { name: "Kahramankazan", slug: "kahramankazan" },
    { name: "Kalecik", slug: "kalecik" },
    { name: "Keçiören", slug: "kecioren" },
    { name: "Kızılcahamam", slug: "kizilcahamam" },
    { name: "Mamak", slug: "mamak" },
    { name: "Nallıhan", slug: "nallihan" },
    { name: "Polatlı", slug: "polatli" },
    { name: "Pursaklar", slug: "pursaklar" },
    { name: "Sincan", slug: "sincan" },
    { name: "Şereflikoçhisar", slug: "sereflikochhisar" },
    { name: "Yenimahalle", slug: "yenimahalle" },
  ],
  izmir: [
    { name: "Aliağa", slug: "aliaga" },
    { name: "Balçova", slug: "balcova" },
    { name: "Bayındır", slug: "bayindir" },
    { name: "Bayraklı", slug: "bayrakli" },
    { name: "Bergama", slug: "bergama" },
    { name: "Beydağ", slug: "beydag" },
    { name: "Bornova", slug: "bornova" },
    { name: "Buca", slug: "buca" },
    { name: "Çeşme", slug: "cesme" },
    { name: "Çiğli", slug: "cigli" },
    { name: "Dikili", slug: "dikili" },
    { name: "Foça", slug: "foca" },
    { name: "Gaziemir", slug: "gaziemir" },
    { name: "Güzelbahçe", slug: "guzelbahce" },
    { name: "Karabağlar", slug: "karabaglar" },
    { name: "Karaburun", slug: "karaburun" },
    { name: "Karşıyaka", slug: "karsiyaka" },
    { name: "Kemalpaşa", slug: "kemalpasa" },
    { name: "Kınık", slug: "kinik" },
    { name: "Kiraz", slug: "kiraz" },
    { name: "Konak", slug: "konak" },
    { name: "Menderes", slug: "menderes" },
    { name: "Menemen", slug: "menemen" },
    { name: "Narlıdere", slug: "narlidere" },
    { name: "Ödemiş", slug: "odemis" },
    { name: "Seferihisar", slug: "seferihisar" },
    { name: "Selçuk", slug: "selcuk" },
    { name: "Tire", slug: "tire" },
    { name: "Torbalı", slug: "torbali" },
    { name: "Urla", slug: "urla" },
  ],
  bursa: [
    { name: "Nilüfer", slug: "nilufer" },
    { name: "Osmangazi", slug: "osmangazi" },
    { name: "Yıldırım", slug: "yildirim" },
    { name: "Mudanya", slug: "mudanya" },
    { name: "Gemlik", slug: "gemlik" },
    { name: "Gürsu", slug: "gursu" },
    { name: "Kestel", slug: "kestel" },
    { name: "İnegöl", slug: "inegol" },
    { name: "Orhangazi", slug: "orhangazi" },
    { name: "M.Kemalpaşa", slug: "mustafakemalpasa" },
  ],
  antalya: [
    { name: "Muratpaşa", slug: "muratpasa" },
    { name: "Konyaaltı", slug: "konyaalti" },
    { name: "Kepez", slug: "kepez" },
    { name: "Aksu", slug: "aksu" },
    { name: "Döşemealtı", slug: "dosemealti" },
    { name: "Alanya", slug: "alanya" },
    { name: "Manavgat", slug: "manavgat" },
    { name: "Kemer", slug: "kemer" },
    { name: "Kaş", slug: "kas" },
    { name: "Serik", slug: "serik" },
    { name: "Kumluca", slug: "kumluca" },
    { name: "Finike", slug: "finike" },
    { name: "Demre", slug: "demre" },
    { name: "Gazipaşa", slug: "gazipasa" },
    { name: "Akseki", slug: "akseki" },
  ],
};

export const mockNeighborhoods: Record<string, Neighborhood[]> = {
  kadikoy: [
    { name: "Caferağa", slug: "caferaga" },
    { name: "Fenerbahçe", slug: "fenerbahce" },
    { name: "Moda", slug: "moda" },
    { name: "Göztepe", slug: "goztepe" },
    { name: "Bostancı", slug: "bostanci" },
    { name: "Suadiye", slug: "suadiye" },
    { name: "Caddebostan", slug: "caddebostan" },
    { name: "Acıbadem", slug: "acibadem" },
    { name: "Koşuyolu", slug: "kosuyolu" },
    { name: "Rasimpaşa", slug: "rasimpasa" },
  ],
  besiktas: [
    { name: "Etiler", slug: "etiler" },
    { name: "Levent", slug: "levent" },
    { name: "Bebek", slug: "bebek" },
    { name: "Ortaköy", slug: "ortakoy" },
    { name: "Arnavutköy", slug: "arnavutkoy" },
  ],
  cankaya: [
    { name: "Kızılay", slug: "kizilay" },
    { name: "Bahçelievler", slug: "bahcelievler" },
    { name: "Gaziosmanpaşa", slug: "gaziosmanpasa" },
    { name: "Ayrancı", slug: "ayranci" },
    { name: "Çayyolu", slug: "cayyolu" },
    { name: "Ümitköy", slug: "umitkoy" },
    { name: "Dikmen", slug: "dikmen" },
  ],
  karabaglar: [
    { name: "Esenyalı", slug: "esenyali" },
    { name: "Günaltay", slug: "gunaltay" },
    { name: "Bozyaka", slug: "bozyaka" },
    { name: "Cennetçeşme", slug: "cennetcesme" },
    { name: "Limontepe", slug: "limontepe" },
  ],
  bornova: [
    { name: "Erzene", slug: "erzene" },
    { name: "Kazımdirik", slug: "kazimdirik" },
    { name: "Evka 3", slug: "evka-3" },
  ],
  karsiyaka: [
    { name: "Bostanlı", slug: "bostanli" },
    { name: "Mavişehir", slug: "mavisehir" },
    { name: "Alsancak", slug: "alsancak" },
  ],
  muratpasa: [
    { name: "Lara", slug: "lara" },
    { name: "Kalekapısı", slug: "kalekapisi" },
    { name: "Memurevleri", slug: "memurevleri" },
  ],
  konyaalti: [
    { name: "Liman", slug: "liman" },
    { name: "Hurma", slug: "hurma" },
    { name: "Sarısu", slug: "sarisu" },
  ],
};

// =============================================================================
// DISTRICT PRICE MULTIPLIERS (relative to city average)
// =============================================================================
// Source: EVA Gayrimenkul Aralık 2025 İstanbul ilçe bazlı birim fiyatlar
// İstanbul base: ~65,000 TL/m² (March 2026 projection)
// Methodology: (EVA Dec 2025 price × 1.08 growth) / city_avg
// Cross-checked with Endeksa, Hepsiemlak, Sahibinden piyasa verileri
// =============================================================================
const districtPriceMultipliers: Record<string, Record<string, number>> = {
  istanbul: {
    // Premium (>100k TL/m²) — Boğaz hattı + prestij
    besiktas: 2.40,    // EVA Dec'25: 144,500 → Mar'26 ~156k → 156/65 = 2.40
    kadikoy: 2.35,     // EVA Dec'25: 143,750 → Mar'26 ~155k → 155/65 = 2.38
    sariyer: 2.20,     // EVA Dec'25: 134,500 → Mar'26 ~145k → 145/65 = 2.23
    bakirkoy: 1.65,    // EVA Dec'25: 102,000 → Mar'26 ~110k
    // Upper-mid (65-100k TL/m²)
    beykoz: 1.55,      // EVA Dec'25: 95,000 → Mar'26 ~103k
    adalar: 1.45,      // EVA Dec'25: 90,000 → Ada primi
    uskudar: 1.35,     // EVA Dec'25: 83,000 → Boğaz etkisi
    sisli: 1.20,       // EVA Dec'25: 73,000 → İş merkezi
    atasehir: 1.18,    // EVA Dec'25: 72,500 → Finans merkezi
    maltepe: 1.12,     // EVA Dec'25: 69,000
    beyoglu: 1.10,     // EVA Dec'25: 68,500 → Tarihi yarımada
    zeytinburnu: 1.08, // EVA Dec'25: 67,500 → Metro + dönüşüm
    // Mid (50-65k TL/m²)
    kartal: 1.05,      // EVA Dec'25: 65,000
    umraniye: 1.02,    // EVA Dec'25: 63,250
    sile: 1.02,        // EVA Dec'25: 63,000 → Doğa primi
    eyupsultan: 1.00,  // EVA Dec'25: 62,000 → Dönüşüm bölgesi
    basaksehir: 0.98,  // EVA Dec'25: 60,500 → Yeni yapılaşma
    kagithane: 0.94,   // EVA Dec'25: 58,000 → Dönüşüm
    cekmekoy: 0.90,    // EVA Dec'25: 56,250
    tuzla: 0.88,       // EVA Dec'25: 54,500
    pendik: 0.87,      // EVA Dec'25: 54,000 → Sabiha Gökçen etkisi
    // Lower-mid (35-50k TL/m²)
    bayrampasa: 0.78,  // EVA Dec'25: 48,500
    buyukcekmece: 0.76,// EVA Dec'25: 47,500
    bahcelievler: 0.75,// EVA Dec'25: 46,500
    kucukcekmece: 0.75,// EVA Dec'25: 46,500
    sancaktepe: 0.72,  // EVA Dec'25: 44,500
    catalca: 0.70,     // EVA Dec'25: 44,000 → Kırsal
    bagcilar: 0.70,    // EVA Dec'25: 43,500
    sultanbeyli: 0.67, // EVA Dec'25: 42,000
    gaziosmanpasa: 0.66,// EVA Dec'25: 41,000
    avcilar: 0.65,     // EVA Dec'25: 40,750
    beylikduzu: 0.64,  // EVA Dec'25: 39,800
    esenler: 0.63,     // EVA Dec'25: 39,500
    fatih: 0.63,       // EVA Dec'25: 39,500 → Tarihi alan kısıtları
    // Budget (<35k TL/m²)
    arnavutkoy: 0.60,  // EVA Dec'25: 37,250 → Gelişmekte
    silivri: 0.60,     // EVA Dec'25: 37,250 → Uzak
    sultangazi: 0.56,  // EVA Dec'25: 34,800
    gungoren: 0.55,    // EVA Dec'25: 34,500
    esenyurt: 0.46,    // EVA Dec'25: 28,500 → En ucuz ilçe (~30k Mar'26)
  },
  ankara: {
    // Çankaya dominates Ankara
    cankaya: 1.55,     // Ankara'nın Kadıköy'ü — en prestijli
    yenimahalle: 1.15, // Batıkent, Çayyolu overflow
    etimesgut: 1.00,   // Orta segment, yeni yapılar
    golbasi: 1.10,     // ODTÜ/Bilkent yakını, doğa
    kecioren: 0.85,    // Büyük nüfus, karışık yapı stoku
    mamak: 0.70,       // Dönüşüm bölgesi
    pursaklar: 0.75,   // Gelişmekte olan
    sincan: 0.65,      // Bütçe dostu
    altindag: 0.60,    // Tarihi ama bakımsız stok
    kahramankazan: 0.60,
    cubuk: 0.55,
    polatli: 0.50,     // Uzak ilçe
    beypazari: 0.55,   // Turizm potansiyeli
    akyurt: 0.50,
    ayas: 0.45,
    bala: 0.40,
    camlidere: 0.40,
    elmadag: 0.50,
    evren: 0.40,
    gudul: 0.40,
    haymana: 0.40,
    kalecik: 0.45,
    kizilcahamam: 0.50,
    nallihan: 0.45,
    sereflikochhisar: 0.40,
  },
  izmir: {
    // İzmir — TCMB: en yüksek yıllık artış %38.5
    cesme: 1.70,       // Turizm+yazlık primi, Bodrum etkisi
    guzelbahce: 1.45,  // Sahil, az yapılaşma
    karsiyaka: 1.40,   // İzmir'in Kadıköy'ü
    narlidere: 1.38,   // Sahil, prestijli
    urla: 1.35,        // Bağ evi + turizm
    balcova: 1.30,     // Merkezi, termal
    konak: 1.20,       // Şehir merkezi
    bornova: 1.10,     // Ege Üniversitesi, genç nüfus
    bayrakli: 1.05,    // Yeni iş merkezi
    gaziemir: 0.90,    // Havalimanı yakını
    buca: 0.85,        // Büyük nüfus, karışık
    karabaglar: 0.82,  // Orta-düşük segment
    cigli: 0.78,       // Gelişmekte
    seferihisar: 0.80, // Cittaslow, turizm
    foca: 0.72,        // Tatil bölgesi ama uzak
    aliaga: 0.70,      // Sanayi
    menemen: 0.58,     // Bütçe dostu
    kemalpasa: 0.55,   // Sanayi bölgesi
    torbali: 0.52,     // Tarım+sanayi
    menderes: 0.58,    // Gelişmekte
    dikili: 0.58,
    selcuk: 0.58,      // Turizm (Efes)
    tire: 0.48,
    odemis: 0.48,
    bergama: 0.48,
    bayindir: 0.43,
    kinik: 0.38,
    kiraz: 0.38,
    beydag: 0.38,
    karaburun: 0.50,   // Doğa + sakinlik primi
  },
  bursa: {
    nilufer: 1.45,     // Bursa'nın en prestijli ilçesi
    osmangazi: 1.10,   // Şehir merkezi
    mudanya: 1.25,     // Sahil, İstanbul bağlantılı
    yildirim: 0.80,
    gemlik: 0.72,      // Sanayi + sahil
    gursu: 0.70,
    kestel: 0.65,
    inegol: 0.60,      // Mobilya sanayi
    orhangazi: 0.55,
    mustafakemalpasa: 0.50,
  },
  antalya: {
    // Antalya — turizm primi ağırlıklı
    konyaalti: 1.55,   // Plaj + şehir merkezi, en pahalı
    kas: 1.50,         // Butik turizm, doğa
    muratpasa: 1.30,   // Lara bölgesi, şehir merkezi
    alanya: 1.35,      // Yabancı yatırımcı, turizm
    kemer: 1.20,       // Resort bölgesi
    dosemealti: 0.90,  // Gelişmekte, doğa
    kepez: 0.78,       // Büyük nüfus, bütçe dostu
    aksu: 0.72,        // Havalimanı yakını
    serik: 0.62,       // Belek turizm, yerleşim ucuz
    manavgat: 0.70,    // Turizm ama iç kesim
    kumluca: 0.48,     // Tarım
    finike: 0.48,
    demre: 0.48,
    gazipasa: 0.48,
    akseki: 0.30,      // Dağ ilçesi
  },
};

// =============================================================================
// DISTRICT-LEVEL RENTAL YIELD ADJUSTMENTS
// Premium districts have lower yields (high price, relatively lower rent)
// Budget districts have higher yields (affordable price, strong rent demand)
// =============================================================================
const districtRentalYieldAdjustments: Record<string, Record<string, number>> = {
  istanbul: {
    // Premium: lower yields (~3-4%)
    besiktas: 0.70,    // Very expensive m², rent can't keep up → ~3.4%
    kadikoy: 0.72,     // Similar to Beşiktaş → ~3.5%
    sariyer: 0.75,     // Boğaz primi → ~3.6%
    bakirkoy: 0.82,    // Upper-mid → ~3.9%
    beykoz: 0.80,
    adalar: 0.65,      // Very low rental demand, seasonal
    // Mid: average yields
    sisli: 0.90,       // Office workers, strong demand
    atasehir: 0.95,    // Finance center, corporate demand
    uskudar: 0.88,
    // Budget: higher yields (~6-8%)
    esenyurt: 1.40,    // Cheapest m², very high rental demand → ~6.7%
    sultanbeyli: 1.35,
    sultangazi: 1.30,
    bagcilar: 1.25,
    esenler: 1.25,
    arnavutkoy: 1.15,
    fatih: 1.20,       // Tourist rental + local → ~5.8%
  },
  ankara: {
    cankaya: 0.82,     // Premium → ~4.8%
    kecioren: 1.10,    // High demand, students → ~6.4%
    mamak: 1.20,
    sincan: 1.15,
    yenimahalle: 0.95,
  },
  izmir: {
    cesme: 0.60,       // Seasonal, very expensive → ~3.1%
    karsiyaka: 0.85,   // Premium → ~4.4%
    urla: 0.65,        // Yazlık → ~3.4%
    bornova: 1.10,     // Student demand → ~5.7%
    buca: 1.15,        // Budget, high demand
    konak: 0.90,
  },
};

// Get city info by slug
export function getCityBySlug(slug: string): City | undefined {
  return mockCities.find(c => c.slug === slug);
}

// Get districts for a city
export function getDistrictsForCity(citySlug: string): District[] {
  return mockDistricts[citySlug] || [];
}

// Get neighborhoods for a district
export function getNeighborhoodsForDistrict(districtSlug: string): Neighborhood[] {
  return mockNeighborhoods[districtSlug] || [];
}

// Get district info by slug within a city
export function getDistrictBySlug(citySlug: string, districtSlug: string): District | undefined {
  const districts = mockDistricts[citySlug] || [];
  return districts.find(d => d.slug === districtSlug);
}

// Get average m² price for a city
export function getCityAvgPrice(citySlug: string): number {
  return cityPrices[citySlug] || 18000;
}

// Get average m² price for a district
export function getDistrictAvgPrice(citySlug: string, districtSlug: string): number {
  const cityPrice = cityPrices[citySlug] || 18000;
  const multiplier = districtPriceMultipliers[citySlug]?.[districtSlug] || 1.0;
  return Math.round(cityPrice * multiplier);
}

// Get annual gross rental yield for a city+district (%)
export function getGrossRentalYield(citySlug: string, districtSlug?: string): number {
  const cityYield = cityRentalYields[citySlug] || 6.5; // Turkey avg ~6.1%
  if (districtSlug) {
    const adjustment = districtRentalYieldAdjustments[citySlug]?.[districtSlug] || 1.0;
    return Number((cityYield * adjustment).toFixed(1));
  }
  return cityYield;
}

// Get average rent per m² for a district (monthly)
// Based on: monthlyRent = (salePrice × annualYield) / 12
export function getDistrictAvgRent(citySlug: string, districtSlug: string): number {
  const districtPrice = getDistrictAvgPrice(citySlug, districtSlug);
  const annualYield = getGrossRentalYield(citySlug, districtSlug) / 100;
  return Math.round((districtPrice * annualYield) / 12);
}

// Get all city slugs (for sitemap)
export function getAllCitySlugs(): string[] {
  return mockCities.map(c => c.slug);
}

// Get all city+district pairs (for sitemap)
export function getAllCityDistrictPairs(): Array<{ city: string; district: string }> {
  const pairs: Array<{ city: string; district: string }> = [];
  for (const [citySlug, districts] of Object.entries(mockDistricts)) {
    for (const district of districts) {
      pairs.push({ city: citySlug, district: district.slug });
    }
  }
  return pairs;
}

// Top 20 cities for static generation
export const TOP_CITIES = [
  "istanbul", "ankara", "izmir", "bursa", "antalya",
  "adana", "konya", "gaziantep", "mersin", "kayseri",
  "eskisehir", "diyarbakir", "samsun", "denizli", "kocaeli",
  "sakarya", "trabzon", "mugla", "tekirdag", "hatay",
];

export function getMockValuation(
  city: string,
  district: string,
  neighborhood: string
): ValuationResult {
  // Use city + district pricing for realistic data
  const cityBasePrice = cityPrices[city] || 18000;
  const districtMultiplier = districtPriceMultipliers[city]?.[district] || 1.0;

  // Neighborhood-level variation: ±15% (not ±30% — keep it realistic)
  const hash = (district + neighborhood).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const neighborhoodVariation = 0.85 + (hash % 30) / 100; // 0.85 to 1.15
  const basePrice = Math.round(cityBasePrice * districtMultiplier * neighborhoodVariation);

  const typicalSqm = Math.floor(80 + (hash % 60));
  const avgValue = basePrice * typicalSqm;

  // Calculate rental yield with city+district awareness
  const grossYield = getGrossRentalYield(city, district);
  const monthlyRentPerSqm = Math.round((basePrice * grossYield / 100) / 12);
  const monthlyRentAvg = monthlyRentPerSqm * typicalSqm;
  const yearlyRent = monthlyRentAvg * 12;
  const amortizationYears = Math.round(avgValue / yearlyRent);

  // Region score
  const regionScore = cityRegionScores[city] || (5 + (hash % 30) / 10);

  // Investment potential
  const investmentPotential = cityInvestment[city] || "Düşük";

  // Active listings (realistic range)
  const activeListings = Math.floor(120 + (hash % 380));

  // Average apartment size for the region
  const avgApartmentSize = Math.floor(85 + (hash % 45));

  // YoY change — realistic range based on market data
  // Turkey avg: ~26% nominal, but varies 18-61% by city
  const cityGrowthRates: Record<string, number> = {
    istanbul: 28, ankara: 33, izmir: 38, antalya: 23, mugla: 21,
    bursa: 30, diyarbakir: 55, canakkale: 46, hatay: 20, kocaeli: 30,
    eskisehir: 28, trabzon: 30, samsun: 35,
  };
  const baseGrowth = cityGrowthRates[city] || 26;
  // Add small neighborhood variation (±5%)
  const yoyChange = baseGrowth + ((hash % 10) - 5);

  // Similar listings mock
  const similarListings = [
    {
      title: `${neighborhood} ${Math.floor(2 + (hash % 3))}+1 Daire`,
      price: Math.round(avgValue * (0.9 + Math.random() * 0.2)),
      sqm: typicalSqm + Math.floor(Math.random() * 20 - 10),
      rooms: `${Math.floor(2 + (hash % 3))}+1`,
      source: "Hepsiemlak",
      url: "https://www.hepsiemlak.com",
    },
    {
      title: `${neighborhood} ${Math.floor(3 + (hash % 2))}+1 Satılık`,
      price: Math.round(avgValue * (0.85 + Math.random() * 0.3)),
      sqm: typicalSqm + Math.floor(Math.random() * 30 - 15),
      rooms: `${Math.floor(3 + (hash % 2))}+1`,
      source: "Hepsiemlak",
      url: "https://www.hepsiemlak.com",
    },
    {
      title: `${neighborhood} Ara Kat Daire`,
      price: Math.round(avgValue * (0.95 + Math.random() * 0.1)),
      sqm: typicalSqm + Math.floor(Math.random() * 15),
      rooms: "3+1",
      source: "Sahibinden",
      url: "https://www.sahibinden.com",
    },
    {
      title: `${neighborhood} Yeni Bina ${Math.floor(2 + (hash % 3))}+1`,
      price: Math.round(avgValue * (1.05 + Math.random() * 0.15)),
      sqm: typicalSqm + Math.floor(Math.random() * 25),
      rooms: `${Math.floor(2 + (hash % 3))}+1`,
      source: "Hepsiemlak",
      url: "https://www.hepsiemlak.com",
    },
  ];

  // ==========================================================================
  // TREND DATA — Realistic 12-month price trend
  // Based on: ~2-2.5% monthly compound growth (= ~27-34% annual)
  // This matches Endeksa reported: "aylık bazda %2 artış" (March 2025)
  // and TCMB data showing steady monthly increases throughout 2025
  // ==========================================================================
  const monthlyGrowthRate = 0.022; // 2.2% monthly ≈ 30% annual
  const trendMonths = [
    "Nis '25", "May '25", "Haz '25", "Tem '25", "Ağu '25", "Eyl '25",
    "Eki '25", "Kas '25", "Ara '25", "Oca '26", "Şub '26", "Mar '26",
  ];
  const trendData = trendMonths.map((month, i) => {
    // Work backward from current price: price_i = basePrice / (1 + rate)^(11-i)
    const monthsFromNow = 11 - i;
    const historicalPrice = Math.round(basePrice / Math.pow(1 + monthlyGrowthRate, monthsFromNow));
    return { month, price_per_sqm: historicalPrice };
  });

  return {
    city,
    district,
    neighborhood,
    avg_price_per_sqm: basePrice,
    median_price_per_sqm: Math.round(basePrice * 0.96), // Median slightly below avg
    min_price_per_sqm: Math.round(basePrice * 0.72),    // -28%
    max_price_per_sqm: Math.round(basePrice * 1.35),    // +35%
    avg_rent_per_sqm: monthlyRentPerSqm,
    sample_size: Math.floor(50 + (hash % 200)),
    yoy_change: yoyChange,
    typical_sqm: typicalSqm,
    estimated_value_low: Math.round(avgValue * 0.85),
    estimated_value_high: Math.round(avgValue * 1.15),
    estimated_value_avg: avgValue,
    estimated_rent_low: Math.round(monthlyRentAvg * 0.85),
    estimated_rent_high: Math.round(monthlyRentAvg * 1.15),
    estimated_rent_avg: monthlyRentAvg,
    trend_data: trendData,
    // New fields
    active_listings: activeListings,
    avg_apartment_size: avgApartmentSize,
    region_score: Number(regionScore.toFixed(1)),
    investment_potential: investmentPotential,
    gross_rental_yield: grossYield,
    amortization_years: amortizationYears,
    similar_listings: similarListings,
    nearby_links: _generateNearbyLinks(city, district),
  };
}

function _generateNearbyLinks(city: string, district: string) {
  const trToAscii: Record<string, string> = {
    "ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u",
    "Ç": "c", "Ğ": "g", "İ": "i", "Ö": "o", "Ş": "s", "Ü": "u",
  };

  function asciiSlug(text: string): string {
    let result = text.toLowerCase().trim();
    for (const [tr, en] of Object.entries(trToAscii)) {
      result = result.replaceAll(tr, en);
    }
    return result.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }

  function turkishSlug(text: string): string {
    let result = text.toLowerCase().trim();
    return result.replace(/\s+/g, "-").replace(/[^a-zçğıöşü0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
  }

  const cityAscii = asciiSlug(city);
  const districtAscii = asciiSlug(district);
  const districtTr = encodeURIComponent(turkishSlug(district));
  const displayDistrict = district.charAt(0).toUpperCase() + district.slice(1);

  return {
    sale: [
      { source: "Emlakjet", url: `https://www.emlakjet.com/satilik-daire/${cityAscii}-${districtAscii}/`, label: `Emlakjet'te ${displayDistrict} satılık daireler` },
      { source: "Sahibinden", url: `https://www.sahibinden.com/satilik-daire/${cityAscii}-${districtAscii}`, label: `Sahibinden'de ${displayDistrict} satılık daireler` },
      { source: "Hepsiemlak", url: `https://www.hepsiemlak.com/${districtTr}-satilik/daire`, label: `Hepsiemlak'ta ${displayDistrict} satılık daireler` },
    ],
    rent: [
      { source: "Emlakjet", url: `https://www.emlakjet.com/kiralik-daire/${cityAscii}-${districtAscii}/`, label: `Emlakjet'te ${displayDistrict} kiralık daireler` },
      { source: "Sahibinden", url: `https://www.sahibinden.com/kiralik-daire/${cityAscii}-${districtAscii}`, label: `Sahibinden'de ${displayDistrict} kiralık daireler` },
      { source: "Hepsiemlak", url: `https://www.hepsiemlak.com/${districtTr}-kiralik/daire`, label: `Hepsiemlak'ta ${displayDistrict} kiralık daireler` },
    ],
  };
}
