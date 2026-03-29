"""
EvDeğer — Sahibinden.com Scraper
Sahibinden.com'dan ilan verisi çeker.

NOT: Sahibinden güçlü anti-bot korumasına sahiptir.
Bu scraper temel yapıyı sağlar, production'da Playwright ile
headless browser kullanılarak geliştirilecektir.

Anti-bot önlemleri:
- CloudFlare WAF
- JavaScript challenge
- CAPTCHA
- Rate limiting (çok agresif)
- Cookie/session doğrulaması
"""

import json
import logging
import re
from urllib.parse import quote

from bs4 import BeautifulSoup

from scrapers.base import BaseScraper, ScrapedListing

logger = logging.getLogger(__name__)


class SahibindenScraper(BaseScraper):
    """
    Sahibinden.com scraper'ı.
    
    ⚠️ UYARI: Sahibinden güçlü anti-bot koruması kullanır.
    Bu sınıf temel scraping mantığını içerir ama production'da
    Playwright ile headless browser kullanılarak çalıştırılmalıdır.
    
    Mevcut durum: requests ile basic scraping dener, başarısız olursa
    graceful fail eder.
    
    Geliştirilecek özellikler:
    - Playwright ile headless Chrome
    - Cookie persistence
    - CAPTCHA çözme (2captcha/hcaptcha)
    - Proxy rotation
    """

    def __init__(self):
        super().__init__(
            source_name="sahibinden",
            base_url="https://www.sahibinden.com",
            min_delay=5.0,  # Sahibinden için daha uzun bekleme
            max_delay=10.0,
            max_retries=2,
        )

    def _build_url(
        self,
        city: str,
        district: str,
        neighborhood: str,
        listing_type: str = "sale",
        page: int = 1,
    ) -> str:
        """
        Sahibinden liste sayfası URL'si oluşturur.
        
        Sahibinden URL pattern:
        Satılık: https://www.sahibinden.com/satilik-daire/{il}-{ilce}-{mahalle}
        Kiralık: https://www.sahibinden.com/kiralik-daire/{il}-{ilce}-{mahalle}
        """
        type_slug = "satilik-daire" if listing_type == "sale" else "kiralik-daire"
        
        # Türkçe slug dönüşümü
        city_slug = self._turkish_slug(city)
        district_slug = self._turkish_slug(district)
        neighborhood_slug = self._turkish_slug(neighborhood)
        
        path = f"/{type_slug}/{city_slug}-{district_slug}-{neighborhood_slug}"
        url = f"{self.base_url}{path}"
        
        if page > 1:
            offset = (page - 1) * 20
            url += f"?pagingOffset={offset}"
        
        return url

    def _turkish_slug(self, text: str) -> str:
        """Türkçe metni Sahibinden URL formatına çevirir."""
        tr_map = {
            "ç": "c", "Ç": "C", "ğ": "g", "Ğ": "G",
            "ı": "i", "İ": "I", "ö": "o", "Ö": "O",
            "ş": "s", "Ş": "S", "ü": "u", "Ü": "U",
        }
        result = text.lower().strip()
        for tr_char, en_char in tr_map.items():
            result = result.replace(tr_char, en_char.lower())
        result = re.sub(r"[^a-z0-9\s-]", "", result)
        result = re.sub(r"\s+", "-", result)
        result = re.sub(r"-+", "-", result)
        return result.strip("-")

    async def scrape_listings(
        self,
        city: str,
        district: str,
        neighborhood: str,
        listing_type: str = "sale",
        max_pages: int = 3,
    ) -> list[ScrapedListing]:
        """
        Sahibinden'den ilan çekmeyi dener.
        
        Anti-bot koruması nedeniyle başarısız olabilir.
        Başarısız olursa boş liste döner ve log yazar.
        
        TODO: Playwright entegrasyonu ile headless browser kullan.
        """
        all_listings = []

        for page in range(1, max_pages + 1):
            url = self._build_url(city, district, neighborhood, listing_type, page)
            logger.info(f"[sahibinden] Deneniyor: {url}")

            html = await self._fetch(url)
            if not html:
                logger.warning(
                    f"[sahibinden] Sayfa alınamadı (anti-bot?): {url}. "
                    f"Playwright entegrasyonu gerekli."
                )
                break

            # Anti-bot kontrolü — CloudFlare challenge sayfası mı?
            if self._is_blocked(html):
                logger.warning(
                    f"[sahibinden] Anti-bot engeli tespit edildi. "
                    f"Playwright ile headless browser gerekli."
                )
                break

            listings = self._parse_listing_page(html, city, district, neighborhood, listing_type)

            if not listings:
                break

            all_listings.extend(listings)
            logger.info(f"[sahibinden] Sayfa {page}: {len(listings)} ilan")

        if not all_listings:
            logger.info(
                f"[sahibinden] İlan çekilemedi ({city}/{district}/{neighborhood}). "
                f"Anti-bot koruması aktif — Playwright gerekli."
            )

        return all_listings

    def _is_blocked(self, html: str) -> bool:
        """Anti-bot engeli kontrolü."""
        blocked_indicators = [
            "cf-browser-verification",
            "cf_chl_opt",
            "challenge-platform",
            "captcha",
            "robot değilim",
            "güvenlik kontrolü",
            "Just a moment",
            "Checking your browser",
        ]
        html_lower = html.lower()
        return any(indicator.lower() in html_lower for indicator in blocked_indicators)

    def _parse_listing_page(
        self,
        html: str,
        city: str,
        district: str,
        neighborhood: str,
        listing_type: str,
    ) -> list[ScrapedListing]:
        """Sahibinden liste sayfasını parse eder."""
        soup = BeautifulSoup(html, "html.parser")
        listings = []

        # Sahibinden'in tablo formatındaki ilanlar
        rows = soup.select("tr.searchResultsItem, tbody.searchResultsRowClass tr")

        for row in rows:
            try:
                listing = self._parse_row(row, city, district, neighborhood, listing_type)
                if listing and listing.price > 0:
                    listings.append(listing)
            except Exception as e:
                logger.debug(f"[sahibinden] Satır parse hatası: {e}")
                continue

        return listings

    def _parse_row(
        self,
        row,
        city: str,
        district: str,
        neighborhood: str,
        listing_type: str,
    ) -> ScrapedListing | None:
        """Tek bir tablo satırını parse eder."""

        cells = row.select("td")
        if len(cells) < 4:
            return None

        # Fiyat
        price_el = row.select_one("td.searchResultsPriceValue span, td[class*='price']")
        price = self._parse_price(price_el.get_text() if price_el else "")
        if not price:
            return None

        # Detay bilgiler
        full_text = row.get_text(" ", strip=True)

        # m²
        sqm = None
        sqm_match = re.search(r"(\d+)\s*m[²2]", full_text)
        if sqm_match:
            sqm = float(sqm_match.group(1))

        # Oda
        rooms = None
        room_match = re.search(r"(\d\+\d)", full_text)
        if room_match:
            rooms = room_match.group(1)

        # URL
        link = row.select_one("a[href*='/ilan/']")
        listing_url = None
        source_id = None
        if link:
            href = link.get("href", "")
            listing_url = f"{self.base_url}{href}" if href.startswith("/") else href
            id_match = re.search(r"/(\d+)/", href)
            if id_match:
                source_id = id_match.group(1)

        return ScrapedListing(
            source="sahibinden",
            source_id=source_id,
            listing_type=listing_type,
            property_type="apartment",
            city=city,
            district=district,
            neighborhood=neighborhood,
            price=price,
            currency="TRY",
            sqm=sqm,
            rooms=rooms,
            listing_url=listing_url,
            raw_data={"full_text": full_text[:500]},
        )
