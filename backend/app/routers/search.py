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
    
    # Collect district-level entries and neighborhood matches
    districts_seen = set()
    matches = []
    
    for city, district, neighborhood in all_locations:
        if not city or not district:
            continue
        
        city_norm = normalize_turkish(city)
        district_norm = normalize_turkish(district)
        neighborhood_norm = normalize_turkish(neighborhood) if neighborhood else ""
        
        # Add district-level entry (once per district)
        district_key = f"{city_norm}_{district_norm}"
        if district_key not in districts_seen:
            districts_seen.add(district_key)
            district_display = f"{district}, {city}"
            
            score = 0
            if q_norm in district_norm:
                score = 5  # District match = highest priority
            elif q_norm in city_norm:
                score = 2
            
            if score > 0:
                matches.append({
                    "city": city,
                    "district": district,
                    "neighborhood": "",
                    "display": district_display,
                    "type": "district",
                    "score": score,
                })
        
        # Add neighborhood-level entry
        if not neighborhood:
            continue
            
        display = f"{neighborhood}, {district}, {city}"
        search_text = f"{neighborhood_norm} {district_norm} {city_norm}"
        
        score = 0
        if q_norm in neighborhood_norm:
            score = 4  # Neighborhood match
        elif q_norm in district_norm:
            score = 3  # District match but showing neighborhood
        elif q_norm in city_norm:
            score = 1
        elif q_norm in search_text:
            score = 1
        
        if score > 0:
            matches.append({
                "city": city,
                "district": district,
                "neighborhood": neighborhood,
                "display": display,
                "type": "neighborhood",
                "score": score,
            })
    
    # Sort: districts first for exact match, then neighborhoods
    matches.sort(key=lambda x: (-x["score"], x["display"]))
    
    # Remove score from response, keep type
    result = []
    for m in matches[:15]:
        result.append({
            "city": m["city"],
            "district": m["district"],
            "neighborhood": m["neighborhood"],
            "display": m["display"],
            "type": m["type"],
        })
    
    return result
