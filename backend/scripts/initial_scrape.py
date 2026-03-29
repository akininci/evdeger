#!/usr/bin/env python3
"""
EvDeğer — İlk Scraping Script
İstanbul, İzmir, Ankara'nın önemli mahallelerinden başlangıç ilanlarını çeker.

Kullanım:
    python scripts/initial_scrape.py

İlerleyiş:
    1. Hepsiemlak'tan satılık + kiralık ilanları çek
    2. Veritabanına kaydet (duplicate kontrolü ile)
    3. Sonuçları logla
"""

import asyncio
import logging
import sys
from datetime import datetime
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import async_session, init_db
from app.models import Listing
from scrapers.hepsiemlak import HepsiemlakScraper
from sqlalchemy import select, and_

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


# Öncelikli mahalleler — yüksek ilan hacmi olan bölgeler
PRIORITY_LOCATIONS = [
    # İstanbul
    ("İstanbul", "Kadıköy", "Moda"),
    ("İstanbul", "Kadıköy", "Göztepe"),
    ("İstanbul", "Beşiktaş", "Etiler"),
    ("İstanbul", "Şişli", "Mecidiyeköy"),
    ("İstanbul", "Sarıyer", "Maslak"),
    
    # İzmir
    ("İzmir", "Karabağlar", "Esenyalı"),
    ("İzmir", "Bornova", "Evka 3"),
    ("İzmir", "Konak", "Alsancak"),
    ("İzmir", "Karşıyaka", "Bostanlı"),
    ("İzmir", "Buca", "Evka 5"),
    
    # Ankara
    ("Ankara", "Çankaya", "Kızılay"),
    ("Ankara", "Yenimahalle", "Batıkent"),
    ("Ankara", "Keçiören", "Etlik"),
]


async def save_listings(scraped_listings: list, db_session) -> tuple[int, int]:
    """
    Scrape edilen ilanları veritabanına kaydeder.
    Duplicate kontrolü yapar (source + source_id).
    
    Returns:
        (inserted, skipped) tuple
    """
    inserted = 0
    skipped = 0

    for item in scraped_listings:
        # Duplicate kontrolü
        if item.source_id:
            stmt = select(Listing).where(
                and_(
                    Listing.source == item.source,
                    Listing.source_id == item.source_id,
                )
            )
            result = await db_session.execute(stmt)
            existing = result.scalar_one_or_none()

            if existing:
                skipped += 1
                continue

        # Yeni ilan ekle
        listing = Listing(
            source=item.source,
            source_id=item.source_id,
            listing_type=item.listing_type,
            property_type=item.property_type,
            city=item.city,
            district=item.district,
            neighborhood=item.neighborhood,
            price=Decimal(str(item.price)),
            currency=item.currency,
            sqm=Decimal(str(item.sqm)) if item.sqm else None,
            rooms=item.rooms,
            floor_number=item.floor_number,
            total_floors=item.total_floors,
            building_age=item.building_age,
            has_elevator=item.has_elevator,
            has_parking=item.has_parking,
            heating_type=item.heating_type,
            listing_url=item.listing_url,
            listed_at=item.listed_at,
            raw_data=item.raw_data,
        )
        db_session.add(listing)
        inserted += 1

    await db_session.commit()
    return inserted, skipped


async def scrape_location(
    scraper,
    city: str,
    district: str,
    neighborhood: str,
    db_session,
):
    """Tek bir lokasyon için satılık + kiralık ilanları çeker."""
    logger.info(f"🔍 Scraping: {city} > {district} > {neighborhood}")

    total_inserted = 0
    total_skipped = 0

    # Satılık ilanlar
    try:
        sale_listings = await scraper.scrape_listings(
            city=city,
            district=district,
            neighborhood=neighborhood,
            listing_type="sale",
            max_pages=3,
        )
        inserted, skipped = await save_listings(sale_listings, db_session)
        total_inserted += inserted
        total_skipped += skipped
        logger.info(f"   ✅ Satılık: {inserted} yeni, {skipped} duplicate")
    except Exception as e:
        logger.error(f"   ❌ Satılık scraping hatası: {e}")

    # Kiralık ilanlar
    try:
        rent_listings = await scraper.scrape_listings(
            city=city,
            district=district,
            neighborhood=neighborhood,
            listing_type="rent",
            max_pages=2,
        )
        inserted, skipped = await save_listings(rent_listings, db_session)
        total_inserted += inserted
        total_skipped += skipped
        logger.info(f"   ✅ Kiralık: {inserted} yeni, {skipped} duplicate")
    except Exception as e:
        logger.error(f"   ❌ Kiralık scraping hatası: {e}")

    return total_inserted, total_skipped


async def main():
    """Ana scraping fonksiyonu."""
    logger.info("🏠 EvDeğer — İlk Scraping Başlatılıyor...")
    logger.info(f"📍 {len(PRIORITY_LOCATIONS)} lokasyon hedefleniyor\n")

    # DB'yi initialize et
    await init_db()

    scraper = HepsiemlakScraper()
    grand_total_inserted = 0
    grand_total_skipped = 0

    async with async_session() as session:
        for idx, (city, district, neighborhood) in enumerate(PRIORITY_LOCATIONS, 1):
            logger.info(f"[{idx}/{len(PRIORITY_LOCATIONS)}]")
            
            try:
                inserted, skipped = await scrape_location(
                    scraper,
                    city,
                    district,
                    neighborhood,
                    session,
                )
                grand_total_inserted += inserted
                grand_total_skipped += skipped

            except Exception as e:
                logger.error(f"❌ Lokasyon hatası: {e}")
                continue

            # Rate limiting — lokasyonlar arası bekleme
            if idx < len(PRIORITY_LOCATIONS):
                await asyncio.sleep(5)

    await scraper.close()

    logger.info("\n" + "="*60)
    logger.info("✅ Scraping Tamamlandı!")
    logger.info(f"📊 Toplam: {grand_total_inserted} yeni ilan eklendi")
    logger.info(f"⏭️  {grand_total_skipped} duplicate atlandı")
    logger.info("="*60)


if __name__ == "__main__":
    asyncio.run(main())
