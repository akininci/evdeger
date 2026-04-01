"""
EvDeğer — Bölge Karşılaştırma API
Seçilen mahalle ile komşu mahalleler/ilçeler arasında fiyat karşılaştırması yapar.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, and_, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Listing

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/compare", tags=["compare"])

# Türkçe → ASCII dönüşüm (PostgreSQL translate için)
_pg_tr_from = "çÇğĞıİöÖşŞüÜ"
_pg_tr_to   = "cCgGiIoOsSuU"


def _pg_normalize(col):
    """PostgreSQL'de Türkçe karakterleri ASCII'ye çevirir ve lowercase yapar."""
    return func.lower(func.translate(col, _pg_tr_from, _pg_tr_to))


def _turkish_to_ascii(text_val: str) -> str:
    """Python tarafında Türkçe → ASCII."""
    tr_map = str.maketrans({
        "ç": "c", "Ç": "c", "ğ": "g", "Ğ": "g",
        "ı": "i", "İ": "i", "ö": "o", "Ö": "o",
        "ş": "s", "Ş": "s", "ü": "u", "Ü": "u",
    })
    return text_val.lower().translate(tr_map)


@router.get("")
async def compare_neighborhoods(
    city: str = Query(..., description="Şehir adı"),
    district: str = Query(..., description="İlçe adı"),
    neighborhood: Optional[str] = Query(None, description="Mahalle adı (opsiyonel)"),
    db: AsyncSession = Depends(get_db),
):
    """
    Seçilen mahalle ile aynı ilçedeki diğer mahalleleri karşılaştırır.
    Mahalle verilmezse ilçedeki tüm mahalleleri döner.
    """
    city_norm = _turkish_to_ascii(city)
    district_norm = _turkish_to_ascii(district)
    
    try:
        # ORM ile Türkçe-safe query
        city_filter = _pg_normalize(Listing.city) == city_norm
        district_filter = _pg_normalize(Listing.district) == district_norm
        
        # Satılık ilanlar — mahalle bazında
        stmt = (
            select(
                Listing.neighborhood,
                func.count().label("listing_count"),
                func.round(func.avg(Listing.price / func.nullif(Listing.sqm, 0)), 0).label("avg_price_per_sqm"),
                func.round(func.avg(Listing.price), 0).label("avg_price"),
                func.round(func.avg(Listing.sqm), 0).label("avg_sqm"),
            )
            .where(
                and_(
                    city_filter,
                    district_filter,
                    Listing.listing_type == "sale",
                    Listing.sqm > 0,
                    Listing.price > 0,
                    Listing.is_active == True,
                )
            )
            .group_by(Listing.neighborhood)
            .having(func.count() >= 3)
            .order_by(func.avg(Listing.price / func.nullif(Listing.sqm, 0)).desc())
        )
        
        result = await db.execute(stmt)
        rows = result.fetchall()
        
        if not rows:
            return {
                "city": city,
                "district": district,
                "neighborhoods": [],
                "message": "Bu ilçede yeterli veri bulunamadı"
            }
        
        neighborhoods = []
        neighborhood_norm = _turkish_to_ascii(neighborhood) if neighborhood else None
        
        for row in rows:
            n_name = row[0] or "Bilinmiyor"
            # "Mahallesi" suffix temizliği
            display_name = n_name.replace(" Mahallesi", "").replace(" Mah.", "").strip()
            
            entry = {
                "neighborhood": display_name,
                "listing_count": row[1],
                "avg_price_per_sqm": float(row[2]) if row[2] else None,
                "avg_price": float(row[3]) if row[3] else None,
                "avg_sqm": float(row[4]) if row[4] else None,
            }
            
            # Seçili mahalle işareti
            if neighborhood_norm:
                n_norm = _turkish_to_ascii(n_name).replace(" mahallesi", "").replace(" mah", "").strip()
                if n_norm == neighborhood_norm or n_norm.startswith(neighborhood_norm):
                    entry["selected"] = True
            
            neighborhoods.append(entry)
        
        # İlçe ortalaması
        valid_prices = [n["avg_price_per_sqm"] for n in neighborhoods if n["avg_price_per_sqm"]]
        district_avg = sum(valid_prices) / len(valid_prices) if valid_prices else 0
        
        # Kira karşılaştırması
        rent_stmt = (
            select(
                Listing.neighborhood,
                func.count().label("listing_count"),
                func.round(func.avg(Listing.price / func.nullif(Listing.sqm, 0)), 0).label("avg_rent_per_sqm"),
                func.round(func.avg(Listing.price), 0).label("avg_rent"),
            )
            .where(
                and_(
                    city_filter,
                    district_filter,
                    Listing.listing_type == "rent",
                    Listing.sqm > 0,
                    Listing.price > 0,
                    Listing.is_active == True,
                )
            )
            .group_by(Listing.neighborhood)
            .having(func.count() >= 2)
        )
        
        rent_result = await db.execute(rent_stmt)
        rent_rows = rent_result.fetchall()
        
        rent_map = {}
        for row in rent_rows:
            if row[0]:
                key = _turkish_to_ascii(row[0]).replace(" mahallesi", "").replace(" mah", "").strip()
                rent_map[key] = {
                    "rent_listing_count": row[1],
                    "avg_rent_per_sqm": float(row[2]) if row[2] else None,
                    "avg_rent": float(row[3]) if row[3] else None,
                }
        
        # Merge rent data + yield hesapla
        for n in neighborhoods:
            key = _turkish_to_ascii(n["neighborhood"])
            if key in rent_map:
                n.update(rent_map[key])
                if n.get("avg_rent_per_sqm") and n.get("avg_price_per_sqm") and n["avg_price_per_sqm"] > 0:
                    n["gross_yield"] = round((n["avg_rent_per_sqm"] * 12 / n["avg_price_per_sqm"]) * 100, 1)
        
        return {
            "city": city,
            "district": district,
            "selected_neighborhood": neighborhood,
            "district_avg_price_per_sqm": round(district_avg, 0),
            "total_neighborhoods": len(neighborhoods),
            "neighborhoods": neighborhoods,
        }
        
    except Exception as e:
        logger.error(f"Karşılaştırma hatası: {e}")
        return {"error": str(e), "neighborhoods": []}
