"""
EvDeğer — Base Scraper
Tüm scraper'ların miras aldığı temel sınıf.
"""

import asyncio
import logging
import random
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime

import httpx

logger = logging.getLogger(__name__)


@dataclass
class ScrapedListing:
    """Scrape edilmiş ilan verisi."""
    source: str
    source_id: str | None = None
    listing_type: str = "sale"  # sale, rent
    property_type: str = "apartment"
    city: str = ""
    district: str = ""
    neighborhood: str = ""
    price: float = 0.0
    currency: str = "TRY"
    sqm: float | None = None
    rooms: str | None = None  # 2+1, 3+1
    floor_number: int | None = None
    total_floors: int | None = None
    building_age: int | None = None
    has_elevator: bool | None = None
    has_parking: bool | None = None
    heating_type: str | None = None
    listing_url: str | None = None
    listed_at: datetime | None = None
    raw_data: dict = field(default_factory=dict)


# Gerçekçi User-Agent listesi (güncel 2025-2026 tarayıcılar)
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0",
]


class BaseScraper(ABC):
    """
    Tüm scraper'ların base class'ı.
    Rate limiting, retry logic ve ortak HTTP işlemleri sağlar.
    """

    def __init__(
        self,
        source_name: str,
        base_url: str,
        min_delay: float = 2.0,
        max_delay: float = 5.0,
        max_retries: int = 3,
        timeout: float = 30.0,
    ):
        self.source_name = source_name
        self.base_url = base_url
        self.min_delay = min_delay
        self.max_delay = max_delay
        self.max_retries = max_retries
        self.timeout = timeout
        self._client: httpx.AsyncClient | None = None

    async def _get_client(self) -> httpx.AsyncClient:
        """HTTP client döndürür (singleton). Headers istekte değil client'ta set edilir."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                timeout=httpx.Timeout(self.timeout),
                follow_redirects=True,
                # headers burada set etme — her istekte farklı olacak
            )
        return self._client

    def _get_headers(self) -> dict:
        """Rastgele User-Agent ile HTTP headers döndürür."""
        return {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
            # NOT: "br" (brotli) kaldırıldı — httpx brotli desteği için
            # brotli/brotlicffi paketi lazım, yoksa compressed yanıt decode edilemez
            "Accept-Encoding": "gzip, deflate",
            "Connection": "keep-alive",
            "Cache-Control": "max-age=0",
            "Referer": "https://www.google.com.tr/",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "cross-site",
            "Sec-Fetch-User": "?1",
            "Upgrade-Insecure-Requests": "1",
        }

    async def _fetch(self, url: str) -> str | None:
        """
        URL'den sayfa içeriğini çeker.
        Retry logic ve rate limiting dahil.
        """
        for attempt in range(1, self.max_retries + 1):
            try:
                # Rate limiting — rastgele gecikme (async)
                delay = random.uniform(self.min_delay, self.max_delay)
                await asyncio.sleep(delay)

                # Her istekte farklı User-Agent ve yeni client (encoding sorunları için)
                headers = self._get_headers()
                
                async with httpx.AsyncClient(
                    timeout=httpx.Timeout(self.timeout),
                    follow_redirects=True,
                ) as client:
                    response = await client.get(url, headers=headers)

                    if response.status_code == 200:
                        return response.text
                    elif response.status_code == 403:
                        logger.warning(f"[{self.source_name}] 403 Forbidden: {url} (attempt {attempt})")
                        await asyncio.sleep(delay * 2)
                    elif response.status_code == 429:
                        logger.warning(f"[{self.source_name}] 429 Rate Limited: {url}")
                        await asyncio.sleep(delay * 5)
                    else:
                        logger.warning(
                            f"[{self.source_name}] HTTP {response.status_code}: {url} (attempt {attempt})"
                        )

            except httpx.TimeoutException:
                logger.warning(f"[{self.source_name}] Timeout: {url} (attempt {attempt})")
            except Exception as e:
                logger.error(f"[{self.source_name}] Hata: {url} — {e} (attempt {attempt})")

        logger.error(f"[{self.source_name}] {self.max_retries} deneme başarısız: {url}")
        return None

    @abstractmethod
    async def scrape_listings(
        self,
        city: str,
        district: str,
        neighborhood: str,
        listing_type: str = "sale",
        max_pages: int = 5,
    ) -> list[ScrapedListing]:
        """
        Belirtilen lokasyon için ilanları scrape eder.
        Alt sınıflar bu metodu implement etmeli.
        """
        ...

    async def close(self):
        """HTTP client'ı kapatır."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    @staticmethod
    def _parse_price(text: str) -> float | None:
        """
        Fiyat metnini float'a çevirir.
        Türkçe format: 1.500.000 TL veya 1.500.000,50 TL
        Tek noktalı format: 28.000 TL (28 bin, binlik ayracı)
        """
        if not text:
            return None
        try:
            cleaned = text.strip()
            # TL, ₺ ve para birimi kaldır
            for remove in ["TL", "₺", "tl", "EUR", "USD", "$", "€"]:
                cleaned = cleaned.replace(remove, "")
            cleaned = cleaned.strip()

            if not cleaned:
                return None

            if "," in cleaned and "." in cleaned:
                # 1.500.000,00 formatı — nokta=binlik, virgül=ondalık
                cleaned = cleaned.replace(".", "").replace(",", ".")
            elif "," in cleaned:
                # 1500000,00 formatı — virgül=ondalık
                cleaned = cleaned.replace(",", ".")
            elif "." in cleaned:
                # Türkçe'de nokta HER ZAMAN binlik ayracı
                # 28.000 → 28000, 1.500.000 → 1500000, 3.750.000 → 3750000
                # Ondalık fiyat emlak ilanlarında pratik olarak yok
                cleaned = cleaned.replace(".", "")

            return float(cleaned)
        except (ValueError, AttributeError):
            return None

    @staticmethod
    def _parse_sqm(text: str) -> float | None:
        """m² metnini float'a çevirir."""
        if not text:
            return None
        try:
            cleaned = text.strip().lower()
            for remove in ["m²", "m2", "brüt", "net", "metrekare"]:
                cleaned = cleaned.replace(remove, "")
            cleaned = cleaned.strip().replace(",", ".")
            return float(cleaned)
        except (ValueError, AttributeError):
            return None

    @staticmethod
    def _parse_int(text: str) -> int | None:
        """Metin değeri int'e çevirir."""
        if not text:
            return None
        try:
            cleaned = "".join(c for c in text if c.isdigit())
            return int(cleaned) if cleaned else None
        except (ValueError, AttributeError):
            return None
