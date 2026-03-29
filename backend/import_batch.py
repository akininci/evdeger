"""
EvDeger — Import Batch Scrape Results to Database
"""
import asyncio
import json
import logging
import sys
from datetime import datetime

sys.path.insert(0, "/app")

from app.database import async_session, init_db
from app.models import Listing
from sqlalchemy import select

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger()


async def main():
    await init_db()

    with open("/app/data/emlakjet_batch.json") as f:
        data = json.load(f)

    total_imported = 0
    total_skipped = 0

    async with async_session() as session:
        for district_key, info in data["districts"].items():
            listings = info["listings"]
            logger.info(f"\n>>> {district_key}: {len(listings)} ilan")

            for item in listings:
                # Check if already exists
                stmt = select(Listing).where(
                    Listing.source == item["source"],
                    Listing.source_id == item["source_id"]
                )
                result = await session.execute(stmt)
                existing = result.scalar_one_or_none()

                if existing:
                    total_skipped += 1
                    continue

                # Create new listing - timezone-naive datetime
                listing = Listing(
                    source=item["source"],
                    source_id=item["source_id"],
                    listing_type=item["listing_type"],
                    property_type="apartment",
                    city=item["city"],
                    district=item["district"],
                    neighborhood=item["neighborhood"],
                    price=item["price"],
                    currency=item.get("currency", "TRY"),
                    sqm=item.get("sqm"),
                    rooms=item.get("rooms"),
                    floor_number=None,
                    building_age=None,
                    listing_url=item.get("url"),
                    raw_data={"title": item.get("title", ""), "created_at": item.get("created_at", "")},
                    scraped_at=datetime.utcnow(),  # timezone-naive
                    is_active=True,
                )

                session.add(listing)
                total_imported += 1

            await session.commit()
            logger.info(f"  {district_key}: commit tamamlandı")

    logger.info(f"\n{'='*60}")
    logger.info(f"Import tamamlandı!")
    logger.info(f"  Eklenen: {total_imported}")
    logger.info(f"  Atlanan (duplicate): {total_skipped}")
    logger.info(f"  Toplam: {total_imported + total_skipped}")


asyncio.run(main())
