"""
EvDeğer — Evimi Claim Et API
Kullanıcıların evlerini kaydetmesi, bilgilerini düzenlemesi ve kişiselleştirilmiş değerleme alması.
Zillow "Claim Your Home" konsepti.
"""

import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, and_, func, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import ClaimedHome

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/homes", tags=["homes"])


class HomeCreate(BaseModel):
    """Ev oluşturma isteği."""
    clerk_user_id: str
    city: str
    district: str
    neighborhood: str
    address: Optional[str] = None
    sqm: Optional[float] = None
    rooms: Optional[str] = None
    floor_number: Optional[int] = None
    total_floors: Optional[int] = None
    building_age: Optional[int] = None
    has_elevator: Optional[bool] = None
    has_parking: Optional[bool] = None
    has_balcony: Optional[bool] = None
    heating_type: Optional[str] = None
    property_type: str = "apartment"


class HomeUpdate(BaseModel):
    """Ev güncelleme isteği."""
    address: Optional[str] = None
    sqm: Optional[float] = None
    rooms: Optional[str] = None
    floor_number: Optional[int] = None
    total_floors: Optional[int] = None
    building_age: Optional[int] = None
    has_elevator: Optional[bool] = None
    has_parking: Optional[bool] = None
    has_balcony: Optional[bool] = None
    heating_type: Optional[str] = None
    property_type: Optional[str] = None


class PersonalizedValuation(BaseModel):
    """Kişiselleştirilmiş değerleme sonucu."""
    base_price_per_sqm: float
    adjustments: dict
    adjusted_price_per_sqm: float
    estimated_value: float
    estimated_rent: float
    confidence: str


