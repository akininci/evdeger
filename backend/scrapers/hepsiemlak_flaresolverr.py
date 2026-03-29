"""
EvDeğer — Hepsiemlak Scraper (FlareSolverr Edition)
Cloudflare bypass için FlareSolverr (localhost:8191) kullanır.
Scrapfly yerine — ÜCRETSİZ, sınırsız istek.

FlareSolverr: Docker container, headless Chrome ile Cloudflare bypass.
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

# FlareSolverr endpoint — localhost Docker container
FLARESOLVERR_URL = os.getenv("FLARESOLVERR_URL", "http://localhost:8191/v1")


class HepsiemlakFlareSolverrScraper(BaseScraper):
    """
    Hepsiemlak.com scraper'ı — FlareSolverr ile Cloudflare bypass.
    
    Scrapfly'ın yerini alır:
    - ÜCRETSİZ (Docker container)
    - Sınırsız istek (credit yok)
    - Headless Chrome ile JS rendering
    - Cloudflare bypass otomatik
    
    Gereksinim: FlareSolverr Docker container çalışıyor olmalı
    docker run -d --restart=always --name flaresolverr -p 8191:8191 ghcr.io/flaresolverr/flaresolverr:latest
    """

    def __init__(self, flaresolverr_url: str | None = None):
        super().__init__(
            source_name="hepsiemlak",
            base_url="https://www.hepsiemlak.com",
            min_delay=5.0,   # FlareSolverr headless Chrome — biraz daha yavaş
            max_delay=10.0,
        )
        self.flaresolverr_url = flaresolverr_url or FLARESOLVERR_URL
        self._request_count = 0

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

    async def _fetch_via_flaresolverr(self, url: str) -> str | None:
        """
        FlareSolverr ile sayfa çeker.
        Headless Chrome + Cloudflare bypass.
        
        Returns:
            HTML content veya None
        """
        payload = {
            "cmd": "request.get",
            "url": url,
            "maxTimeout": 60000,  # 60 saniye max
        }

        for attempt in range(1, 3):  # Max 2 deneme
            try:
                async with httpx.AsyncClient(timeout=httpx.Timeout(90.0)) as client:
                    response = await client.post(
                        self.flaresolverr_url,
                        json=payload,
                        headers={"Content-Type": "application/json"},
                    )
                
                if response.status_code != 200:
                    logger.warning(
                        f"[hepsiemlak-flaresolverr] HTTP {response.status_code} from FlareSolverr"
                    )
                    if attempt < 2:
                        await asyncio.sleep(10)
                    continue

                data = response.json()
                status = data.get("status")
                solution = data.get("solution", {})
                
                self._request_count += 1

                if status != "ok":
                    logger.warning(
                        f"[hepsiemlak-flaresolverr] FlareSolverr status: {status}, "
                        f"message: {data.get('message', 'unknown')}"
                    )
                    if attempt < 2:
                        await asyncio.sleep(10)
                    continue

                http_status = solution.get("status")
                html = solution.get("response", "")

                if http_status == 200 and len(html) > 10000:
                    logger.info(
                        f"[hepsiemlak-flaresolverr] OK: {url} "
                        f"({len(html)} bytes, request #{self._request_count})"
                    )
                    return html
                elif http_status == 404:
                    logger.warning(f"[hepsiemlak-flaresolverr] 404: {url}")
                    return None
                else:
                    logger.warning(
                        f"[hepsiemlak-flaresolverr] HTTP {http_status}, "
                        f"content: {len(html)} bytes"
                    )

            except httpx.TimeoutException:
                logger.warning(
                    f"[hepsiemlak-flaresolverr] Timeout: {url} (attempt {attempt})"
                )
            except Exception as e:
                logger.error(
                    f"[hepsiemlak-flaresolverr] Error: {url} — {e}"
                )

            if attempt < 2:
                await asyncio.sleep(10)

        return None

    async def scrape_listings(
        self,
        city: str,
        district: str,
        neighborhood: str,
        listing_type: str = "sale",
        max_pages: int = 5,  # Ücretsiz — limit yok, 5 default
    ) -> list[ScrapedListing]:
        """
        Hepsiemlak'tan FlareSolverr ile ilan çeker.
        
        Scrapfly'dan farkı: ÜCRETSİZ ve sınırsız!
        Tek limit: FlareSolverr'ın headless Chrome hızı (~10-15 sn/sayfa).
        """
        all_listings = []

        for page in range(1, max_pages + 1):
            url = self._build_url(district, neighborhood, listing_type, page)
            logger.info(f"[hepsiemlak-flaresolverr] Scraping page {page}: {url}")

            html = await self._fetch_via_flaresolverr(url)
            if not html:
                logger.warning(f"[hepsiemlak-flaresolverr] Sayfa alınamadı: {url}")
                break

            listings = self._parse_listing_page(
                html, city, district, neighborhood, listing_type
            )

            if not listings:
                logger.info(
                    f"[hepsiemlak-flaresolverr] Sayfa {page}: ilan bulunamadı, durduruluyor"
                )
                break

            all_listings.extend(listings)
            logger.info(
                f"[hepsiemlak-flaresolverr] Sayfa {page}: {len(listings)} ilan bulundu"
            )

            # Rate limiting — FlareSolverr'a çok hızlı istek gönderme
            if page < max_pages:
                await asyncio.sleep(5)

        logger.info(
            f"[hepsiemlak-flaresolverr] Toplam: {len(all_listings)} ilan "
            f"({city}/{district}/{neighborhood}, {listing_type}), "
            f"Requests: {self._request_count}"
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
        FlareSolverr headless Chrome — tam rendered HTML döner.
        """
        listings = []

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

        logger.info(
            f"[hepsiemlak-flaresolverr] Found {len(listing_blocks)} listing blocks"
        )

        for source_id, block in listing_blocks:
            try:
                listing = self._parse_single_block(
                    source_id, block, city, district, neighborhood, listing_type
                )
                if listing and listing.price > 0:
                    listings.append(listing)
            except Exception as e:
                logger.debug(f"[hepsiemlak-flaresolverr] Parse error: {e}")
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

        # Rooms — "3 + 1" pattern
        rooms = None
        room_match = re.search(r'(\d)\s*\+\s*(\d)', block)
        if room_match:
            rooms = f"{room_match.group(1)}+{room_match.group(2)}"

        # m²
        sqm = None
        sqm_match = re.search(r'(\d+)\s*m²', block)
        if sqm_match:
            sqm = float(sqm_match.group(1))
        else:
            sqm_match = re.search(r'>(\d{2,4})\s*<.*?m²', block, re.DOTALL)
            if sqm_match:
                sqm = float(sqm_match.group(1))

        # Building age
        building_age = None
        age_match = re.search(r'(\d+)\s*(?:Yaşında|yaşında|yıllık)', block)
        if age_match:
            building_age = int(age_match.group(1))

        # Location
        loc_match = re.search(
            r'(?:İzmir|Istanbul|İstanbul|Ankara|Antalya|Bursa)\s*/\s*[^/]+\s*/\s*([^<]+)',
            block,
        )
        if loc_match:
            parsed_neighborhood = loc_match.group(1).strip()
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
    def request_count(self) -> int:
        """Bu session'da yapılan toplam istek sayısı."""
        return self._request_count
