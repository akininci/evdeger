"""
EvDeğer — Email Servisi (SendGrid)
Hoşgeldin emaili ve bildirim gönderimi.
"""

import logging
from typing import Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send"


async def send_welcome_email(to_email: str, location: Optional[str] = None) -> bool:
    """
    Yeni aboneye hoşgeldin emaili gönderir (SendGrid API).
    Returns True on success, False on failure.
    """
    if not settings.SENDGRID_API_KEY:
        logger.warning("[email] SENDGRID_API_KEY tanımlı değil, email gönderilmedi")
        return False

    location_text = ""
    if location:
        location_text = f"""
        <p style="color: #10b981; font-weight: 600; margin: 16px 0;">
            📍 Takip ettiğiniz bölge: {location}
        </p>
        """

    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0; padding:0; background-color:#f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; padding: 40px 20px;">
            <tr>
                <td align="center">
                    <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
                        <!-- Header -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 40px; text-align: center;">
                                <h1 style="margin:0; color:#ffffff; font-size: 28px; font-weight: 700;">
                                    🏠 EvDeğer
                                </h1>
                                <p style="margin: 8px 0 0; color: #94a3b8; font-size: 14px;">
                                    Türkiye Emlak Değerleme Platformu
                                </p>
                            </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                            <td style="padding: 40px;">
                                <h2 style="margin: 0 0 16px; color: #0f172a; font-size: 22px;">
                                    Hoş geldiniz! 🎉
                                </h2>
                                <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 0 0 16px;">
                                    EvDeğer'e kaydınız başarıyla oluşturuldu. Artık bölgenizdeki 
                                    emlak fiyat değişikliklerinden anında haberdar olacaksınız.
                                </p>
                                {location_text}
                                <p style="color: #475569; font-size: 15px; line-height: 1.6; margin: 16px 0;">
                                    <strong>Size ne sağlıyoruz?</strong>
                                </p>
                                <ul style="color: #475569; font-size: 14px; line-height: 1.8; padding-left: 20px;">
                                    <li>📊 Haftalık bölge fiyat raporu</li>
                                    <li>📈 Fiyat artış/düşüş bildirimleri</li>
                                    <li>🏘️ Yeni ilan özetleri</li>
                                    <li>💡 Yatırım fırsatı uyarıları</li>
                                </ul>
                                <div style="text-align: center; margin: 32px 0;">
                                    <a href="https://evdeger.durinx.com" 
                                       style="display: inline-block; background: linear-gradient(135deg, #10b981, #34d399); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(16,185,129,0.3);">
                                        Değerleme Yap →
                                    </a>
                                </div>
                            </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0; color: #94a3b8; font-size: 12px; text-align: center;">
                                    Bu email EvDeğer tarafından gönderilmiştir.<br>
                                    Abonelikten çıkmak için 
                                    <a href="https://evdeger.durinx.com/api/unsubscribe?email={to_email}" 
                                       style="color: #64748b;">buraya tıklayın</a>.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    payload = {
        "personalizations": [
            {
                "to": [{"email": to_email}],
                "subject": "🏠 EvDeğer'e Hoş Geldiniz! Bölge Fiyat Takibiniz Aktif",
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
            logger.info(f"[email] Hoşgeldin emaili gönderildi: {to_email}")
            return True
        else:
            logger.error(
                f"[email] SendGrid hatası: {response.status_code} — {response.text}"
            )
            return False

    except Exception as e:
        logger.error(f"[email] Email gönderim hatası: {e}")
        return False
