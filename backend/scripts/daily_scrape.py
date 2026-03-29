#!/usr/bin/env python3
"""
EvDeğer — Günlük Scraping Script
Her gün büyükşehirlerin popüler ilçelerini scrape edip DB'ye yazar.

Kullanım:
    python scripts/daily_scrape.py
    
Docker içinde cron:
    0 4 * * * cd /app && python scripts/daily_scrape.py >> /var/log/evdeger/daily_scrape.log 2>&1
"""

import asyncio
import logging
import os
import sys
from datetime import datetime
from decimal import Decimal
from pathlib import Path

# Project root'u sys.path'e ekle
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from scrapers.emlakjet import EmlakjetScraper
from scrapers.hepsiemlak import HepsiemlakScraper
from scrapers.base import ScrapedListing
from app.models import Listing, Base
from app.config import get_settings

# Logging
log_dir = Path("/var/log/evdeger")
log_dir.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(log_dir / "daily_scrape.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger("daily_scrape")

settings = get_settings()

# Büyükşehirlerin popüler ilçeleri
TARGETS = {
    "İstanbul": [
        "Kadıköy", "Beşiktaş", "Şişli", "Üsküdar", "Bakırköy",
        "Ataşehir", "Maltepe", "Pendik", "Kartal", "Sarıyer",
        "Beylikdüzü", "Esenyurt", "Bahçelievler", "Başakşehir",
        "Fatih", "Beyoğlu", "Ümraniye", "Tuzla",
    ],
    "İzmir": [
        "Karabağlar", "Bornova", "Karşıyaka", "Konak", "Buca",
        "Çiğli", "Bayraklı", "Gaziemir", "Narlıdere", "Balçova",
    ],
    "Ankara": [
        "Çankaya", "Keçiören", "Mamak", "Yenimahalle", "Etimesgut",
        "Sincan", "Pursaklar", "Gölbaşı",
    ],
    "Antalya": [
        "Muratpaşa", "Konyaaltı", "Kepez", "Döşemealtı", "Aksu",
    ],
    "Bursa": [
        "Nilüfer", "Osmangazi", "Yıldırım", "Mudanya",
    ],
}


async def store_listings(
    session: AsyncSession,
    listings: list[ScrapedListing],
) -> int:
    """Scraped ilanları DB'ye yaz, duplicate'leri atla."""
    stored = 0
    for scraped in listings:
        try:
            if scraped.source_id:
                existing = await session.execute(
                    select(Listing).where(
                        and_(
                            Listing.source == scraped.source,
                            Listing.source_id == scraped.source_id,
                        )
                    )
                )
                if existing.scalar_one_or_none():
                    continue

            listing = Listing(
                source=scraped.source,
                source_id=scraped.source_id,
                listing_type=scraped.listing_type,
                property_type=scraped.property_type,
                city=scraped.city,
                district=scraped.district,
                neighborhood=scraped.neighborhood,
                price=Decimal(str(scraped.price)),
                currency=scraped.currency,
                sqm=Decimal(str(scraped.sqm)) if scraped.sqm else None,
                rooms=scraped.rooms,
                floor_number=scraped.floor_number,
                building_age=scraped.building_age,
                listing_url=scraped.listing_url,
                is_active=True,
                raw_data=scraped.raw_data,
            )
            session.add(listing)
            stored += 1
        except Exception as e:
            logger.debug(f"Kayıt hatası: {e}")
            continue

    if stored > 0:
        await session.commit()

    return stored


async def scrape_district(
    session: AsyncSession,
    scraper: EmlakjetScraper,
    city: str,
    district: str,
) -> dict:
    """Tek bir ilçeyi hem satılık hem kiralık scrape et."""
    stats = {"city": city, "district": district, "sale": 0, "rent": 0, "errors": []}

    for listing_type in ["sale", "rent"]:
        try:
            listings = await scraper.scrape_listings(
                city=city,
                district=district,
                neighborhood="",  # İlçe geneli
                listing_type=listing_type,
                max_pages=3,
            )
            if listings:
                stored = await store_listings(session, listings)
                stats[listing_type] = stored
                logger.info(f"  {city}/{district} {listing_type}: {stored}/{len(listings)} ilan kaydedildi")
            else:
                logger.info(f"  {city}/{district} {listing_type}: ilan bulunamadı")
        except Exception as e:
            error_msg = f"{city}/{district} {listing_type}: {str(e)}"
            stats["errors"].append(error_msg)
            logger.error(f"  HATA: {error_msg}")

    return stats


async def main():
    """Ana günlük scraping fonksiyonu."""
    start_time = datetime.now()
    logger.info("=" * 60)
    logger.info(f"🏠 EvDeğer Günlük Scraping Başlatılıyor — {start_time.strftime('%Y-%m-%d %H:%M')}")
    logger.info("=" * 60)

    # DB bağlantısı
    engine = create_async_engine(settings.DATABASE_URL, pool_size=5)
    async_session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    # Tabloları oluştur (ilk çalıştırma için)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    scraper = EmlakjetScraper()
    all_stats = []
    total_sale = 0
    total_rent = 0
    total_errors = 0

    try:
        async with async_session_factory() as session:
            for city, districts in TARGETS.items():
                logger.info(f"\n📍 {city} ({len(districts)} ilçe)")
                for district in districts:
                    stats = await scrape_district(session, scraper, city, district)
                    all_stats.append(stats)
                    total_sale += stats["sale"]
                    total_rent += stats["rent"]
                    total_errors += len(stats["errors"])
    finally:
        await scraper.close()
        await engine.dispose()

    # Özet
    elapsed = (datetime.now() - start_time).total_seconds()
    logger.info("\n" + "=" * 60)
    logger.info(f"✅ Günlük Scraping Tamamlandı — {elapsed:.0f} saniye")
    logger.info(f"   📊 Satılık: {total_sale} ilan | Kiralık: {total_rent} ilan")
    logger.info(f"   ❌ Hata: {total_errors}")
    logger.info(f"   🏙️  İlçe: {len(all_stats)}")
    logger.info("=" * 60)

    if total_errors > 0:
        logger.warning("Hatalar:")
        for stats in all_stats:
            for error in stats.get("errors", []):
                logger.warning(f"  - {error}")


if __name__ == "__main__":
    asyncio.run(main())
