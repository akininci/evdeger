"""
EvDeğer — Aylık Ev Değeri Rapor Servisi
Her ayın 1'inde aktif abonelere bölge değerleme raporu gönderir.
"""

import logging
import os
from datetime import datetime
from decimal import Decimal
from pathlib import Path
from typing import Optional

import httpx
from sqlalchemy import select, and_

from app.config import get_settings
from app.database import async_session
from app.models import Subscriber, Valuation, Listing

logger = logging.getLogger(__name__)
settings = get_settings()

SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send"

# Template path
TEMPLATE_DIR = Path(__file__).parent.parent.parent / "templates"
MONTHLY_TEMPLATE_PATH = TEMPLATE_DIR / "monthly_report.html"

# Turkish month names
TURKISH_MONTHS = {
    1: "Ocak", 2: "Şubat", 3: "Mart", 4: "Nisan",
    5: "Mayıs", 6: "Haziran", 7: "Temmuz", 8: "Ağustos",
    9: "Eylül", 10: "Ekim", 11: "Kasım", 12: "Aralık",
}


def _format_number(n: float | Decimal | None) -> str:
    """Sayıyı Türkçe formatla (nokta binlik ayracı)."""
    if n is None:
        return "—"
    return f"{int(n):,}".replace(",", ".")


def _render_template(
    location: str,
    avg_price_per_sqm: float,
    change_percent: float | None,
    similar_listings_count: int,
    unsubscribe_url: str,
) -> str:
    """HTML template'i verilerle doldurur (Jinja2-free basit string replace)."""
    try:
        template = MONTHLY_TEMPLATE_PATH.read_text(encoding="utf-8")
    except FileNotFoundError:
        logger.error(f"[monthly_report] Template bulunamadı: {MONTHLY_TEMPLATE_PATH}")
        raise

    now = datetime.utcnow()
    report_month = f"{TURKISH_MONTHS[now.month]} {now.year}"

    # Change indicator styling
    if change_percent is not None:
        if change_percent > 0:
            change_icon = "📈"
            change_bg_color = "#dcfce7"
            change_text_color = "#166534"
            change_str = f"+{change_percent:.1f}"
        elif change_percent < 0:
            change_icon = "📉"
            change_bg_color = "#fef2f2"
            change_text_color = "#991b1b"
            change_str = f"{change_percent:.1f}"
        else:
            change_icon = "➡️"
            change_bg_color = "#f1f5f9"
            change_text_color = "#475569"
            change_str = "0.0"
    else:
        change_icon = ""
        change_bg_color = ""
        change_text_color = ""
        change_str = ""

    estimated_100sqm = _format_number(avg_price_per_sqm * 100)

    # Simple template rendering
    html = template
    html = html.replace("{{ report_month }}", report_month)
    html = html.replace("{{ location }}", location)
    html = html.replace("{{ avg_price_per_sqm }}", _format_number(avg_price_per_sqm))
    html = html.replace("{{ estimated_value_100sqm }}", estimated_100sqm)
    html = html.replace("{{ similar_listings_count }}", str(similar_listings_count))
    html = html.replace("{{ unsubscribe_url }}", unsubscribe_url)

    # Handle change section
    if change_percent is not None:
        html = html.replace("{{ change_icon }}", change_icon)
        html = html.replace("{{ change_bg_color }}", change_bg_color)
        html = html.replace("{{ change_text_color }}", change_text_color)
        html = html.replace("{{ change_percent }}", change_str)
        # Remove Jinja2 conditionals
        html = html.replace("{% if change_percent is not none %}", "")
        html = html.replace("{% endif %}", "")
    else:
        # Remove the entire change block
        import re
        html = re.sub(
            r'\{%\s*if change_percent is not none\s*%\}.*?\{%\s*endif\s*%\}',
            '',
            html,
            flags=re.DOTALL,
        )

    return html


async def _get_valuation_data(city: str, district: str, neighborhood: str | None) -> dict | None:
    """Bölge için en güncel değerleme verilerini çeker."""
    async with async_session() as session:
        # Get latest sale valuation
        stmt = select(Valuation).where(
            and_(
                Valuation.city == city,
                Valuation.district == district,
                Valuation.listing_type == "sale",
            )
        )
        if neighborhood:
            stmt = stmt.where(Valuation.neighborhood == neighborhood)
        stmt = stmt.order_by(Valuation.calculated_at.desc()).limit(1)

        result = await session.execute(stmt)
        current = result.scalar_one_or_none()

        if not current:
            # Try from active listings directly
            from sqlalchemy import func as sqla_func
            listing_stmt = select(
                sqla_func.avg(Listing.price / Listing.sqm).label("avg_psm"),
                sqla_func.count(Listing.id).label("cnt"),
            ).where(
                and_(
                    Listing.city == city,
                    Listing.district == district,
                    Listing.listing_type == "sale",
                    Listing.is_active == True,
                    Listing.sqm > 0,
                )
            )
            if neighborhood:
                listing_stmt = listing_stmt.where(Listing.neighborhood == neighborhood)

            lr = await session.execute(listing_stmt)
            row = lr.one_or_none()
            if row and row.avg_psm:
                return {
                    "avg_price_per_sqm": float(row.avg_psm),
                    "change_percent": None,
                    "similar_count": int(row.cnt),
                }
            return None

        # Get previous month valuation for comparison
        prev_stmt = select(Valuation).where(
            and_(
                Valuation.city == city,
                Valuation.district == district,
                Valuation.listing_type == "sale",
                Valuation.calculated_at < current.calculated_at,
            )
        )
        if neighborhood:
            prev_stmt = prev_stmt.where(Valuation.neighborhood == neighborhood)
        prev_stmt = prev_stmt.order_by(Valuation.calculated_at.desc()).limit(1)

        prev_result = await session.execute(prev_stmt)
        previous = prev_result.scalar_one_or_none()

        change_pct = None
        if previous and previous.avg_price_per_sqm and current.avg_price_per_sqm:
            change_pct = float(
                (current.avg_price_per_sqm - previous.avg_price_per_sqm)
                / previous.avg_price_per_sqm
                * 100
            )

        return {
            "avg_price_per_sqm": float(current.avg_price_per_sqm) if current.avg_price_per_sqm else 0,
            "change_percent": change_pct,
            "similar_count": current.sample_size or 0,
        }


