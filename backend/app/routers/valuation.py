"""
EvDeğer — Değerleme API Endpoint'leri (v2)
Genişletilmiş response: satılık, kiralık, istatistik, trend, benzer ilanlar.
"""

import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Search
from app.services.valuation_engine import calculate_valuation

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/valuation", tags=["Değerleme"])


# --- Response Models ---

class SaleInfo(BaseModel):
    avg_price_per_sqm: float
    median_price_per_sqm: float
    min_price: float
    max_price: float
    avg_price: float
    sample_size: int
    yoy_change: float | None = None
    confidence: str  # low, medium, high
    confidence_label: str = ""
    blended: bool = False


class RentInfo(BaseModel):
    avg_rent_per_sqm: float | None = None
    avg_rent: float | None = None
    min_rent: float | None = None
    max_rent: float | None = None
    sample_size: int = 0
    yoy_change: float | None = None


class StatsInfo(BaseModel):
    avg_sqm: float
    avg_rooms: str | None = None
    avg_building_age: int | None = None
    gross_rental_yield: float | None = None
    amortization_years: int | None = None
    investment_score: float | None = None
    investment_label: str | None = None


class TrendPoint(BaseModel):
    month: str
    avg_price_per_sqm: float


class SimilarListing(BaseModel):
    title: str
    price: float
    sqm: float | None = None
    rooms: str | None = None
    source: str
    url: str | None = None


class NearbyLink(BaseModel):
    source: str
    url: str
    label: str


class NearbyLinks(BaseModel):
    sale: list[NearbyLink] = []
    rent: list[NearbyLink] = []


class ValuationResponse(BaseModel):
    """Genişletilmiş değerleme API yanıtı."""
    city: str
    district: str
    neighborhood: str
    sale: SaleInfo
    rent: RentInfo
    stats: StatsInfo
    trend: list[TrendPoint] = []
    similar_listings: list[SimilarListing] = []
    estimated_value_low: float
    estimated_value_mid: float
    estimated_value_high: float
    estimated_rent_low: float | None = None
    estimated_rent_mid: float | None = None
    estimated_rent_high: float | None = None
    nearby_links: NearbyLinks | None = None
    data_source: str
    is_mock: bool = False
    calculated_at: str
    disclaimer: str = "Bu değerleme tahmini olup kesin değildir. Resmi ekspertiz raporu yerine geçmez."
    currency: str = "TRY"


class ErrorResponse(BaseModel):
    detail: str
    error_code: str


