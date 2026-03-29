"""
EvDeğer — Ana FastAPI Uygulaması
Türkiye Emlak Değerleme Platformu API.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.database import init_db, close_db
from app.services.cache import close_redis
from app.scheduler import setup_scheduler, scheduler
from app.routers import valuation, locations, auth, subscribe, stats

# Logging ayarları
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Uygulama yaşam döngüsü — başlangıç ve kapanış işlemleri."""
    # Startup
    logger.info(f"🏠 {settings.APP_NAME} v{settings.APP_VERSION} başlatılıyor...")
    await init_db()
    logger.info("✅ Veritabanı bağlantısı kuruldu")
    setup_scheduler()
    logger.info("⏰ Haftalık scraping scheduler aktif")
    logger.info("🚀 API hazır")

    yield

    # Shutdown
    logger.info("🔄 Kapatılıyor...")
    scheduler.shutdown(wait=False)
    await close_redis()
    await close_db()
    logger.info("👋 Kapatıldı")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
    ## EvDeğer — Türkiye Emlak Değerleme Platformu API
    
    Türkiye'deki herkes, adresini girerek evinin ortalama satış ve kira değerini 
    ücretsiz öğrenebilsin.
    
    ### Özellikler:
    - 🏠 **Emlak Değerleme** — İl/İlçe/Mahalle bazında tahmini değer
    - 📊 **Bölge İstatistikleri** — m² fiyat, trend, ilan sayısı
    - 📍 **Lokasyon Verileri** — 81 il, ilçeler, mahalleler
    - 🔐 **Kullanıcı Sistemi** — Kayıt, giriş, detaylı rapor
    """,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Unhandled exception handler — tüm hataları logla
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    """Yakalanmamış hataları loglar ve 500 döner."""
    logger.exception(
        f"Unhandled exception: {request.method} {request.url.path} — {type(exc).__name__}: {exc}"
    )
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.",
            "error": type(exc).__name__,
        },
    )


# Router'ları ekle
app.include_router(valuation.router)
app.include_router(locations.router)
app.include_router(auth.router)
app.include_router(subscribe.router)
app.include_router(stats.router)


@app.get("/", tags=["Genel"])
async def root():
    """API kök endpoint'i — sağlık kontrolü."""
    return {
        "name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "healthy",
        "docs": "/docs",
    }


@app.get("/health", tags=["Genel"])
@app.get("/api/health", tags=["Genel"], include_in_schema=False)
async def health_check():
    """Detaylı sağlık kontrolü — DB, Redis ve lokasyon verisi durumu."""
    db_ok = False
    redis_ok = False
    locations_count = 0

    # DB kontrolü
    try:
        from app.database import engine
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        db_ok = True
    except Exception as e:
        logger.error(f"Health check — DB hatası: {e}")

    # Redis kontrolü
    try:
        from app.services.cache import get_redis
        r = await get_redis()
        await r.ping()
        redis_ok = True
    except Exception as e:
        logger.error(f"Health check — Redis hatası: {e}")

    # Lokasyon verisi kontrolü
    try:
        from app.routers.locations import _load_locations
        data = _load_locations()
        locations_count = len(data.get("cities", []))
    except Exception as e:
        logger.error(f"Health check — Locations hatası: {e}")

    status = "healthy" if (db_ok and redis_ok and locations_count > 0) else "degraded"

    return {
        "status": status,
        "db": db_ok,
        "redis": redis_ok,
        "locations": locations_count,
    }
