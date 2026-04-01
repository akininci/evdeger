"""
EvDeğer — Email Abonelik Endpoint'leri
Email toplama, hoşgeldin emaili gönderme, JWT-tabanlı abonelik yönetimi.
"""

import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from jose import jwt, JWTError

from app.config import get_settings
from app.database import get_db
from app.models import Subscriber
from app.services.email import send_welcome_email

logger = logging.getLogger(__name__)
settings = get_settings()

router = APIRouter(prefix="/api", tags=["Abonelik"])

UNSUBSCRIBE_TOKEN_EXPIRE_DAYS = 365  # 1 yıl geçerli


# --- Token Helpers ---

def create_unsubscribe_token(email: str) -> str:
    """Email için JWT unsubscribe token oluşturur (1 yıl geçerli)."""
    expire = datetime.utcnow() + timedelta(days=UNSUBSCRIBE_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": email,
        "type": "unsubscribe",
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_unsubscribe_token(token: str) -> str | None:
    """JWT token'ı doğrular, email döner. Geçersizse None."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "unsubscribe":
            return None
        return payload.get("sub")
    except JWTError:
        return None


def get_unsubscribe_url(email: str) -> str:
    """Email için tam unsubscribe URL'i oluşturur."""
    token = create_unsubscribe_token(email)
    return f"https://evdeger.durinx.com/unsubscribe?token={token}"


# --- Request/Response Models ---

class SubscribeRequest(BaseModel):
    """Email abonelik isteği."""
    email: EmailStr
    context: str | None = "general"
    location: str | None = None
    location_city: str | None = None
    location_district: str | None = None
    location_neighborhood: str | None = None


class SubscribeResponse(BaseModel):
    """Abonelik yanıtı."""
    success: bool
    message: str
    already_subscribed: bool = False


class UnsubscribeResponse(BaseModel):
    """Abonelikten çıkma yanıtı."""
    success: bool
    message: str


# --- Endpoints ---

@router.post(
    "/subscribe",
    response_model=SubscribeResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Email Aboneliği",
    description="""
    Kullanıcının email adresini kaydeder ve hoşgeldin emaili gönderir.
    
    - Aynı email tekrar gönderilirse 200 döner (idempotent).
    - SendGrid ile hoşgeldin emaili gönderilir.
    - context: "general", "post_valuation", "hero" gibi kaynak bilgisi.
    - location_city, location_district, location_neighborhood: Bölge bilgisi (ayrı alanlar).
    """,
)
async def subscribe(
    request: SubscribeRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> SubscribeResponse:
    """Email aboneliği oluşturur."""

    email_lower = request.email.lower().strip()

    # Build combined location string if structured fields provided
    location_str = request.location
    if request.location_city and request.location_district:
        parts = [request.location_city, request.location_district]
        if request.location_neighborhood:
            parts.append(request.location_neighborhood)
        location_str = " / ".join(parts)

    # Mevcut abone kontrolü
    stmt = select(Subscriber).where(func.lower(Subscriber.email) == email_lower)
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        if existing.is_active:
            # Update location if new location provided
            if request.location_city:
                existing.location_city = request.location_city
                existing.location_district = request.location_district
                existing.location_neighborhood = request.location_neighborhood
                existing.location = location_str
                await db.flush()
            logger.info(f"[subscribe] Zaten abone: {email_lower}")
            return SubscribeResponse(
                success=True,
                message="Bu email adresi zaten kayıtlı.",
                already_subscribed=True,
            )
        else:
            # Daha önce çıkmıştı, yeniden aktifleştir
            existing.is_active = True
            existing.unsubscribed_at = None
            existing.location = location_str
            existing.location_city = request.location_city
            existing.location_district = request.location_district
            existing.location_neighborhood = request.location_neighborhood
            await db.flush()
            logger.info(f"[subscribe] Yeniden aktifleştirildi: {email_lower}")

            background_tasks.add_task(
                send_welcome_email, email_lower, location_str
            )

            return SubscribeResponse(
                success=True,
                message="Aboneliğiniz yeniden aktifleştirildi!",
                already_subscribed=False,
            )

    # Yeni abone oluştur
    subscriber = Subscriber(
        email=email_lower,
        context=request.context,
        location=location_str,
        location_city=request.location_city,
        location_district=request.location_district,
        location_neighborhood=request.location_neighborhood,
        is_active=True,
        welcome_sent=False,
    )
    db.add(subscriber)
    await db.flush()

    logger.info(f"[subscribe] Yeni abone: {email_lower} (context={request.context}, location={location_str})")

    background_tasks.add_task(
        _send_and_mark_welcome, email_lower, location_str, subscriber.id
    )

    return SubscribeResponse(
        success=True,
        message="Kaydınız başarıyla oluşturuldu! Hoşgeldin emaili gönderildi.",
        already_subscribed=False,
    )


async def _send_and_mark_welcome(email: str, location: str | None, subscriber_id: int):
    """Hoşgeldin emaili gönder ve DB'de welcome_sent olarak işaretle."""
    success = await send_welcome_email(email, location)

    if success:
        try:
            from app.database import async_session
            async with async_session() as session:
                stmt = select(Subscriber).where(Subscriber.id == subscriber_id)
                result = await session.execute(stmt)
                sub = result.scalar_one_or_none()
                if sub:
                    sub.welcome_sent = True
                    await session.commit()
        except Exception as e:
            logger.error(f"[subscribe] welcome_sent güncelleme hatası: {e}")


@router.get(
    "/unsubscribe",
    response_model=UnsubscribeResponse,
    summary="Abonelikten Çıkma (JWT Token)",
    description="JWT token ile email aboneliğini iptal eder. Eski email query param da desteklenir.",
)
async def unsubscribe(
    token: str | None = Query(None, description="JWT unsubscribe token"),
    email: str | None = Query(None, description="Legacy: email adresi (eski linkler için)"),
    db: AsyncSession = Depends(get_db),
) -> UnsubscribeResponse:
    """Email aboneliğini devre dışı bırakır (JWT token veya legacy email)."""

    # Determine email from token or direct param
    target_email = None

    if token:
        target_email = verify_unsubscribe_token(token)
        if not target_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Geçersiz veya süresi dolmuş bağlantı. Lütfen yeni bir abonelik iptal bağlantısı isteyin.",
            )
    elif email:
        target_email = email.lower().strip()
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Token veya email parametresi gerekli.",
        )

    stmt = select(Subscriber).where(func.lower(Subscriber.email) == target_email.lower())
    result = await db.execute(stmt)
    subscriber = result.scalar_one_or_none()

    if not subscriber:
        return UnsubscribeResponse(
            success=True,
            message="Bu email adresi sistemimizde kayıtlı değil.",
        )

    if not subscriber.is_active:
        return UnsubscribeResponse(
            success=True,
            message="Aboneliğiniz zaten iptal edilmiş durumda.",
        )

    subscriber.is_active = False
    subscriber.unsubscribed_at = datetime.utcnow()
    await db.flush()

    logger.info(f"[subscribe] Abonelik iptal edildi: {target_email}")

    return UnsubscribeResponse(
        success=True,
        message="Aboneliğiniz başarıyla iptal edildi. Artık email almayacaksınız.",
    )


@router.get(
    "/subscribers/count",
    summary="Abone Sayısı",
    description="Toplam aktif abone sayısını döner.",
)
async def subscriber_count(
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Toplam aktif abone sayısını döner (social proof için)."""
    stmt = select(func.count(Subscriber.id)).where(Subscriber.is_active == True)  # noqa: E712
    result = await db.execute(stmt)
    count = result.scalar() or 0

    return {"count": count}
