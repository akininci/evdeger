"""
EvDeğer — Hepsiemlak Scraper
Hepsiemlak.com'dan satılık/kiralık daire ilanlarını çeker.
BeautifulSoup4 ile HTML parse eder.

URL Pattern:
  Satılık: https://www.hepsiemlak.com/karaba%C4%9Flar-esenyali-mah-satilik/daire
  Kiralık: https://www.hepsiemlak.com/karaba%C4%9Flar-esenyali-mah-kiralik/daire
"""

import logging
import re
from urllib.parse import quote

from bs4 import BeautifulSoup

from scrapers.base import BaseScraper, ScrapedListing

logger = logging.getLogger(__name__)


class HepsiemlakScraper(BaseScraper):
    """
    Hepsiemlak.com scraper'ı.
    Satılık ve kiralık daire ilanlarını çeker.
    """

    def __init__(self):
        super().__init__(
            source_name="hepsiemlak",
            base_url="https://www.hepsiemlak.com",
            min_delay=2.0,
            max_delay=4.0,
        )

    def _slugify_turkish(self, text: str) -> str:
        """
        Türkçe metni Hepsiemlak URL slug formatına çevirir.
        Hepsiemlak Türkçe karakterleri URL'de korur (percent-encoded).
        Ör: "Karabağlar" → "karabağlar" (URL'de %C4%9F olacak)
        """
        result = text.lower().strip()
        # Boşlukları tire ile değiştir
        result = re.sub(r"\s+", "-", result)
        # Alfanumerik, Türkçe karakterler ve tire dışındaki karakterleri kaldır
        result = re.sub(r"[^a-zçğıöşü0-9\-]", "", result)
        # Çoklu tireleri tek tire yap
        result = re.sub(r"-+", "-", result)
        return result.strip("-")

    def _build_url(
        self,
        district: str,
        neighborhood: str,
        listing_type: str = "sale",
        page: int = 1,
    ) -> str:
        """
        Hepsiemlak liste sayfası URL'si oluşturur.
        
        Ör: https://www.hepsiemlak.com/karabaglar-esenyali-mah-satilik/daire?page=2
        """
        district_slug = self._slugify_turkish(district)
        neighborhood_slug = self._slugify_turkish(neighborhood)
        
        type_slug = "satilik" if listing_type == "sale" else "kiralik"

        # Mahalle adını "mah" ile kısalt (Hepsiemlak formatı)
        # "Esenyalı Mahallesi" → "esenyali-mah"
        neighborhood_slug = neighborhood_slug.replace("-mahallesi", "-mah")
        if not neighborhood_slug.endswith("-mah"):
            neighborhood_slug += "-mah"

        path = f"/{district_slug}-{neighborhood_slug}-{type_slug}/daire"
        
        # Türkçe karakterleri percent-encode et
        encoded_path = quote(path, safe="/-")
        
        url = f"{self.base_url}{encoded_path}"
        if page > 1:
            url += f"?page={page}"

        return url

    def _is_cloudflare_challenge(self, html: str) -> bool:
        """Cloudflare challenge sayfası mı kontrol et."""
        if not html:
            return False
        return (
            "Just a moment..." in html[:500]
            or "challenge-platform" in html
            or "_cf_chl_opt" in html
            or "Enable JavaScript and cookies to continue" in html
        )

    async def scrape_listings(
        self,
        city: str,
        district: str,
        neighborhood: str,
        listing_type: str = "sale",
        max_pages: int = 5,
    ) -> list[ScrapedListing]:
        """
        Hepsiemlak'tan belirtilen lokasyon için ilanları çeker.
        
        NOT: Hepsiemlak Cloudflare managed challenge kullanıyor.
        Basit HTTP istekleri Cloudflare tarafından engellenir.
        Bu durumda boş liste döndürür ve uyarı loglar.
        
        Args:
            city: İl adı (ör: İzmir)
            district: İlçe adı (ör: Karabağlar)
            neighborhood: Mahalle adı (ör: Esenyalı)
            listing_type: "sale" veya "rent"
            max_pages: Maksimum sayfa sayısı
            
        Returns:
            ScrapedListing listesi
        """
        all_listings = []

        for page in range(1, max_pages + 1):
            url = self._build_url(district, neighborhood, listing_type, page)
            logger.info(f"[hepsiemlak] Scraping: {url}")

            html = await self._fetch(url)
            if not html:
                logger.warning(f"[hepsiemlak] Sayfa alınamadı: {url}")
                break

            # Cloudflare challenge kontrolü
            if self._is_cloudflare_challenge(html):
                logger.warning(
                    f"[hepsiemlak] Cloudflare challenge engeli — "
                    f"Hepsiemlak basit HTTP ile erişilemiyor. "
                    f"Bu kaynak şu an devre dışı."
                )
                return []

            listings = self._parse_listing_page(html, city, district, neighborhood, listing_type)

            if not listings:
                logger.info(f"[hepsiemlak] Sayfa {page}: ilan bulunamadı, durduruluyor")
                break

            all_listings.extend(listings)
            logger.info(f"[hepsiemlak] Sayfa {page}: {len(listings)} ilan bulundu")

            # Son sayfa kontrolü
            if not self._has_next_page(html, page):
                break

        logger.info(
            f"[hepsiemlak] Toplam: {len(all_listings)} ilan "
            f"({city}/{district}/{neighborhood}, {listing_type})"
        )
        return all_listings

    def _parse_listing_page(
        self,
        html: str,
        city: str,
        district: str,
        neighborhood: str,
        listing_type: str,
    ) -> list[ScrapedListing]:
        """
        Hepsiemlak liste sayfasındaki ilanları parse eder.
        Her ilan kartından fiyat, m², oda sayısı, kat bilgisi çıkarılır.
        """
        soup = BeautifulSoup(html, "html.parser")
        listings = []

        # İlan kartları — Hepsiemlak'ın listing container'ları
        listing_cards = soup.select("div.listing-item, li.listing-item, div[class*='listingCard']")
        
        # Alternatif selector'lar
        if not listing_cards:
            listing_cards = soup.select("div.list-view-content a, div.card-listing")
        
        if not listing_cards:
            # JSON-LD veya script tag'lerinden veri çekmeyi dene
            listings_from_json = self._parse_from_json_ld(soup, city, district, neighborhood, listing_type)
            if listings_from_json:
                return listings_from_json

        for card in listing_cards:
            try:
                listing = self._parse_single_listing(card, city, district, neighborhood, listing_type)
                if listing and listing.price > 0:
                    listings.append(listing)
            except Exception as e:
                logger.debug(f"[hepsiemlak] İlan parse hatası: {e}")
                continue

        return listings

    def _parse_single_listing(
        self,
        card,
        city: str,
        district: str,
        neighborhood: str,
        listing_type: str,
    ) -> ScrapedListing | None:
        """Tek bir ilan kartını parse eder."""

        # Fiyat
        price_el = (
            card.select_one("span.list-view-price, div.listing-price, span[class*='price']")
            or card.select_one("span.price")
        )
        price = self._parse_price(price_el.get_text() if price_el else "")
        if not price or price <= 0:
            return None

        # m²
        sqm = None
        sqm_el = card.select_one("span[class*='squareMeter'], span.sqm, div.listing-sqm")
        if sqm_el:
            sqm = self._parse_sqm(sqm_el.get_text())

        # Detay bilgiler — genellikle spec listesinde
        specs = card.select("span.spec-item, li.spec-item, span[class*='spec']")
        rooms = None
        floor_number = None
        building_age = None

        for spec in specs:
            text = spec.get_text(strip=True).lower()
            # Oda sayısı: "3+1", "2+1"
            if re.match(r"\d\+\d", text):
                rooms = text
            # m² (spec'te de olabilir)
            elif "m²" in text or "m2" in text:
                if sqm is None:
                    sqm = self._parse_sqm(text)
            # Bina yaşı
            elif "yaşında" in text or "yıllık" in text:
                building_age = self._parse_int(text)

        # Alternatif: tüm text'ten bilgi çıkar
        full_text = card.get_text(" ", strip=True)
        
        if rooms is None:
            room_match = re.search(r"(\d\+\d)", full_text)
            if room_match:
                rooms = room_match.group(1)

        if sqm is None:
            sqm_match = re.search(r"(\d+)\s*m[²2]", full_text)
            if sqm_match:
                sqm = float(sqm_match.group(1))

        # İlan URL'si
        link = card.select_one("a[href]")
        listing_url = None
        source_id = None
        if link and link.get("href"):
            href = link["href"]
            if href.startswith("/"):
                listing_url = f"{self.base_url}{href}"
            elif href.startswith("http"):
                listing_url = href
            # Source ID çıkar
            id_match = re.search(r"/(\d+)$", href)
            if id_match:
                source_id = id_match.group(1)

        return ScrapedListing(
            source="hepsiemlak",
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
            floor_number=floor_number,
            building_age=building_age,
            listing_url=listing_url,
            raw_data={"full_text": full_text[:500]},
        )

    def _parse_from_json_ld(
        self,
        soup: BeautifulSoup,
        city: str,
        district: str,
        neighborhood: str,
        listing_type: str,
    ) -> list[ScrapedListing]:
        """
        Sayfa içindeki JSON-LD veya __NEXT_DATA__ script tag'lerinden
        ilan verisi çıkarır. Hepsiemlak bazen SSR data olarak gömüyor.
        """
        import json

        listings = []

        # __NEXT_DATA__ script tag'ini ara (Next.js uygulamalar)
        next_data_script = soup.select_one("script#__NEXT_DATA__")
        if next_data_script:
            try:
                data = json.loads(next_data_script.string)
                props = data.get("props", {}).get("pageProps", {})
                
                # searchResult veya listings altında olabilir
                search_results = (
                    props.get("searchResult", {}).get("listings", [])
                    or props.get("listings", [])
                    or props.get("result", {}).get("listings", [])
                )

                for item in search_results:
                    try:
                        price = float(item.get("price", 0))
                        if price <= 0:
                            continue

                        sqm_val = item.get("grossSquareMeter") or item.get("netSquareMeter")
                        sqm = float(sqm_val) if sqm_val else None

                        listings.append(ScrapedListing(
                            source="hepsiemlak",
                            source_id=str(item.get("id", "")),
                            listing_type=listing_type,
                            property_type="apartment",
                            city=city,
                            district=district,
                            neighborhood=neighborhood,
                            price=price,
                            currency=item.get("currency", "TRY"),
                            sqm=sqm,
                            rooms=item.get("roomCount", None),
                            floor_number=self._parse_int(str(item.get("floorNumber", ""))),
                            building_age=self._parse_int(str(item.get("buildingAge", ""))),
                            listing_url=f"{self.base_url}/{item.get('slug', '')}" if item.get("slug") else None,
                            raw_data=item,
                        ))
                    except Exception as e:
                        logger.debug(f"[hepsiemlak] JSON ilan parse hatası: {e}")
                        continue

            except json.JSONDecodeError:
                logger.debug("[hepsiemlak] __NEXT_DATA__ JSON parse hatası")

        # JSON-LD script tag'leri
        for script in soup.select('script[type="application/ld+json"]'):
            try:
                data = json.loads(script.string)
                if isinstance(data, list):
                    for item in data:
                        if item.get("@type") in ("Product", "Offer", "RealEstateListing"):
                            price = float(
                                item.get("offers", {}).get("price", 0)
                                or item.get("price", 0)
                            )
                            if price > 0:
                                listings.append(ScrapedListing(
                                    source="hepsiemlak",
                                    listing_type=listing_type,
                                    city=city,
                                    district=district,
                                    neighborhood=neighborhood,
                                    price=price,
                                    raw_data=item,
                                ))
            except (json.JSONDecodeError, TypeError):
                continue

        return listings

    def _has_next_page(self, html: str, current_page: int) -> bool:
        """Sonraki sayfa var mı kontrol eder."""
        soup = BeautifulSoup(html, "html.parser")
        
        # Sayfalama kontrolleri
        next_btn = soup.select_one(
            "a.next-page, a[rel='next'], li.next a, button[class*='next']"
        )
        if next_btn:
            return True

        # Sayfa numaralarından kontrol
        page_links = soup.select("a.page-number, li.page-item a, a[class*='pagination']")
        for link in page_links:
            try:
                page_num = int(link.get_text(strip=True))
                if page_num > current_page:
                    return True
            except ValueError:
                continue

        return False