@router.get(
    "",
    response_model=ValuationResponse,
    responses={
        400: {"model": ErrorResponse, "description": "Geçersiz parametreler"},
    },
    summary="Emlak Değerleme",
    description="""
    Belirtilen lokasyon için tahmini emlak değerlemesi yapar.
    
    **Algoritma:**
    1. Cache kontrolü (Redis — 24 saat TTL)
    2. DB'de comparable listing aranır
    3. Yetersizse → Emlakjet/Hepsiemlak'tan gerçek ilanlar çekilir
    4. IQR outlier temizleme → medyan m² fiyat
    5. %10 pazarlık düzeltmesi uygulanır
    6. Kira, trend, yatırım skoru hesaplanır
    
    **Fallback:** Gerçek veri bulunamazsa tahmini veri döner.
    
    **Örnek:** `/api/valuation?city=izmir&district=karabaglar&neighborhood=esenyali`
    """,
)
async def get_valuation(
    request: Request,
    city: str = Query(..., min_length=2, max_length=100, description="İl adı (ör: İstanbul, İzmir)"),
    district: str = Query(..., min_length=2, max_length=100, description="İlçe adı (ör: Karabağlar)"),
    neighborhood: str = Query(..., min_length=2, max_length=200, description="Mahalle adı (ör: Esenyalı)"),
    db: AsyncSession = Depends(get_db),
) -> ValuationResponse:
    """Belirtilen il/ilçe/mahalle için tahmini emlak değerlemesi döndürür."""

    # Parametre temizleme — Türkçe karakter normalize
    city = _normalize_turkish(city.strip())
    district = _normalize_turkish(district.strip())
    neighborhood = _normalize_turkish(neighborhood.strip())

    # Değerleme hesapla (hiçbir zaman None dönmez — fallback mock var)
    result = await calculate_valuation(db, city, district, neighborhood)

    # Arama kaydı
    try:
        client_ip = request.client.host if request.client else None
        search = Search(
            city=city,
            district=district,
            neighborhood=neighborhood,
            result_avg_price=result.estimated_value_mid,
            result_avg_rent=result.estimated_rent_mid,
            ip_address=client_ip,
        )
        db.add(search)
        await db.flush()
    except Exception as e:
        logger.warning(f"Arama kaydı hatası: {e}")

    # Nearby links oluştur
    nearby_links = _generate_nearby_links(result.city, result.district)

    return ValuationResponse(
        city=result.city,
        district=result.district,
        neighborhood=result.neighborhood,
        sale=SaleInfo(
            avg_price_per_sqm=result.avg_price_per_sqm,
            median_price_per_sqm=result.median_price_per_sqm,
            min_price=result.min_price,
            max_price=result.max_price,
            avg_price=result.avg_price,
            sample_size=result.sale_sample_size,
            yoy_change=result.sale_yoy_change,
            confidence=result.sale_confidence,
            confidence_label=result.confidence_label,
            blended=result.blended,
        ),
        rent=RentInfo(
            avg_rent_per_sqm=result.avg_rent_per_sqm,
            avg_rent=result.avg_rent,
            min_rent=result.min_rent,
            max_rent=result.max_rent,
            sample_size=result.rent_sample_size,
            yoy_change=result.rent_yoy_change,
        ),
        stats=StatsInfo(
            avg_sqm=result.typical_sqm,
            avg_rooms=result.avg_rooms,
            avg_building_age=result.avg_building_age,
            gross_rental_yield=result.gross_rental_yield,
            amortization_years=result.amortization_years,
            investment_score=result.investment_score,
            investment_label=result.investment_label,
        ),
        trend=[TrendPoint(month=t.month, avg_price_per_sqm=t.avg_price_per_sqm) for t in result.trend],
        similar_listings=[
            SimilarListing(
                title=s.title,
                price=s.price,
                sqm=s.sqm,
                rooms=s.rooms,
                source=s.source,
                url=s.url,
            )
            for s in result.similar_listings
        ],
        estimated_value_low=result.estimated_value_low,
        estimated_value_mid=result.estimated_value_mid,
        estimated_value_high=result.estimated_value_high,
        estimated_rent_low=result.estimated_rent_low,
        estimated_rent_mid=result.estimated_rent_mid,
        estimated_rent_high=result.estimated_rent_high,
        nearby_links=nearby_links,
        data_source=result.data_source,
        is_mock=result.is_mock,
        calculated_at=result.calculated_at or datetime.utcnow().isoformat(),
    )


