"""EvDeğer — Adres Arama Endpoint"""

from fastapi import APIRouter, Query
from sqlalchemy import select, func, or_, and_, text
from app.database import async_session
from app.models import Listing
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/search", tags=["search"])

# Turkish char normalization
_TR_MAP = str.maketrans({
    "ç": "c", "Ç": "c", "ğ": "g", "Ğ": "g",
    "ı": "i", "İ": "i", "ö": "o", "Ö": "o",
    "ş": "s", "Ş": "s", "ü": "u", "Ü": "u",
    "â": "a", "î": "i", "û": "u",
})

def normalize_turkish(text: str) -> str:
    return text.translate(_TR_MAP).lower().strip()


@router.get("/locations")
async def search_locations(q: str = Query(..., min_length=2, max_length=100)):
    """Search cities, districts, neighborhoods by query string."""
    q_norm = normalize_turkish(q)
    
    async with async_session() as db:
        # Get distinct city/district/neighborhood combos
        stmt = (
            select(
                Listing.city,
                Listing.district, 
                Listing.neighborhood,
            )
            .where(
                Listing.is_active == True,
                Listing.neighborhood.isnot(None),
                Listing.neighborhood != "",
            )
            .distinct()
        )
        result = await db.execute(stmt)
        all_locations = result.all()
    
    # Filter and score matches
    matches = []
    for city, district, neighborhood in all_locations:
        if not city or not district or not neighborhood:
            continue
        
        city_norm = normalize_turkish(city)
        district_norm = normalize_turkish(district)
        neighborhood_norm = normalize_turkish(neighborhood)
        
        display = f"{neighborhood}, {district}, {city}"
        search_text = f"{neighborhood_norm} {district_norm} {city_norm}"
        
        # Score based on match quality
        score = 0
        if q_norm in neighborhood_norm:
            score = 3  # Best: neighborhood match
        elif q_norm in district_norm:
            score = 2  # Good: district match
        elif q_norm in city_norm:
            score = 1  # OK: city match
        elif q_norm in search_text:
            score = 1
        
        if score > 0:
            matches.append({
                "city": city,
                "district": district,
                "neighborhood": neighborhood,
                "display": display,
                "score": score,
            })
    
    # Sort by score (best first), then alphabetically, limit 10
    matches.sort(key=lambda x: (-x["score"], x["display"]))
    
    # Remove score from response
    for m in matches[:10]:
        del m["score"]
    
    return matches[:10]
