"""
EvDeğer — Emlakjet Scraper
Emlakjet.com'dan satılık/kiralık daire ilanlarını çeker.
Hepsiemlak Cloudflare koruması nedeniyle birincil kaynak olarak kullanılır.

URL Pattern (2026):
  Satılık: https://www.emlakjet.com/satilik-daire/izmir-karabaglar
  Kiralık: https://www.emlakjet.com/kiralik-daire/izmir-karabaglar
  Sayfalama: ?sayfa=2

NOT: Mahalle bazlı URL'ler (izmir-karabaglar-esenyali-mah) 404 döner.
İlçe bazında çekip, ilanları mahalle adına göre filtreliyoruz.
"""

import logging
import re

from bs4 import BeautifulSoup

from scrapers.base import BaseScraper, ScrapedListing

logger = logging.getLogger(__name__)

# Türkçe karakter → ASCII dönüşüm tablosu (emlakjet URL formatı)
_TR_TO_ASCII = str.maketrans({
    "ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u",
    "Ç": "c", "Ğ": "g", "İ": "i", "Ö": "o", "Ş": "s", "Ü": "u",
})


def _normalize_turkish(text: str) -> str:
    """Türkçe metni küçük harfle ASCII'ye çevirir (karşılaştırma için)."""
    return text.lower().strip().translate(_TR_TO_ASCII)


