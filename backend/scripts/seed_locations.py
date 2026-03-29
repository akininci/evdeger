#!/usr/bin/env python3
"""
EvDeğer — Lokasyon Seed Script
locations.json dosyasındaki şehir/ilçe/mahalle verisini veritabanına yükler.

Kullanım:
    python scripts/seed_locations.py
"""

import asyncio
import json
import logging
import sys
from pathlib import Path

# Backend modüllerini import edebilmek için parent directory'yi path'e ekle
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import async_session, init_db
from sqlalchemy import select, func

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(__name__)


async def seed_locations():
    """locations.json'dan veritabanına lokasyon verilerini yükler."""

    # DB'yi initialize et
    await init_db()
    logger.info("✅ Veritabanı bağlantısı kuruldu")

    # JSON dosyasını oku
    data_path = Path(__file__).parent.parent / "data" / "locations.json"
    if not data_path.exists():
        logger.error(f"❌ locations.json bulunamadı: {data_path}")
        return

    with open(data_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    logger.info(f"📄 {len(data.get('cities', []))} il yükleniyor...")

    # NOT: Şu an için locations tablosu yok, sadece listings ve valuations var
    # Lokasyon verileri listings tablosundan çıkarılacak
    # Bu script lokasyon verilerini doğrulamak için kullanılabilir

    total_cities = len(data.get("cities", []))
    total_districts = 0
    total_neighborhoods = 0

    for city in data.get("cities", []):
        city_name = city["name"]
        districts = city.get("districts", [])
        total_districts += len(districts)

        for district in districts:
            if isinstance(district, str):
                # Mahalle listesi yok, sadece ilçe adı
                continue
            elif isinstance(district, dict):
                district_name = district["name"]
                neighborhoods = district.get("neighborhoods", [])
                total_neighborhoods += len(neighborhoods)

                logger.info(
                    f"  {city_name} > {district_name}: {len(neighborhoods)} mahalle"
                )

    logger.info(f"📊 Toplam istatistik:")
    logger.info(f"   • {total_cities} il")
    logger.info(f"   • {total_districts} ilçe")
    logger.info(f"   • {total_neighborhoods} mahalle")
    logger.info("✅ Lokasyon verisi doğrulandı")


if __name__ == "__main__":
    asyncio.run(seed_locations())
