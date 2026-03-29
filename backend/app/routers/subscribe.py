"""
EvDeğer — Email Abonelik Endpoint'leri
Email toplama, hoşgeldin emaili gönderme, abonelik yönetimi.
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, EmailStr
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Subscriber
from app.services.email import send_welcome_email

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Abonelik"])


# --- Request/Response Models ---

class SubscribeRequest(BaseModel):
    """Email abonelik isteği."""
    email: EmailStr
    context: str | None = "general"
    location: str | None = None


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
    """,
)
async def subscribe(
    request: SubscribeRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> SubscribeResponse:
    """Email aboneliği oluşturur."""

    email_lower = request.email.lower().strip()

    # Mevcut abone kontrolü
    stmt = select(Subscriber).where(func.lower(Subscriber.email) == email_lower)
    result = await db.execute(stmt)
    existing = result.scalar_one_or_none()

    if existing:
        if existing.is_active:
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
            await db.flush()
            logger.info(f"[subscribe] Yeniden aktifleştirildi: {email_lower}")

            # Hoşgeldin emaili gönder (background)
            background_tasks.add_task(
                send_welcome_email, email_lower, request.location
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
        location=request.location,
        is_active=True,
        welcome_sent=False,
    )
    db.add(subscriber)
    await db.flush()

    logger.info(f"[subscribe] Yeni abone: {email_lower} (context={request.context})")

    # Hoşgeldin emaili gönder (background task — response'u geciktirmesin)
    background_tasks.add_task(
        _send_and_mark_welcome, email_lower, request.location, subscriber.id
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
    summary="Abonelikten Çıkma",
    description="Email aboneliğini iptal eder.",
)
async def unsubscribe(
    email: str,
    db: AsyncSession = Depends(get_db),
) -> UnsubscribeResponse:
    """Email aboneliğini devre dışı bırakır."""

    email_lower = email.lower().strip()

    stmt = select(Subscriber).where(func.lower(Subscriber.email) == email_lower)
    result = await db.execute(stmt)
    subscriber = result.scalar_one_or_none()

    if not subscriber:
        return UnsubscribeResponse(
            success=True,
            message="Bu email adresi sistemimizde kayıtlı değil.",
        )

    subscriber.is_active = False
    subscriber.unsubscribed_at = datetime.utcnow()
    await db.flush()

    logger.info(f"[subscribe] Abonelik iptal edildi: {email_lower}")

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
