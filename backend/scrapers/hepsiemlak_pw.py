"""
EvDeğer — Hepsiemlak Playwright Scraper (v2 — Stealth)
Cloudflare korumasını Playwright + stealth plugin ile aşar.
"""

import asyncio
import json
import logging
import random
import re
from urllib.parse import quote

from scrapers.base import ScrapedListing

logger = logging.getLogger(__name__)

_USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
]

_VIEWPORTS = [
    {"width": 1920, "height": 1080},
    {"width": 1536, "height": 864},
    {"width": 1440, "height": 900},
    {"width": 1366, "height": 768},
]


class HepsiemlakPlaywrightScraper:
    def __init__(self):
        self._playwright = None
        self._browser = None

    def _slugify_turkish(self, text: str) -> str:
        result = text.lower().strip()
        result = re.sub(r"\s+", "-", result)
        result = re.sub(r"[^a-zçğıöşü0-9\-]", "", result)
        result = re.sub(r"-+", "-", result)
        return result.strip("-")

    def _build_url(self, district: str, neighborhood: str, listing_type: str = "sale", page: int = 1) -> str:
        district_slug = self._slugify_turkish(district)
        neighborhood_slug = self._slugify_turkish(neighborhood)
        type_slug = "satilik" if listing_type == "sale" else "kiralik"
        neighborhood_slug = neighborhood_slug.replace("-mahallesi", "-mah")
        if not neighborhood_slug.endswith("-mah"):
            neighborhood_slug += "-mah"
        path = f"/{district_slug}-{neighborhood_slug}-{type_slug}/daire"
        encoded_path = quote(path, safe="/-")
        url = f"https://www.hepsiemlak.com{encoded_path}"
        if page > 1:
            url += f"?page={page}"
        return url

    async def _ensure_browser(self):
        if self._browser is not None:
            return
        from playwright.async_api import async_playwright
        self._playwright = await async_playwright().start()
        self._browser = await self._playwright.chromium.launch(
            headless=True,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--disable-gpu", "--no-sandbox", "--disable-dev-shm-usage",
                "--disable-setuid-sandbox", "--disable-accelerated-2d-canvas",
                "--no-first-run", "--no-zygote", "--single-process",
                "--disable-background-networking", "--disable-infobars",
            ],
        )
        logger.info("[hepsiemlak_pw] Browser başlatıldı")

    async def _fetch_page(self, url: str) -> str | None:
        await self._ensure_browser()
        viewport = random.choice(_VIEWPORTS)

        context = await self._browser.new_context(
            user_agent=random.choice(_USER_AGENTS),
            locale="tr-TR",
            timezone_id="Europe/Istanbul",
            viewport=viewport,
            screen=viewport,
            color_scheme="light",
        )

        # Apply stealth to the context
        try:
            from playwright_stealth import Stealth
            stealth = Stealth(
                navigator_languages_override=("tr-TR", "tr"),
                navigator_platform_override="Win32",
                navigator_vendor_override="Google Inc.",
            )
            await stealth.apply_stealth_async(context)
            logger.debug("[hepsiemlak_pw] Stealth applied to context")
        except Exception as e:
            logger.warning(f"[hepsiemlak_pw] Stealth failed: {e}")

        page = await context.new_page()

        try:
            # Block heavy resources
            await page.route("**/*.{png,jpg,jpeg,gif,svg,ico,woff,woff2,ttf,eot,mp4,webm}", lambda route: route.abort())
            await page.route("**/analytics**", lambda route: route.abort())
            await page.route("**/gtm**", lambda route: route.abort())
            await page.route("**/googletagmanager**", lambda route: route.abort())

            logger.info(f"[hepsiemlak_pw] Navigating: {url}")
            response = await page.goto(url, wait_until="domcontentloaded", timeout=45000)
            status = response.status if response else 0
            logger.info(f"[hepsiemlak_pw] Response status: {status}")

            if status == 403:
                logger.info("[hepsiemlak_pw] 403 — waiting for Cloudflare challenge...")
                for attempt in range(4):
                    await page.wait_for_timeout(random.randint(4000, 7000))
                    content = await page.content()
                    if "Just a moment" not in content[:500] and "_cf_chl_opt" not in content:
                        logger.info(f"[hepsiemlak_pw] Cloudflare passed (attempt {attempt + 1})")
                        break
                    try:
                        cf_iframe = page.frame_locator("iframe[src*='challenges.cloudflare.com']")
                        checkbox = cf_iframe.locator("input[type='checkbox'], div.ctp-checkbox-container")
                        if await checkbox.count() > 0:
                            await checkbox.first.click()
                            await page.wait_for_timeout(3000)
                    except Exception:
                        pass
                else:
                    logger.warning("[hepsiemlak_pw] Cloudflare not resolved after 4 attempts")

            try:
                await page.wait_for_selector("script#__NEXT_DATA__, div[class*='listing']", timeout=10000)
            except Exception:
                pass

            await page.wait_for_timeout(random.randint(500, 1500))
            return await page.content()
        except Exception as e:
            logger.error(f"[hepsiemlak_pw] Page fetch error: {e}")
            return None
        finally:
            await context.close()

    def _parse_listings_from_html(self, html, city, district, neighborhood, listing_type):
        listings = self._parse_next_data(html, city, district, neighborhood, listing_type)
        return listings if listings else self._parse_dom(html, city, district, neighborhood, listing_type)

    def _parse_next_data(self, html, city, district, neighborhood, listing_type):
        listings = []
        match = re.search(r'<script\s+id="__NEXT_DATA__"\s+type="application/json">(.*?)</script>', html, re.DOTALL)
        if not match:
            return listings
        try:
            data = json.loads(match.group(1))
        except json.JSONDecodeError:
            return listings

        props = data.get("props", {}).get("pageProps", {})
        search_results = (
            props.get("searchResult", {}).get("listings", [])
            or props.get("listings", [])
            or props.get("result", {}).get("listings", [])
            or props.get("searchResult", {}).get("result", [])
            or props.get("data", {}).get("listings", [])
        )
        if not search_results:
            sr = props.get("searchResult", {})
            if isinstance(sr, dict):
                for key in ["list", "items", "results", "data"]:
                    if key in sr and isinstance(sr[key], list):
                        search_results = sr[key]
                        break
        logger.info(f"[hepsiemlak_pw] __NEXT_DATA__: {len(search_results)} ilan")

        for item in search_results:
            try:
                price = float(item.get("price", 0) or 0)
                if price <= 0:
                    continue
                sqm_val = item.get("grossSquareMeter") or item.get("netSquareMeter") or item.get("grossM2") or item.get("netM2") or item.get("squareMeter")
                sqm = float(sqm_val) if sqm_val else None
                rooms = item.get("roomCount") or item.get("room") or item.get("rooms")
                if rooms and not isinstance(rooms, str):
                    rooms = str(rooms)
                floor_num = item.get("floorNumber") or item.get("floor")
                building_age = item.get("buildingAge") or item.get("age")
                slug = item.get("slug") or item.get("url") or item.get("detailUrl") or ""
                listing_url = None
                if slug:
                    listing_url = slug if slug.startswith("http") else f"https://www.hepsiemlak.com{'/' if not slug.startswith('/') else ''}{slug}"
                source_id = str(item.get("id", "") or item.get("listingId", ""))
                listings.append(ScrapedListing(
                    source="hepsiemlak", source_id=source_id or None,
                    listing_type=listing_type, property_type="apartment",
                    city=city, district=district, neighborhood=neighborhood,
                    price=price, currency=item.get("currency", "TRY"), sqm=sqm, rooms=rooms,
                    floor_number=int(floor_num) if floor_num and str(floor_num).isdigit() else None,
                    building_age=int(building_age) if building_age and str(building_age).isdigit() else None,
                    listing_url=listing_url,
                    raw_data={k: v for k, v in item.items() if k in ("title", "description", "price", "grossSquareMeter", "netSquareMeter", "roomCount", "floorNumber", "buildingAge")},
                ))
            except Exception as e:
                logger.debug(f"[hepsiemlak_pw] JSON item parse error: {e}")
        return listings

    def _parse_dom(self, html, city, district, neighborhood, listing_type):
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")
        listings = []
        cards = soup.select("div[class*='listingCard'], div[class*='listing-item'], li[class*='listing-item'], a[class*='listing-link']")
        if not cards:
            cards = soup.select("div[data-id], article[class*='list']")
        logger.info(f"[hepsiemlak_pw] DOM parse: {len(cards)} kart")
        for card in cards:
            try:
                full_text = card.get_text(" ", strip=True)
                price_match = re.search(r"([\d.]+)\s*(?:TL|₺)", full_text)
                if not price_match:
                    continue
                price = float(price_match.group(1).replace(".", ""))
                if price <= 0:
                    continue
                sqm = None
                sqm_match = re.search(r"(\d+)\s*m[²2]", full_text)
                if sqm_match:
                    sqm = float(sqm_match.group(1))
                rooms = None
                room_match = re.search(r"(\d\+\d)", full_text)
                if room_match:
                    rooms = room_match.group(1)
                listing_url = source_id = None
                link = card.select_one("a[href]")
                if not link and card.name == "a":
                    link = card
                if link and link.get("href"):
                    href = link["href"]
                    listing_url = f"https://www.hepsiemlak.com{href}" if href.startswith("/") else (href if href.startswith("http") else None)
                    id_match = re.search(r"/(\d+)(?:\?|$)", href)
                    if id_match:
                        source_id = id_match.group(1)
                listings.append(ScrapedListing(
                    source="hepsiemlak", source_id=source_id, listing_type=listing_type,
                    property_type="apartment", city=city, district=district, neighborhood=neighborhood,
                    price=price, currency="TRY", sqm=sqm, rooms=rooms, listing_url=listing_url,
                    raw_data={"full_text": full_text[:500]},
                ))
            except Exception as e:
                logger.debug(f"[hepsiemlak_pw] DOM card parse error: {e}")
        return listings

    async def scrape_listings(self, city, district, neighborhood, listing_type="sale", max_pages=3):
        all_listings = []
        for page in range(1, max_pages + 1):
            url = self._build_url(district, neighborhood, listing_type, page)
            logger.info(f"[hepsiemlak_pw] Scraping page {page}: {url}")
            html = await self._fetch_page(url)
            if not html:
                break
            if "Just a moment" in html[:500] or "_cf_chl_opt" in html:
                logger.warning("[hepsiemlak_pw] Cloudflare challenge still active")
                break
            listings = self._parse_listings_from_html(html, city, district, neighborhood, listing_type)
            if not listings:
                logger.info(f"[hepsiemlak_pw] Page {page}: no listings, stopping")
                break
            all_listings.extend(listings)
            logger.info(f"[hepsiemlak_pw] Page {page}: {len(listings)} listings")
            if page < max_pages:
                await asyncio.sleep(random.uniform(2.0, 4.0))
        logger.info(f"[hepsiemlak_pw] Total: {len(all_listings)} ({city}/{district}/{neighborhood}, {listing_type})")
        return all_listings

    async def close(self):
        if self._browser:
            await self._browser.close()
            self._browser = None
        if self._playwright:
            await self._playwright.stop()
            self._playwright = None