class EmlakjetScraper(BaseScraper):
    """
    Emlakjet.com scraper'ı.
    Cloudflare koruması yok — doğrudan HTTP ile çalışır.

    Strateji:
    - Her zaman İLÇE bazında çek (mahalle URL'leri 404 döner)
    - Mahalle verilmişse, ilanları mahalle adına göre filtrele
    - Sayfalama: ?sayfa=N
    """

    def __init__(self):
        super().__init__(
            source_name="emlakjet",
            base_url="https://www.emlakjet.com",
            min_delay=1.5,
            max_delay=3.5,
        )

    def _slugify(self, text: str) -> str:
        """Türkçe metni emlakjet URL slug formatına çevirir (ASCII)."""
        result = text.lower().strip().translate(_TR_TO_ASCII)
        result = re.sub(r"\s+", "-", result)
        result = re.sub(r"[^a-z0-9\-]", "", result)
        result = re.sub(r"-+", "-", result)
        return result.strip("-")

    def _build_url(
        self,
        city: str,
        district: str,
        listing_type: str = "sale",
        page: int = 1,
    ) -> str:
        """
        Emlakjet liste sayfası URL'si oluşturur.
        Her zaman ilçe bazında — mahalle URL'leri 404 döndüğü için.
        Sayfalama: ?sayfa=N
        """
        type_slug = "satilik-daire" if listing_type == "sale" else "kiralik-daire"
        city_slug = self._slugify(city)
        district_slug = self._slugify(district)

        url = f"{self.base_url}/{type_slug}/{city_slug}-{district_slug}"

        if page > 1:
            url += f"?sayfa={page}"

        return url

    async def scrape_listings(
        self,
        city: str,
        district: str,
        neighborhood: str,
        listing_type: str = "sale",
        max_pages: int = 5,
    ) -> list[ScrapedListing]:
        """
        Emlakjet'ten ilanları çeker.
        Her zaman ilçe bazında çeker, sonra mahalle filtresi uygular.
        """
        all_listings = []

        for page in range(1, max_pages + 1):
            url = self._build_url(city, district, listing_type, page)
            logger.info(f"[emlakjet] Scraping: {url}")

            html = await self._fetch(url)
            if not html:
                logger.warning(f"[emlakjet] Sayfa alınamadı: {url}")
                break

            listings = self._parse_listing_page(html, city, district, listing_type)

            if not listings:
                logger.info(f"[emlakjet] Sayfa {page}: ilan bulunamadı, durduruluyor")
                break

            all_listings.extend(listings)
            logger.info(f"[emlakjet] Sayfa {page}: {len(listings)} ilan bulundu")

            if not self._has_next_page(html, page):
                break

        # Mahalle filtresi — mahalle verilmişse sadece o mahalleyi tut
        if neighborhood and neighborhood.strip():
            neighborhood_norm = _normalize_turkish(neighborhood)
            # "mahallesi", "mah", "mah." suffixlerini kaldır
            for suffix in ["mahallesi", "mah.", "mah"]:
                if neighborhood_norm.endswith(suffix):
                    neighborhood_norm = neighborhood_norm[: -len(suffix)].strip()
                    break

            filtered = []
            for listing in all_listings:
                listing_neigh = _normalize_turkish(listing.neighborhood or "")
                # "mahallesi", "mah", "mah." suffixlerini kaldır
                for suffix in ["mahallesi", "mah.", "mah"]:
                    if listing_neigh.endswith(suffix):
                        listing_neigh = listing_neigh[: -len(suffix)].strip()
                        break

                if neighborhood_norm in listing_neigh or listing_neigh in neighborhood_norm:
                    filtered.append(listing)

            logger.info(
                f"[emlakjet] Mahalle filtresi '{neighborhood}': "
                f"{len(all_listings)} → {len(filtered)} ilan"
            )
            # Mahalle filtresi sonrası ilan yoksa, tüm ilçe verilerini dön
            # (filtrelenmiş veri de değerlidir)
            if filtered:
                all_listings = filtered
            else:
                logger.info(
                    f"[emlakjet] Mahalle filtresiyle eşleşen ilan yok, "
                    f"ilçe geneli {len(all_listings)} ilan döndürülüyor"
                )

        logger.info(
            f"[emlakjet] Toplam: {len(all_listings)} ilan "
            f"({city}/{district}/{neighborhood or 'ilçe geneli'}, {listing_type})"
        )
        return all_listings

    def _parse_listing_page(
        self,
        html: str,
        city: str,
        district: str,
        listing_type: str,
    ) -> list[ScrapedListing]:
        """
        Emlakjet liste sayfasındaki ilanları parse eder.

        Emlakjet 2026 HTML yapısı (React/Next.js RSC):
        - Kart container: div[data-id] with class styles_container__*
        - Başlık: h3 (styles_title__*)
        - Lokasyon: span (styles_location__*) → "Karabağlar - Yaşar Kemal Mahallesi"
        - Fiyat: span (styles_price__*) → "3.750.000TL"
        - QuickInfo: div (styles_quickinfoWrapper__*) → "Daire | 2+1 | 2. Kat | 120 m²"
        - Link: a[href*='/ilan/']
        """
        soup = BeautifulSoup(html, "html.parser")
        listings = []

        # İlan kartları — data-id attribute'u olan div'ler
        cards = soup.select("div[data-id]")

        if not cards:
            logger.warning("[emlakjet] Hiç ilan kartı bulunamadı (data-id)")
            return listings

        for card in cards:
            try:
                listing = self._parse_single_card(card, city, district, listing_type)
                if listing and listing.price > 0:
                    listings.append(listing)
            except Exception as e:
                logger.debug(f"[emlakjet] İlan parse hatası: {e}")
                continue

        return listings

    def _parse_single_card(
        self,
        card,
        city: str,
        district: str,
        listing_type: str,
    ) -> ScrapedListing | None:
        """
        Tek bir emlakjet ilan kartını parse eder.

        Kart yapısı:
        - h3 → başlık
        - span[class*=location] → "Karabağlar - Yaşar Kemal Mahallesi"
        - span[class*=price] → "3.750.000TL"
        - div[class*=quickinfo] → "Daire | 2+1 | 2. Kat | 120 m²"
        - a[href*=/ilan/] → ilan linki (source_id URL'den çıkar)
        """
        source_id = card.get("data-id")

        # === Fiyat ===
        price_el = card.select_one(
            "span[class*='price'], [class*='priceWrapper'] span, [class*='Price']"
        )
        price_text = price_el.get_text(strip=True) if price_el else ""
        if not price_text:
            full_text = card.get_text(" ", strip=True)
            price_match = re.search(r"([\d.]+)\s*TL", full_text)
            price_text = price_match.group(0) if price_match else ""
        price = self._parse_price(price_text)
        if not price or price <= 0:
            return None

        # === QuickInfo: "Daire | 2+1 | 2. Kat | 120 m²" ===
        quickinfo_el = card.select_one("[class*='quickinfo'], [class*='Quickinfo']")
        quickinfo_text = quickinfo_el.get_text(" ", strip=True) if quickinfo_el else ""
        full_text = card.get_text(" ", strip=True)

        # === m² ===
        sqm = None
        sqm_match = re.search(r"(\d+)\s*m²", quickinfo_text or full_text)
        if sqm_match:
            sqm = float(sqm_match.group(1))

        # === Oda sayısı ===
        rooms = None
        room_match = re.search(r"(\d\+\d)", quickinfo_text or full_text)
        if room_match:
            rooms = room_match.group(1)

        # === Kat bilgisi ===
        floor_number = None
        floor_match = re.search(r"(\d+)\.\s*[Kk]at", quickinfo_text or full_text)
        if floor_match:
            floor_number = int(floor_match.group(1))

        # === Mahalle bilgisi (lokasyon span'ından) ===
        card_neighborhood = ""
        location_el = card.select_one("span[class*='location'], [class*='Location']")
        if location_el:
            loc_text = location_el.get_text(strip=True)
            # Format: "Karabağlar - Yaşar Kemal Mahallesi"
            if " - " in loc_text:
                parts = loc_text.split(" - ", 1)
                card_neighborhood = parts[1].strip() if len(parts) > 1 else ""
                # "Yaşar Kemal Mahallesi" → "Yaşar Kemal"
                card_neighborhood = re.sub(r"\s*Mahallesi\s*$", "", card_neighborhood)
                card_neighborhood = re.sub(r"\s*Mah\.?\s*$", "", card_neighborhood)

        # === Bina yaşı ===
        building_age = None
        age_match = re.search(r"(\d+)\s*(?:yaşında|yıllık)", full_text)
        if age_match:
            building_age = int(age_match.group(1))

        # === İlan URL'si ===
        link = card.select_one("a[href*='/ilan/']")
        listing_url = None
        if link and link.get("href"):
            href = link["href"]
            if href.startswith("/"):
                listing_url = f"{self.base_url}{href}"
            elif href.startswith("http"):
                listing_url = href
            # Source ID from URL if not from data-id
            if not source_id:
                id_match = re.search(r"-(\d+)$", href)
                if id_match:
                    source_id = id_match.group(1)

        # === İlan başlığı ===
        title_el = card.select_one("h3, [class*='title'], [class*='Title']")
        title = title_el.get_text(strip=True) if title_el else full_text[:100]

        return ScrapedListing(
            source="emlakjet",
            source_id=source_id,
            listing_type=listing_type,
            property_type="apartment",
            city=city,
            district=district,
            neighborhood=card_neighborhood,
            price=price,
            currency="TRY",
            sqm=sqm,
            rooms=rooms,
            floor_number=floor_number,
            building_age=building_age,
            listing_url=listing_url,
            raw_data={"title": title, "full_text": full_text[:500]},
        )

    def _has_next_page(self, html: str, current_page: int) -> bool:
        """
        Sonraki sayfa var mı kontrol eder.
        Emlakjet 2026: sayfalama linkleri ?sayfa=N formatında.
        """
        soup = BeautifulSoup(html, "html.parser")

        # Sayfalama wrapper
        pagination = soup.select_one("[class*='paginationWrapper'], [class*='Pagination']")
        if pagination:
            for link in pagination.select("a[href]"):
                href = link.get("href", "")
                # ?sayfa=N pattern
                page_match = re.search(r"[?&]sayfa=(\d+)", href)
                if page_match:
                    page_num = int(page_match.group(1))
                    if page_num == current_page + 1:
                        return True

        # Fallback: rel=next veya next class
        next_btn = soup.select_one("a[rel='next'], [class*='next']")
        if next_btn and next_btn.get("href"):
            return True

        return False
