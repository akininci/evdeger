"""
EvDeğer — Endeksa Scraper
Endeksa.com'dan bölge bazlı m² fiyat endeksi ve trend verileri çeker.

Endeksa, Türkiye'nin en kapsamlı emlak endeksi sitesidir.
İlçe ve mahalle bazında ortalama m² fiyatları, yıllık değişim oranları sunar.

URL Pattern:
  https://www.endeksa.com/tr/analiz/izmir/karabaglar/esenyali/endeks
"""

import json
import logging
import re
from dataclasses import dataclass

from bs4 import BeautifulSoup

from scrapers.base import BaseScraper

logger = logging.getLogger(__name__)


@dataclass
class EndeksaData:
    """Endeksa'dan çekilen bölge verisi."""
    city: str
    district: str
    neighborhood: str | None
    avg_price_per_sqm: float | None  # Ortalama m² fiyat (satılık)
    avg_rent_per_sqm: float | None  # Ortalama m² kira
    yoy_change: float | None  # Yıllık değişim %
    mom_change: float | None  # Aylık değişim %
    listing_count: int | None  # Aktif ilan sayısı
    avg_sqm: float | None  # Ortalama daire büyüklüğü
    data_date: str | None  # Verinin tarihi


class EndeksaScraper(BaseScraper):
    """
    Endeksa.com bölge verisi scraper'ı.
    m² fiyat endeksleri ve trend verilerini çeker.
    """

    def __init__(self):
        super().__init__(
            source_name="endeksa",
            base_url="https://www.endeksa.com",
            min_delay=3.0,
            max_delay=6.0,
        )

    def _turkish_slug(self, text: str) -> str:
        """Endeksa URL formatı için Türkçe slug."""
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
        return result.strip("-")

    def _build_url(
        self,
        city: str,
        district: str,
        neighborhood: str | None = None,
    ) -> str:
        """
        Endeksa analiz sayfası URL'si.
        Ör: https://www.endeksa.com/tr/analiz/izmir/karabaglar/esenyali/endeks
        """
        city_slug = self._turkish_slug(city)
        district_slug = self._turkish_slug(district)

        if neighborhood:
            neighborhood_slug = self._turkish_slug(neighborhood)
            # "Mahallesi" kelimesini kaldır
            neighborhood_slug = neighborhood_slug.replace("-mahallesi", "").replace("-mah", "")
            return f"{self.base_url}/tr/analiz/{city_slug}/{district_slug}/{neighborhood_slug}/endeks"
        else:
            return f"{self.base_url}/tr/analiz/{city_slug}/{district_slug}/endeks"

    async def scrape_listings(
        self,
        city: str,
        district: str,
        neighborhood: str,
        listing_type: str = "sale",
        max_pages: int = 1,
    ):
        """BaseScraper interface uyumluluğu — Endeksa'dan listing çekmez."""
        return []

    async def get_area_data(
        self,
        city: str,
        district: str,
        neighborhood: str | None = None,
    ) -> EndeksaData | None:
        """
        Bölge verilerini Endeksa'dan çeker.
        
        Args:
            city: İl adı
            district: İlçe adı
            neighborhood: Mahalle adı (opsiyonel)
            
        Returns:
            EndeksaData veya None (veri bulunamazsa)
        """
        url = self._build_url(city, district, neighborhood)
        logger.info(f"[endeksa] Çekiliyor: {url}")

        html = await self._fetch(url)
        if not html:
            logger.warning(f"[endeksa] Sayfa alınamadı: {url}")
            return None

        return self._parse_endeks_page(html, city, district, neighborhood)

    def _parse_endeks_page(
        self,
        html: str,
        city: str,
        district: str,
        neighborhood: str | None,
    ) -> EndeksaData | None:
        """Endeksa endeks sayfasını parse eder."""
        soup = BeautifulSoup(html, "html.parser")

        avg_price_per_sqm = None
        avg_rent_per_sqm = None
        yoy_change = None
        mom_change = None
        listing_count = None
        avg_sqm = None
        data_date = None

        # __NEXT_DATA__ veya inline JSON'dan veri çekmeyi dene
        next_data = soup.select_one("script#__NEXT_DATA__")
        if next_data:
            try:
                data = json.loads(next_data.string)
                page_props = data.get("props", {}).get("pageProps", {})
                endeks = page_props.get("endeks", {}) or page_props.get("data", {})

                if endeks:
                    avg_price_per_sqm = self._safe_float(endeks.get("averagePricePerSqm"))
                    avg_rent_per_sqm = self._safe_float(endeks.get("averageRentPerSqm"))
                    yoy_change = self._safe_float(endeks.get("yearlyChange"))
                    mom_change = self._safe_float(endeks.get("monthlyChange"))
                    listing_count = self._safe_int(endeks.get("listingCount"))
                    avg_sqm = self._safe_float(endeks.get("averageSqm"))
                    data_date = endeks.get("date")

                    if avg_price_per_sqm:
                        logger.info(
                            f"[endeksa] JSON data: m²={avg_price_per_sqm:.0f} TL, "
                            f"yoy={yoy_change}%, count={listing_count}"
                        )
                        return EndeksaData(
                            city=city,
                            district=district,
                            neighborhood=neighborhood,
                            avg_price_per_sqm=avg_price_per_sqm,
                            avg_rent_per_sqm=avg_rent_per_sqm,
                            yoy_change=yoy_change,
                            mom_change=mom_change,
                            listing_count=listing_count,
                            avg_sqm=avg_sqm,
                            data_date=data_date,
                        )
            except (json.JSONDecodeError, KeyError, TypeError) as e:
                logger.debug(f"[endeksa] JSON parse hatası: {e}")

        # HTML'den parse et (fallback)
        # m² fiyat — genellikle büyük font ile gösterilir
        price_elements = soup.select(
            "div[class*='price'] span, span[class*='endeks'], div[class*='value'] span"
        )
        for el in price_elements:
            text = el.get_text(strip=True)
            price_val = self._parse_price(text)
            if price_val and 1000 < price_val < 500000:  # Mantıklı m² fiyat aralığı
                if avg_price_per_sqm is None:
                    avg_price_per_sqm = price_val

        # Yıllık değişim
        change_elements = soup.select("span[class*='change'], div[class*='trend']")
        for el in change_elements:
            text = el.get_text(strip=True)
            change_match = re.search(r"[%]?\s*([-+]?\d+[.,]\d+)\s*%?", text)
            if change_match:
                try:
                    yoy_change = float(change_match.group(1).replace(",", "."))
                except ValueError:
                    pass

        # Genel text'ten bilgi çıkar
        full_text = soup.get_text(" ", strip=True)

        # m² fiyat
        if avg_price_per_sqm is None:
            sqm_match = re.search(r"(\d{1,3}(?:\.\d{3})*)\s*(?:TL|₺)\s*/\s*m[²2]", full_text)
            if sqm_match:
                avg_price_per_sqm = self._parse_price(sqm_match.group(1))

        if avg_price_per_sqm is None:
            logger.warning(f"[endeksa] Veri çıkarılamadı: {city}/{district}/{neighborhood}")
            return None

        return EndeksaData(
            city=city,
            district=district,
            neighborhood=neighborhood,
            avg_price_per_sqm=avg_price_per_sqm,
            avg_rent_per_sqm=avg_rent_per_sqm,
            yoy_change=yoy_change,
            mom_change=mom_change,
            listing_count=listing_count,
            avg_sqm=avg_sqm,
            data_date=data_date,
        )

    @staticmethod
    def _safe_float(value) -> float | None:
        """Güvenli float dönüşümü."""
        if value is None:
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    @staticmethod
    def _safe_int(value) -> int | None:
        """Güvenli int dönüşümü."""
        if value is None:
            return None
        try:
            return int(value)
        except (ValueError, TypeError):
            return None