async def _send_monthly_email(to_email: str, html_content: str) -> bool:
    """SendGrid ile aylık rapor emaili gönderir."""
    if not settings.SENDGRID_API_KEY:
        logger.warning("[monthly_report] SENDGRID_API_KEY tanımlı değil")
        return False

    now = datetime.utcnow()
    month_name = TURKISH_MONTHS[now.month]

    payload = {
        "personalizations": [
            {
                "to": [{"email": to_email}],
                "subject": f"🏠 {month_name} {now.year} — Evinizin Güncel Değeri",
            }
        ],
        "from": {
            "email": settings.SENDGRID_FROM_EMAIL,
            "name": "EvDeğer",
        },
        "content": [
            {
                "type": "text/html",
                "value": html_content,
            }
        ],
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                SENDGRID_API_URL,
                json=payload,
                headers={
                    "Authorization": f"Bearer {settings.SENDGRID_API_KEY}",
                    "Content-Type": "application/json",
                },
            )

        if response.status_code in (200, 201, 202):
            logger.info(f"[monthly_report] Email gönderildi: {to_email}")
            return True
        else:
            logger.error(f"[monthly_report] SendGrid hatası: {response.status_code} — {response.text}")
            return False

    except Exception as e:
        logger.error(f"[monthly_report] Email gönderim hatası ({to_email}): {e}")
        return False


async def send_monthly_reports():
    """
    Tüm aktif abonelere aylık ev değeri raporu gönderir.
    Scheduler tarafından her ayın 1'inde çağrılır.
    """
    from app.routers.subscribe import get_unsubscribe_url

    logger.info("=" * 60)
    logger.info("[monthly_report] Aylık rapor gönderimi başlatılıyor...")
    logger.info("=" * 60)

    sent = 0
    failed = 0
    skipped = 0

    try:
        async with async_session() as session:
            # Get all active subscribers
            stmt = select(Subscriber).where(Subscriber.is_active == True)  # noqa: E712
            result = await session.execute(stmt)
            subscribers = result.scalars().all()

            logger.info(f"[monthly_report] {len(subscribers)} aktif abone bulundu")

            for sub in subscribers:
                try:
                    # Determine location
                    city = sub.location_city
                    district = sub.location_district
                    neighborhood = sub.location_neighborhood

                    # Fallback: parse from legacy location field
                    if not city and sub.location:
                        parts = [p.strip() for p in sub.location.split("/")]
                        if len(parts) >= 2:
                            city = parts[0]
                            district = parts[1]
                            neighborhood = parts[2] if len(parts) >= 3 else None

                    if not city or not district:
                        logger.debug(f"[monthly_report] Lokasyon eksik, atlaniyor: {sub.email}")
                        skipped += 1
                        continue

                    # Get valuation data
                    data = await _get_valuation_data(city, district, neighborhood)

                    if not data or data["avg_price_per_sqm"] == 0:
                        logger.debug(f"[monthly_report] Veri yok, atlaniyor: {sub.email} ({city}/{district})")
                        skipped += 1
                        continue

                    # Build location string
                    loc_parts = [city, district]
                    if neighborhood:
                        loc_parts.append(neighborhood)
                    location_str = " / ".join(loc_parts)

                    # Generate unsubscribe URL
                    unsub_url = get_unsubscribe_url(sub.email)

                    # Render template
                    html = _render_template(
                        location=location_str,
                        avg_price_per_sqm=data["avg_price_per_sqm"],
                        change_percent=data["change_percent"],
                        similar_listings_count=data["similar_count"],
                        unsubscribe_url=unsub_url,
                    )

                    # Send email
                    success = await _send_monthly_email(sub.email, html)

                    if success:
                        sent += 1
                    else:
                        failed += 1

                except Exception as e:
                    logger.error(f"[monthly_report] Hata ({sub.email}): {e}", exc_info=True)
                    failed += 1

    except Exception as e:
        logger.error(f"[monthly_report] Genel hata: {e}", exc_info=True)

    logger.info("=" * 60)
    logger.info(
        f"[monthly_report] Tamamlandı — Gönderildi: {sent}, Başarısız: {failed}, Atlanan: {skipped}"
    )
    logger.info("=" * 60)
