"""
EvDeğer — Lokasyon API Endpoint'leri
İl, ilçe, mahalle listeleri — autocomplete için.
"""

import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/locations", tags=["Lokasyonlar"])

# Lokasyon verisini yükle
_locations_data: dict | None = None


def _load_locations() -> dict:
    """locations.json dosyasını yükler ve cache'ler."""
    global _locations_data
    if _locations_data is not None:
        return _locations_data

    locations_path = Path(__file__).parent.parent.parent / "data" / "locations.json"
    if not locations_path.exists():
        logger.error(f"locations.json bulunamadı: {locations_path}")
        raise FileNotFoundError(f"Lokasyon verisi bulunamadı: {locations_path}")

    with open(locations_path, "r", encoding="utf-8") as f:
        _locations_data = json.load(f)

    logger.info(f"Lokasyon verisi yüklendi: {len(_locations_data.get('cities', []))} il")
    return _locations_data


class CityResponse(BaseModel):
    """İl yanıt modeli."""
    name: str
    slug: str
    district_count: int


class DistrictResponse(BaseModel):
    """İlçe yanıt modeli."""
    name: str
    slug: str
    neighborhood_count: int


class NeighborhoodResponse(BaseModel):
    """Mahalle yanıt modeli."""
    name: str
    slug: str


@router.get(
    "/cities",
    response_model=list[CityResponse],
    summary="İl Listesi",
    description="Türkiye'deki tüm 81 ilin listesini döndürür.",
)
async def get_cities() -> list[CityResponse]:
    """Tüm illeri döndürür — autocomplete dropdown için."""
    try:
        data = _load_locations()
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Lokasyon verisi yüklenemedi")

    cities = []
    for city in data.get("cities", []):
        cities.append(CityResponse(
            name=city["name"],
            slug=city["slug"],
            district_count=len(city.get("districts", [])),
        ))

    return sorted(cities, key=lambda c: c.name)


@router.get(
    "/districts",
    response_model=list[DistrictResponse],
    summary="İlçe Listesi",
    description="Belirtilen ildeki ilçelerin listesini döndürür.",
)
async def get_districts(
    city: str = Query(..., min_length=2, description="İl adı (ör: İstanbul)")
) -> list[DistrictResponse]:
    """Seçilen ile ait ilçeleri döndürür."""
    try:
        data = _load_locations()
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Lokasyon verisi yüklenemedi")

    city_lower = city.lower().strip()
    city_data = None
    for c in data.get("cities", []):
        if c["name"].lower() == city_lower or c["slug"] == city_lower:
            city_data = c
            break

    if city_data is None:
        raise HTTPException(
            status_code=404,
            detail=f"'{city}' ili bulunamadı. Geçerli bir il adı girin.",
        )

    districts = []
    for district in city_data.get("districts", []):
        districts.append(DistrictResponse(
            name=district["name"],
            slug=district["slug"],
            neighborhood_count=len(district.get("neighborhoods", [])),
        ))

    return sorted(districts, key=lambda d: d.name)


@router.get(
    "/neighborhoods",
    response_model=list[NeighborhoodResponse],
    summary="Mahalle Listesi",
    description="Belirtilen il ve ilçedeki mahallelerin listesini döndürür.",
)
async def get_neighborhoods(
    city: str = Query(..., min_length=2, description="İl adı"),
    district: str = Query(..., min_length=2, description="İlçe adı"),
) -> list[NeighborhoodResponse]:
    """Seçilen il/ilçeye ait mahalleleri döndürür."""
    try:
        data = _load_locations()
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Lokasyon verisi yüklenemedi")

    city_lower = city.lower().strip()
    district_lower = district.lower().strip()

    city_data = None
    for c in data.get("cities", []):
        if c["name"].lower() == city_lower or c["slug"] == city_lower:
            city_data = c
            break

    if city_data is None:
        raise HTTPException(status_code=404, detail=f"'{city}' ili bulunamadı.")

    district_data = None
    for d in city_data.get("districts", []):
        if d["name"].lower() == district_lower or d["slug"] == district_lower:
            district_data = d
            break

    if district_data is None:
        raise HTTPException(
            status_code=404,
            detail=f"'{city}/{district}' ilçesi bulunamadı.",
        )

    neighborhoods = []
    for n in district_data.get("neighborhoods", []):
        if isinstance(n, str):
            neighborhoods.append(NeighborhoodResponse(
                name=n,
                slug=_slugify(n),
            ))
        elif isinstance(n, dict):
            neighborhoods.append(NeighborhoodResponse(
                name=n["name"],
                slug=n.get("slug", _slugify(n["name"])),
            ))

    return sorted(neighborhoods, key=lambda n: n.name)


def _slugify(text: str) -> str:
    """Türkçe karakterleri dönüştürerek URL-uyumlu slug oluşturur."""
    tr_map = {
        "ç": "c", "Ç": "C", "ğ": "g", "Ğ": "G",
        "ı": "i", "İ": "I", "ö": "o", "Ö": "O",
        "ş": "s", "Ş": "S", "ü": "u", "Ü": "U",
    }
    result = text.lower()
    for tr_char, en_char in tr_map.items():
        result = result.replace(tr_char, en_char.lower())
    result = "".join(c if c.isalnum() or c == " " else "" for c in result)
    return result.strip().replace(" ", "-")
