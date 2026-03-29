"""
EvDeğer — İstatistik API Endpoint'i
Ana sayfa ve dashboard için gerçek veriler.
"""

import logging
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.database import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/stats", tags=["İstatistikler"])


class StatsResponse(BaseModel):
    total_listings: int
    total_valuations: int
    city_count: int
    district_count: int
    data_sources: list[str]


@router.get("", response_model=StatsResponse, summary="Platform İstatistikleri")
async def get_stats(db: AsyncSession = Depends(get_db)) -> StatsResponse:
    """Platformun gerçek istatistiklerini döndürür."""
    try:
        # Total listings
        result = await db.execute(text("SELECT COUNT(*) FROM listings"))
        total_listings = result.scalar() or 0

        # Total valuations (searches)
        result = await db.execute(text("SELECT COUNT(*) FROM searches"))
        total_valuations = result.scalar() or 0

        # Distinct cities
        result = await db.execute(text("SELECT COUNT(DISTINCT city) FROM listings"))
        city_count = result.scalar() or 0

        # Distinct districts
        result = await db.execute(text("SELECT COUNT(DISTINCT district) FROM listings"))
        district_count = result.scalar() or 0

        # Data sources
        result = await db.execute(text("SELECT DISTINCT source FROM listings WHERE source IS NOT NULL"))
        sources = [row[0] for row in result.fetchall()]

        return StatsResponse(
            total_listings=total_listings,
            total_valuations=total_valuations,
            city_count=city_count,
            district_count=district_count,
            data_sources=sources,
        )
    except Exception as e:
        logger.error(f"Stats hatası: {e}")
        return StatsResponse(
            total_listings=0,
            total_valuations=0,
            city_count=0,
            district_count=0,
            data_sources=[],
        )
