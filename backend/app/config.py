"""
EvDeğer — Uygulama Konfigürasyonu
Environment değişkenlerinden yapılandırma yüklenir.
"""

import os
from functools import lru_cache
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseModel):
    """Uygulama ayarları — .env dosyasından veya environment'tan okunur."""

    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://evdeger:evdeger@localhost:5432/evdeger"
    )

    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # JWT Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production-super-secret-key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 gün

    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://evdeger.durinx.com",
    ]

    # Scraping
    SCRAPE_CACHE_TTL: int = 60 * 60 * 24  # 24 saat
    MIN_COMPS: int = 10  # Minimum comparable listing sayısı
    BARGAIN_FACTOR: float = 0.90  # %10 pazarlık düzeltmesi
    RENT_YIELD_MONTHLY: float = 0.005  # Aylık %0.5 kira getirisi

    # SendGrid
    SENDGRID_API_KEY: str = os.getenv("SENDGRID_API_KEY", "")
    SENDGRID_FROM_EMAIL: str = os.getenv("SENDGRID_FROM_EMAIL", "bilgi@evdeger.durinx.com")

    # App
    APP_NAME: str = "EvDeğer API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"


@lru_cache()
def get_settings() -> Settings:
    """Singleton settings instance döndürür."""
    return Settings()
