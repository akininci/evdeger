"""
EvDeğer — Hepsiemlak Scraper (Scrapfly Edition)
Cloudflare bypass için Scrapfly API kullanır.
Normal HTTP istekleri Cloudflare tarafından engellenir — Scrapfly bunu çözer.

Maliyet: ~30 credit/istek (ASP + JS rendering)
Free plan: 1000 credit/ay → ~33 sayfa/ay
"""

import asyncio
import json
import logging
import os
import re
from urllib.parse import quote

import httpx

from scrapers.base import BaseScraper, ScrapedListing

logger = logging.getLogger(__name__)

# Scrapfly API key — environment variable veya default
SCRAPFLY_API_KEY = os.getenv(
    "SCRAPFLY_API_KEY", "scp-live-754d8a110c6a4a5da50ba7e1f27007c3"
)
SCRAPFLY_API_URL = "https://api.scrapfly.io/scrape"


class HepsiemlakScrapflyScraper(BaseScraper):
    """
    Hepsiemlak.com scraper'ı — Scrapfly API ile Cloudflare bypass.
    
    Scrapfly API kullanarak:
    - Anti Scraping Protection (ASP) bypass
    - JavaScript rendering (Vue.js SPA)
    - Türkiye residential proxy
    
    Maliyet: ~30 credit/istek
    Free plan: 1000 credit/ay → dikkatli kullan!
    """

    def __init__(self, api_key: str | None = None):
        super().__init__(
            source_name="hepsiemlak",
            base_url="https://www.hepsiemlak.com",
            min_delay=3.0,  # Scrapfly rate limit'e saygı
            max_delay=6.0,
        )
        self.api_key = api_key or SCRAPFLY_API_KEY
        self._credits_used = 0

    def _slugify_turkish(self, text: str) -> str:
        """Türkçe metni Hepsiemlak URL slug formatına çevirir."""
        result = text.lower().strip()
        result = re.sub(r"\s+", "-", result)
        result = re.sub(r"[^a-zçğıöşü0-9\-]", "", result)
        result = re.sub(r"-+", "-", result)
        return result.strip("-")

    def _build_url(
        self,
        district: str,
        neighborhood: str,
        listing_type: str = "sale",
        page: int = 1,
    ) -> str:
        """Hepsiemlak URL'si oluşturur."""
        district_slug = self._slugify_turkish(district)
        neighborhood_slug = self._slugify_turkish(neighborhood)
        type_slug = "satilik" if listing_type == "sale" else "kiralik"

        neighborhood_slug = neighborhood_slug.replace("-mahallesi", "-mah")
        if not neighborhood_slug.endswith("-mah"):
            neighborhood_slug += "-mah"

        path = f"/{district_slug}-{neighborhood_slug}-{type_slug}/daire"
        encoded_path = quote(path, safe="/-")
        url = f"{self.base_url}{encoded_path}"
        if page > 1:
            url += f"?page={page}"
        return url

    async def _fetch_via_scrapfly(self, url: str) -> str | None:
        """
        Scrapfly API ile sayfa çeker.
        ASP + JS rendering + TR proxy kullanır.
        
        Returns:
            HTML content veya None
        """
        params = {
            "key": self.api_key,
            "url": url,
            "asp": True,           # Anti Scraping Protection
            "render_js": True,     # JavaScript rendering (Vue.js)
            "country": "tr",       # Türkiye residential proxy
            "rendering_wait": 3000,  # Vue.js'in render etmesi için 3sn bekle
        }

        for attempt in range(1, 3):  # Max 2 deneme (credit tasarrufu)
            try:
                async with httpx.AsyncClient(timeout=httpx.Timeout(60.0)) as client:
                    response = await client.get(SCRAPFLY_API_URL, params=params)
                
                if response.status_code != 200:
                    logger.warning(
                        f"[hepsiemlak-scrapfly] Scrapfly HTTP {response.status_code}: {url}"
                    )
                    if attempt < 2:
                        await asyncio.sleep(5)
                    continue

                data = response.json()
                result = data.get("result", {})
                context = data.get("context", {})
                
                # Credit tracking
                cost = context.get("cost", {})
                if isinstance(cost, dict):
                    total_cost = cost.get("total", 0)
                else:
                    total_cost = cost or 0
                self._credits_used += total_cost
                logger.info(
                    f"[hepsiemlak-scrapfly] Credit cost: {total_cost}, "
                    f"Total used: {self._credits_used}"
                )

                scrape_status = result.get("status_code")
                content = result.get("content", "")

                if scrape_status == 200 and len(content) > 10000:
                    return content
                elif scrape_status == 404:
                    logger.warning(f"[hepsiemlak-scrapfly] 404: {url}")
                    return None
                else:
                    logger.warning(
                        f"[hepsiemlak-scrapfly] Scrape status {scrape_status}, "
                        f"content: {len(content)} bytes"
                    )

            except httpx.TimeoutException:
                logger.warning(f"[hepsiemlak-scrapfly] Timeout: {url} (attempt {attempt})")
            except Exception as e:
                logger.error(f"[hepsiemlak-scrapfly] Error: {url} — {e}")

            if attempt < 2:
                await asyncio.sleep(5)

        return None

    async def scrape_listings(
        self,
        city: str,
        district: str,
        neighborhood: str,
        listing_type: str = "sale",
        max_pages: int = 3,  # Credit tasarrufu — default 3 sayfa
    ) -> list[ScrapedListing]:
        """
        Hepsiemlak'tan Scrapfly ile ilan çeker.
        
        Dikkat: Her sayfa ~30 credit kullanır!
        Free plan: 1000 credit/ay → max ~33 sayfa toplam.
        """
        all_listings = []

        for page in range(1, max_pages + 1):
            url = self._build_url(district, neighborhood, listing_type, page)
            logger.info(f"[hepsiemlak-scrapfly] Scraping page {page}: {url}")

            html = await self._fetch_via_scrapfly(url)
            if not html:
                logger.warning(f"[hepsiemlak-scrapfly] Sayfa alınamadı: {url}")
                break

            listings = self._parse_listing_page(
                html, city, district, neighborhood, listing_type
            )

            if not listings:
                logger.info(
                    f"[hepsiemlak-scrapfly] Sayfa {page}: ilan bulunamadı, durduruluyor"
                )
                break

            all_listings.extend(listings)
            logger.info(
                f"[hepsiemlak-scrapfly] Sayfa {page}: {len(listings)} ilan bulundu"
            )

            # Rate limiting
            if page < max_pages:
                await asyncio.sleep(3)

        logger.info(
            f"[hepsiemlak-scrapfly] Toplam: {len(all_listings)} ilan "
            f"({city}/{district}/{neighborhood}, {listing_type}), "
            f"Credits used: {self._credits_used}"
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
        Hepsiemlak listing sayfasını parse eder.
        Vue.js rendered HTML — <li class="listing-item"> elementlerinden çeker.
        """
        listings = []

        # Method 1: Regex-based parsing (bs4 dependency olmadan)
        # Listing items: <li id="XXXXX-XXX" class="listing-item ...">
        listing_blocks = re.findall(
            r'<li\s+id="(\d+-\d+)[^"]*"\s+class="listing-item[^"]*"[^>]*>(.*?)</li>',
            html,
            re.DOTALL,
        )

        if not listing_blocks:
            # Alternative: article elements
            listing_blocks = re.findall(
                r'<article\s+id="(\d+-\d+)"[^>]*>(.*?)</article>',
                html,
                re.DOTALL,
            )

        logger.info(f"[hepsiemlak-scrapfly] Found {len(listing_blocks)} listing blocks")

        for source_id, block in listing_blocks:
            try:
                listing = self._parse_single_block(
                    source_id, block, city, district, neighborhood, listing_type
                )
                if listing and listing.price > 0:
                    listings.append(listing)
            except Exception as e:
                logger.debug(f"[hepsiemlak-scrapfly] Parse error: {e}")
                continue

        return listings

    def _parse_single_block(
        self,
        source_id: str,
        block: str,
        city: str,
        district: str,
        neighborhood: str,
        listing_type: str,
    ) -> ScrapedListing | None:
        """Tek bir listing bloğunu parse eder."""

        # URL
        url_match = re.search(r'href="(/[^"]+/daire/[^"]+)"', block)
        listing_url = (
            f"{self.base_url}{url_match.group(1)}" if url_match else None
        )

        # Title
        title_match = re.search(r'title="([^"]+)"', block)
        title = title_match.group(1) if title_match else ""

        # Price — whitespace around number in <strong> (format: 4.500.000)
        price_matches = re.findall(
            r'>\s*(\d{1,3}(?:\.\d{3})+)\s*<', block
        )
        price = 0.0
        for pm in price_matches:
            val = float(pm.replace(".", ""))
            if val >= 100000:
                price = val
                break

        if price <= 0:
            return None

        # Rooms — "3 + 1" pattern (Hepsiemlak adds whitespace/newlines around +)
        rooms = None
        room_match = re.search(r'(\d)\s*\+\s*(\d)', block)
        if room_match:
            rooms = f"{room_match.group(1)}+{room_match.group(2)}"

        # m² — look for number followed by m² or in specific elements
        sqm = None
        sqm_match = re.search(r'(\d+)\s*m²', block)
        if sqm_match:
            sqm = float(sqm_match.group(1))
        else:
            # Sometimes m² is in separate spans
            sqm_match = re.search(r'>(\d{2,4})\s*<.*?m²', block, re.DOTALL)
            if sqm_match:
                sqm = float(sqm_match.group(1))

        # Building age — "25 Yaşında" with possible whitespace/newlines
        building_age = None
        age_match = re.search(r'(\d+)\s*(?:Yaşında|yaşında|yıllık)', block)
        if age_match:
            building_age = int(age_match.group(1))
        
        # Location from detail text: "İzmir / Karabağlar / Bahçelievler Mah."
        loc_match = re.search(
            r'(?:İzmir|Istanbul|İstanbul|Ankara|Antalya|Bursa)\s*/\s*[^/]+\s*/\s*([^<]+)',
            block,
        )
        if loc_match:
            parsed_neighborhood = loc_match.group(1).strip()
            # Use parsed neighborhood if available (more accurate)
            if parsed_neighborhood:
                neighborhood = parsed_neighborhood.replace(" Mah.", "").strip()

        # Floor
        floor_number = None
        floor_match = re.search(r'(\d+)\.\s*[Kk]at', block)
        if floor_match:
            floor_number = int(floor_match.group(1))

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
            raw_data={"title": title},
        )

    def _has_next_page(self, html: str, current_page: int) -> bool:
        """Sonraki sayfa var mı kontrol eder."""
        next_page = current_page + 1
        return f"page={next_page}" in html or f"?page={next_page}" in html

    @property
    def credits_used(self) -> int:
        """Bu session'da kullanılan toplam credit."""
        return self._credits_used