def _generate_nearby_links(city: str, district: str) -> NearbyLinks:
    """
    Verilen il/ilçe için Emlakjet, Sahibinden ve Hepsiemlak linklerini üretir.

    Slug kuralları:
    - Emlakjet/Sahibinden: Türkçe → ASCII (ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u)
    - Hepsiemlak: Türkçe karakterleri korur (URL-encoded)
    """
    import re
    from urllib.parse import quote

    _TR_TO_ASCII = str.maketrans({
        "ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u",
        "Ç": "c", "Ğ": "g", "İ": "i", "Ö": "o", "Ş": "s", "Ü": "u",
    })

    def ascii_slug(text: str) -> str:
        result = text.lower().strip().translate(_TR_TO_ASCII)
        result = re.sub(r"\s+", "-", result)
        result = re.sub(r"[^a-z0-9\-]", "", result)
        result = re.sub(r"-+", "-", result)
        return result.strip("-")

    def turkish_slug(text: str) -> str:
        result = text.lower().strip()
        result = re.sub(r"\s+", "-", result)
        result = re.sub(r"[^a-zçğıöşü0-9\-]", "", result)
        result = re.sub(r"-+", "-", result)
        return result.strip("-")

    city_ascii = ascii_slug(city)
    district_ascii = ascii_slug(district)
    district_tr = turkish_slug(district)
    district_tr_encoded = quote(district_tr, safe="-")

    display_district = district.capitalize() if district == district.lower() else district

    sale_links = [
        NearbyLink(
            source="Emlakjet",
            url=f"https://www.emlakjet.com/satilik-daire/{city_ascii}-{district_ascii}/",
            label=f"Emlakjet'te {display_district} satılık daireler",
        ),
        NearbyLink(
            source="Sahibinden",
            url=f"https://www.sahibinden.com/satilik-daire/{city_ascii}-{district_ascii}",
            label=f"Sahibinden'de {display_district} satılık daireler",
        ),
        NearbyLink(
            source="Hepsiemlak",
            url=f"https://www.hepsiemlak.com/{district_ascii}-satilik/daire",
            label=f"Hepsiemlak'ta {display_district} satılık daireler",
        ),
    ]

    rent_links = [
        NearbyLink(
            source="Emlakjet",
            url=f"https://www.emlakjet.com/kiralik-daire/{city_ascii}-{district_ascii}/",
            label=f"Emlakjet'te {display_district} kiralık daireler",
        ),
        NearbyLink(
            source="Sahibinden",
            url=f"https://www.sahibinden.com/kiralik-daire/{city_ascii}-{district_ascii}",
            label=f"Sahibinden'de {display_district} kiralık daireler",
        ),
        NearbyLink(
            source="Hepsiemlak",
            url=f"https://www.hepsiemlak.com/{district_ascii}-kiralik/daire",
            label=f"Hepsiemlak'ta {display_district} kiralık daireler",
        ),
    ]

    return NearbyLinks(sale=sale_links, rent=rent_links)


def _normalize_turkish(text: str) -> str:
    """
    Query parametrelerindeki Türkçe karakter eksikliklerini düzelt.
    URL'den gelen 'karabaglar' → 'Karabağlar' gibi.
    """
    # Yaygın dönüşümler
    replacements = {
        "karabaglar": "Karabağlar",
        "bornova": "Bornova",
        "karsiyaka": "Karşıyaka",
        "konak": "Konak",
        "buca": "Buca",
        "cigli": "Çiğli",
        "bayrakli": "Bayraklı",
        "gaziemir": "Gaziemir",
        "narlidere": "Narlıdere",
        "guzelbahce": "Güzelbahçe",
        "balcova": "Balçova",
        "izmir": "İzmir",
        "istanbul": "İstanbul",
        "ankara": "Ankara",
        "antalya": "Antalya",
        "bursa": "Bursa",
        "kadikoy": "Kadıköy",
        "besiktas": "Beşiktaş",
        "sisli": "Şişli",
        "uskudar": "Üsküdar",
        "fatih": "Fatih",
        "bakirkoy": "Bakırköy",
        "sariyer": "Sarıyer",
        "maltepe": "Maltepe",
        "atasehir": "Ataşehir",
        "umraniye": "Ümraniye",
        "pendik": "Pendik",
        "tuzla": "Tuzla",
        "beylikduzu": "Beylikdüzü",
        "esenyurt": "Esenyurt",
        "bahcelievler": "Bahçelievler",
        "basaksehir": "Başakşehir",
        "cankaya": "Çankaya",
        "kecioren": "Keçiören",
        "mamak": "Mamak",
        "yenimahalle": "Yenimahalle",
        "etimesgut": "Etimesgut",
        "muratpasa": "Muratpaşa",
        "konyaalti": "Konyaaltı",
        "kepez": "Kepez",
        "esenyali": "Esenyalı",
        "osmangazi": "Osmangazi",
        "cekirge": "Çekirge",
        "nilufer": "Nilüfer",
        "yildirim": "Yıldırım",
        "evka-3": "Evka-3",
        "evka-2": "Evka-2",
    }

    lower = text.lower()
    if lower in replacements:
        return replacements[lower]

    # Başharfi büyük yap (dönüşüm bulunamadıysa)
    return text.capitalize() if text == text.lower() else text
