"""
EvDeğer — TCMB Konut Fiyat Endeksi API
"""

from fastapi import APIRouter, Query
from app.services.tcmb import get_kfe_data, KFE_SERIES

router = APIRouter(prefix="/api/tcmb", tags=["TCMB"])


@router.get("/kfe")
async def get_housing_price_index(
    city: str = Query("turkiye", description="İl adı (örn: istanbul, izmir, ankara)"),
    months: int = Query(12, ge=1, le=60, description="Kaç aylık veri"),
):
    """TCMB Konut Fiyat Endeksi verisi — il bazlı yıllık/aylık değişim."""
    data = await get_kfe_data(city, months)
    if not data:
        return {"error": "Veri bulunamadı", "city": city}
    return data


@router.get("/kfe/cities")
async def list_available_cities():
    """Konut Fiyat Endeksi mevcut iller."""
    return {
        "cities": [{"name": c, "series_code": s} for c, s in KFE_SERIES.items()],
        "total": len(KFE_SERIES),
        "source": "TCMB EVDS",
    }
