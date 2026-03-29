"""EvDeğer — Scrapers Package"""

from scrapers.base import BaseScraper, ScrapedListing
from scrapers.emlakjet import EmlakjetScraper
from scrapers.hepsiemlak import HepsiemlakScraper
from scrapers.hepsiemlak_scrapfly import HepsiemlakScrapflyScraper

__all__ = [
    "BaseScraper",
    "ScrapedListing",
    "EmlakjetScraper",
    "HepsiemlakScraper",
    "HepsiemlakScrapflyScraper",
]