@router.post("")
async def create_home(home: HomeCreate, db: AsyncSession = Depends(get_db)):
    """Yeni ev claim et."""
    # Aynı kullanıcının aynı adreste evi var mı kontrol
    existing = await db.execute(
        select(ClaimedHome).where(
            and_(
                ClaimedHome.clerk_user_id == home.clerk_user_id,
                func.lower(ClaimedHome.city) == home.city.lower(),
                func.lower(ClaimedHome.district) == home.district.lower(),
                func.lower(ClaimedHome.neighborhood) == home.neighborhood.lower(),
            )
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Bu ev zaten kayıtlı")

    new_home = ClaimedHome(
        clerk_user_id=home.clerk_user_id,
        city=home.city,
        district=home.district,
        neighborhood=home.neighborhood,
        address=home.address,
        sqm=home.sqm,
        rooms=home.rooms,
        floor_number=home.floor_number,
        total_floors=home.total_floors,
        building_age=home.building_age,
        has_elevator=home.has_elevator,
        has_parking=home.has_parking,
        has_balcony=home.has_balcony,
        heating_type=home.heating_type,
        property_type=home.property_type,
    )
    db.add(new_home)
    await db.commit()
    await db.refresh(new_home)

    return {
        "id": new_home.id,
        "message": "Eviniz başarıyla kaydedildi",
        "city": new_home.city,
        "district": new_home.district,
        "neighborhood": new_home.neighborhood,
    }


@router.get("")
async def get_homes(
    clerk_user_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Kullanıcının tüm evlerini getir."""
    result = await db.execute(
        select(ClaimedHome)
        .where(ClaimedHome.clerk_user_id == clerk_user_id)
        .order_by(ClaimedHome.is_primary.desc(), ClaimedHome.created_at.desc())
    )
    homes = result.scalars().all()

    return {
        "homes": [
            {
                "id": h.id,
                "city": h.city,
                "district": h.district,
                "neighborhood": h.neighborhood,
                "address": h.address,
                "sqm": h.sqm,
                "rooms": h.rooms,
                "floor_number": h.floor_number,
                "total_floors": h.total_floors,
                "building_age": h.building_age,
                "has_elevator": h.has_elevator,
                "has_parking": h.has_parking,
                "has_balcony": h.has_balcony,
                "heating_type": h.heating_type,
                "property_type": h.property_type,
                "is_primary": h.is_primary,
                "last_valuation": h.last_valuation,
                "last_valuation_date": h.last_valuation_date.isoformat() if h.last_valuation_date else None,
                "created_at": h.created_at.isoformat() if h.created_at else None,
            }
            for h in homes
        ],
        "total": len(homes),
    }


@router.put("/{home_id}")
async def update_home(
    home_id: int,
    updates: HomeUpdate,
    clerk_user_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Ev bilgilerini güncelle — değer yeniden hesaplanır."""
    result = await db.execute(
        select(ClaimedHome).where(
            and_(ClaimedHome.id == home_id, ClaimedHome.clerk_user_id == clerk_user_id)
        )
    )
    home = result.scalar_one_or_none()
    if not home:
        raise HTTPException(status_code=404, detail="Ev bulunamadı")

    update_data = updates.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(home, field, value)

    await db.commit()
    await db.refresh(home)

    return {"id": home.id, "message": "Ev bilgileri güncellendi", "updated_fields": list(update_data.keys())}


@router.delete("/{home_id}")
async def delete_home(
    home_id: int,
    clerk_user_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """Evi sil."""
    result = await db.execute(
        select(ClaimedHome).where(
            and_(ClaimedHome.id == home_id, ClaimedHome.clerk_user_id == clerk_user_id)
        )
    )
    home = result.scalar_one_or_none()
    if not home:
        raise HTTPException(status_code=404, detail="Ev bulunamadı")

    await db.delete(home)
    await db.commit()

    return {"message": "Ev silindi"}


@router.get("/{home_id}/valuation")
async def get_personalized_valuation(
    home_id: int,
    clerk_user_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    """
    Kişiselleştirilmiş değerleme — ev bilgilerine göre fiyat ayarlaması.
    
    Ayarlama faktörleri:
    - Bina yaşı: 0-5 yıl → +%5, 5-15 → 0, 15-30 → -%5, 30+ → -%10
    - Kat: Zemin → -%5, 1-3 → 0, 4+ → +%3, Çatı/Penthouse → +%8
    - Asansör: Var → +%3, 4+ kat ve yok → -%5
    - Otopark: Var → +%5
    - Balkon: Var → +%2
    - Isıtma: Doğalgaz/Kombi → +%3, Soba → -%5
    """
    result = await db.execute(
        select(ClaimedHome).where(
            and_(ClaimedHome.id == home_id, ClaimedHome.clerk_user_id == clerk_user_id)
        )
    )
    home = result.scalar_one_or_none()
    if not home:
        raise HTTPException(status_code=404, detail="Ev bulunamadı")

    # Bölge bazlı ortalama m² fiyatını al
    from app.services.valuation_engine import calculate_valuation
    base_result = await calculate_valuation(
        db=db,
        city=home.city,
        district=home.district,
        neighborhood=home.neighborhood,
    )

    if not base_result or not hasattr(base_result, "median_price_per_sqm"):
        raise HTTPException(status_code=404, detail="Bu bölge için değerleme verisi bulunamadı")

    base_price = base_result.median_price_per_sqm
    adjustments = {}
    total_adjustment = 0.0

    # Bina yaşı ayarlaması
    if home.building_age is not None:
        if home.building_age <= 5:
            adj = 5.0
            adjustments["building_age"] = {"label": "Yeni bina (0-5 yıl)", "percent": adj}
        elif home.building_age <= 15:
            adj = 0.0
            adjustments["building_age"] = {"label": "Orta yaş bina (5-15 yıl)", "percent": adj}
        elif home.building_age <= 30:
            adj = -5.0
            adjustments["building_age"] = {"label": "Eski bina (15-30 yıl)", "percent": adj}
        else:
            adj = -10.0
            adjustments["building_age"] = {"label": "Çok eski bina (30+ yıl)", "percent": adj}
        total_adjustment += adj

    # Kat ayarlaması
    if home.floor_number is not None:
        if home.floor_number == 0:
            adj = -5.0
            adjustments["floor"] = {"label": "Zemin kat", "percent": adj}
        elif home.floor_number <= 3:
            adj = 0.0
            adjustments["floor"] = {"label": f"{home.floor_number}. kat", "percent": adj}
        elif home.floor_number >= 10:
            adj = 8.0
            adjustments["floor"] = {"label": "Yüksek kat (manzara)", "percent": adj}
        else:
            adj = 3.0
            adjustments["floor"] = {"label": f"{home.floor_number}. kat", "percent": adj}
        total_adjustment += adj

    # Asansör
    if home.has_elevator is not None:
        if home.has_elevator:
            adj = 3.0
            adjustments["elevator"] = {"label": "Asansör var", "percent": adj}
        elif home.floor_number and home.floor_number >= 4:
            adj = -5.0
            adjustments["elevator"] = {"label": "Asansör yok (yüksek kat)", "percent": adj}
        total_adjustment += adj if home.has_elevator or (home.floor_number and home.floor_number >= 4) else 0

    # Otopark
    if home.has_parking:
        adj = 5.0
        adjustments["parking"] = {"label": "Otopark var", "percent": adj}
        total_adjustment += adj

    # Balkon
    if home.has_balcony:
        adj = 2.0
        adjustments["balcony"] = {"label": "Balkon var", "percent": adj}
        total_adjustment += adj

    # Isıtma
    if home.heating_type:
        ht = home.heating_type.lower()
        if ht in ("doğalgaz", "dogalgaz", "kombi"):
            adj = 3.0
            adjustments["heating"] = {"label": "Doğalgaz/Kombi", "percent": adj}
        elif ht in ("soba", "odun"):
            adj = -5.0
            adjustments["heating"] = {"label": "Soba ısıtma", "percent": adj}
        else:
            adj = 0.0
            adjustments["heating"] = {"label": home.heating_type, "percent": adj}
        total_adjustment += adj

    # Hesapla
    adjusted_price = base_price * (1 + total_adjustment / 100)
    sqm = home.sqm or base_result.typical_sqm or 100
    estimated_value = adjusted_price * sqm

    # Kira tahmini
    rent_per_sqm = base_result.avg_rent_per_sqm or 0
    estimated_rent = rent_per_sqm * sqm * (1 + total_adjustment / 200)  # Kira daha az etkilenir

    # Sonucu kaydet
    home.last_valuation = estimated_value
    home.last_valuation_date = datetime.utcnow()
    await db.commit()

    return {
        "home_id": home.id,
        "city": home.city,
        "district": home.district,
        "neighborhood": home.neighborhood,
        "sqm": sqm,
        "base_price_per_sqm": round(base_price, 0),
        "total_adjustment_percent": round(total_adjustment, 1),
        "adjustments": adjustments,
        "adjusted_price_per_sqm": round(adjusted_price, 0),
        "estimated_value": round(estimated_value, 0),
        "estimated_rent": round(estimated_rent, 0),
        "confidence": base_result.sale_confidence if hasattr(base_result, "sale_confidence") else "medium",
        "sample_size": base_result.sale_sample_size if hasattr(base_result, "sale_sample_size") else 0,
    }
