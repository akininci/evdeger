/**
 * Mapping between GeoJSON city names (Turkish) and URL slugs used in the app.
 * GeoJSON source: alpers/Turkey-Maps-GeoJSON (tr-cities.json)
 */

const geoJsonNameToSlug: Record<string, string> = {
  "Adana": "adana",
  "Adıyaman": "adiyaman",
  "Afyon": "afyonkarahisar",
  "Ağrı": "agri",
  "Aksaray": "aksaray",
  "Amasya": "amasya",
  "Ankara": "ankara",
  "Antalya": "antalya",
  "Ardahan": "ardahan",
  "Artvin": "artvin",
  "Aydın": "aydin",
  "Balıkesir": "balikesir",
  "Bartın": "bartin",
  "Batman": "batman",
  "Bayburt": "bayburt",
  "Bilecik": "bilecik",
  "Bingöl": "bingol",
  "Bitlis": "bitlis",
  "Bolu": "bolu",
  "Burdur": "burdur",
  "Bursa": "bursa",
  "Çanakkale": "canakkale",
  "Çankırı": "cankiri",
  "Çorum": "corum",
  "Denizli": "denizli",
  "Diyarbakır": "diyarbakir",
  "Düzce": "duzce",
  "Edirne": "edirne",
  "Elazığ": "elazig",
  "Erzincan": "erzincan",
  "Erzurum": "erzurum",
  "Eskişehir": "eskisehir",
  "Gaziantep": "gaziantep",
  "Giresun": "giresun",
  "Gümüşhane": "gumushane",
  "Hakkari": "hakkari",
  "Hatay": "hatay",
  "Iğdır": "igdir",
  "Isparta": "isparta",
  "İstanbul": "istanbul",
  "İzmir": "izmir",
  "Kahramanmaraş": "kahramanmaras",
  "Karabük": "karabuk",
  "Karaman": "karaman",
  "Kars": "kars",
  "Kastamonu": "kastamonu",
  "Kayseri": "kayseri",
  "Kilis": "kilis",
  "Kırıkkale": "kirikkale",
  "Kırklareli": "kirklareli",
  "Kırşehir": "kirsehir",
  "Kocaeli": "kocaeli",
  "Konya": "konya",
  "Kütahya": "kutahya",
  "Malatya": "malatya",
  "Manisa": "manisa",
  "Mardin": "mardin",
  "Mersin": "mersin",
  "Muğla": "mugla",
  "Muş": "mus",
  "Nevşehir": "nevsehir",
  "Niğde": "nigde",
  "Ordu": "ordu",
  "Osmaniye": "osmaniye",
  "Rize": "rize",
  "Sakarya": "sakarya",
  "Samsun": "samsun",
  "Şanlıurfa": "sanliurfa",
  "Siirt": "siirt",
  "Sinop": "sinop",
  "Sivas": "sivas",
  "Şırnak": "sirnak",
  "Tekirdağ": "tekirdag",
  "Tokat": "tokat",
  "Trabzon": "trabzon",
  "Tunceli": "tunceli",
  "Uşak": "usak",
  "Van": "van",
  "Yalova": "yalova",
  "Yozgat": "yozgat",
  "Zonguldak": "zonguldak",
};

const slugToGeoJsonName: Record<string, string> = Object.fromEntries(
  Object.entries(geoJsonNameToSlug).map(([k, v]) => [v, k])
);

export function getCitySlugFromGeoJson(geoJsonName: string): string | undefined {
  return geoJsonNameToSlug[geoJsonName];
}

export function getGeoJsonNameFromSlug(slug: string): string | undefined {
  return slugToGeoJsonName[slug];
}

export function formatPrice(price: number): string {
  if (price >= 1000) {
    return `₺${(price / 1000).toFixed(0)}K`;
  }
  return `₺${price.toLocaleString("tr-TR")}`;
}

export function formatPriceFull(price: number): string {
  return `₺${price.toLocaleString("tr-TR")}`;
}
