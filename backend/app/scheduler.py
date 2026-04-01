"""
EvDeğer — Scheduler (APScheduler)
- Günlük scraping: Her gün 04:00 UTC
- Günlük arşivleme: Her gün 03:00 UTC
- Aylık rapor emaili: Her ayın 1'i 10:00 UTC
"""

import asyncio
import logging
from datetime import datetime, timedelta
from decimal import Decimal

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select, and_, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import async_session
from app.models import Listing

logger = logging.getLogger(__name__)
settings = get_settings()

scheduler = AsyncIOScheduler()

# Büyükşehirlerin popüler ilçeleri — haftalık scraping hedefleri
WEEKLY_TARGETS = {
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


async def archive_old_listings():
    """30 günden eski ilanları is_active=False olarak arşivle."""
    threshold = datetime.utcnow() - timedelta(days=30)

    try:
        async with async_session() as session:
            stmt = (
                update(Listing)
                .where(
                    and_(
                        Listing.is_active == True,  # noqa: E712
                        Listing.scraped_at < threshold,
                    )
                )
                .values(is_active=False)
            )
            result = await session.execute(stmt)
            await session.commit()

            archived_count = result.rowcount
            if archived_count > 0:
                logger.info(f"[scheduler] {archived_count} eski ilan arşivlendi (30 gün+)")
            else:
                logger.info("[scheduler] Arşivlenecek eski ilan yok")

    except Exception as e:
        logger.error(f"[scheduler] Arşivleme hatası: {e}", exc_info=True)


async def weekly_scrape():
    """Haftalık scraping job — tüm hedef ilçeleri scrape eder."""
    start_time = datetime.utcnow()
    logger.info("=" * 60)
    logger.info(f"[scheduler] Haftalık scraping başlatılıyor — {start_time.isoformat()}")
    logger.info("=" * 60)

    await archive_old_listings()

    total_stored = 0
    total_errors = 0

    try:
        from scrapers.emlakjet import EmlakjetScraper
        scraper = EmlakjetScraper()

        async with async_session() as session:
            for city, districts in WEEKLY_TARGETS.items():
                for district in districts:
                    try:
                        for listing_type in ["sale", "rent"]:
                            listings = await scraper.scrape_listings(
                                city=city,
                                district=district,
                                neighborhood="",
                                listing_type=listing_type,
                                max_pages=3,
                            )

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
                                    logger.debug(f"[scheduler] İlan kayıt hatası: {e}")
                                    continue

                            if stored > 0:
                                await session.commit()
                                total_stored += stored

                            logger.info(
                                f"[scheduler] {city}/{district} {listing_type}: "
                                f"{stored}/{len(listings)} ilan kaydedildi"
                            )

                    except Exception as e:
                        total_errors += 1
                        logger.error(f"[scheduler] {city}/{district} hatası: {e}")
                        continue

                    await asyncio.sleep(3)

        await scraper.close()

    except Exception as e:
        logger.error(f"[scheduler] Scraping hatası: {e}", exc_info=True)

    elapsed = (datetime.utcnow() - start_time).total_seconds()
    logger.info("=" * 60)
    logger.info(
        f"[scheduler] Haftalık scraping tamamlandı — "
        f"{total_stored} ilan, {total_errors} hata, {elapsed:.0f}s"
    )
    logger.info("=" * 60)


async def monthly_report_job():
    """Aylık ev değeri raporu — tüm aktif abonelere email gönderir."""
    from app.services.monthly_report import send_monthly_reports
    await send_monthly_reports()


def setup_scheduler():
    """APScheduler'ı yapılandır ve başlat."""
    # Günlük scraping: Her gün 04:00 UTC (07:00 İstanbul)
    scheduler.add_job(
        weekly_scrape,
        trigger=CronTrigger(hour=4, minute=0),
        id="daily_scrape",
        name="Günlük Emlak Verisi Scraping",
        replace_existing=True,
        misfire_grace_time=3600,
    )

    # Günlük arşivleme: Her gün 03:00 UTC
    scheduler.add_job(
        archive_old_listings,
        trigger=CronTrigger(hour=3, minute=0),
        id="daily_archive",
        name="Günlük Eski İlan Arşivleme",
        replace_existing=True,
    )

    # Aylık rapor emaili: Her ayın 1'i 10:00 UTC (13:00 İstanbul)
    scheduler.add_job(
        monthly_report_job,
        trigger=CronTrigger(day=1, hour=10, minute=0),
        id="monthly_report",
        name="Aylık Ev Değeri Rapor Emaili",
        replace_existing=True,
        misfire_grace_time=7200,  # 2 saat tolerans
    )

    scheduler.start()
    logger.info(
        "[scheduler] APScheduler başlatıldı — "
        "Günlük scraping: 04:00 UTC, "
        "Aylık rapor: Her 1'i 10:00 UTC"
    )
