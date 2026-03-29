"""
EvDeğer — Değerleme Motoru (v2)
Gerçek scraping entegrasyonu + IQR outlier temizleme + genişletilmiş response.

Akış:
1. Cache kontrol (Redis — 24h TTL)
2. DB'de yeterli comp var mı kontrol
3. Yoksa → Emlakjet'ten gerçek ilanları çek (hepsiemlak fallback)
4. IQR outlier temizleme → medyan m² fiyat → %10 pazarlık düzeltmesi
5. Sonucu cache'e yaz ve dön
6. Scraping başarısız olursa → mock data (hata yerine)
"""

import logging
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from decimal import Decimal
from statistics import median, mean

from sqlalchemy import select, and_, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import Listing, Valuation
from app.services.cache import cache_get, cache_set

logger = logging.getLogger(__name__)
settings = get_settings()


@dataclass
class SimilarListing:
    """Benzer ilan verisi."""
    title: str
    price: float
    sqm: float | None
    rooms: str | None
    source: str
    url: str | None


@dataclass
class TrendPoint:
    """Aylık trend verisi."""
    month: str
    avg_price_per_sqm: float


@dataclass
class ValuationResult:
    """Genişletilmiş değerleme sonucu."""
    city: str
    district: str
    neighborhood: str
    # Satılık
    avg_price_per_sqm: float
    median_price_per_sqm: float
    min_price_per_sqm: float
    max_price_per_sqm: float
    min_price: float
    max_price: float
    avg_price: float
    estimated_value_low: float
    estimated_value_mid: float
    estimated_value_high: float
    sale_sample_size: int
    sale_confidence: str  # low, medium, high
    sale_yoy_change: float | None
    # Kiralık
    avg_rent_per_sqm: float | None
    avg_rent: float | None
    min_rent: float | None
    max_rent: float | None
    estimated_rent_low: float | None
    estimated_rent_mid: float | None
    estimated_rent_high: float | None
    rent_sample_size: int
    rent_yoy_change: float | None
    # İstatistikler
    typical_sqm: float
    avg_rooms: str | None
    avg_building_age: int | None
    gross_rental_yield: float | None
    amortization_years: int | None
    investment_score: float | None
    investment_label: str | None
    # Trend + benzer ilanlar
    trend: list[TrendPoint] = field(default_factory=list)
    similar_listings: list[SimilarListing] = field(default_factory=list)
    # Meta
    data_source: str = "emlakjet"
    calculated_at: str = ""
    is_mock: bool = False
    listing_type: str = "sale"


def _percentile(data: list[float], p: float) -> float:
    """Basit percentile hesaplama (0-100 arası)."""
    sorted_data = sorted(data)
    n = len(sorted_data)
    k = (p / 100.0) * (n - 1)
    f = int(k)
    c = f + 1
    if c >= n:
        return sorted_data[-1]
    d0 = sorted_data[f] * (c - k)
    d1 = sorted_data[c] * (k - f)
    return d0 + d1


def filter_outliers_iqr(prices: list[float]) -> list[float]:
    """
    IQR metodu ile outlier temizleme.
    Q1 - 1.5*IQR ile Q3 + 1.5*IQR arasındaki değerleri tutar.
    """
    if len(prices) < 4:
        return prices

    q1 = _percentile(prices, 25)
    q3 = _percentile(prices, 75)
    iqr = q3 - q1

    lower_bound = q1 - 1.5 * iqr
    upper_bound = q3 + 1.5 * iqr

    filtered = [p for p in prices if lower_bound <= p <= upper_bound]

    if len(filtered) < 3:
        return prices

    logger.info(
        f"IQR filtreleme: {len(prices)} → {len(filtered)} "
        f"(Q1={q1:.0f}, Q3={q3:.0f}, IQR={iqr:.0f})"
    )
    return filtered


def _confidence_level(sample_size: int) -> str:
    """Sample size'a göre güven seviyesi."""
    if sample_size >= 30:
        return "high"
    elif sample_size >= 15:
        return "medium"
    return "low"


def _calculate_investment_score(
    gross_yield: float | None,
    yoy_change: float | None,
    sample_size: int,
) -> tuple[float, str]:
    """
    Yatırım skoru hesapla (1-10).
    Faktörler: kira getirisi, yıllık değer artışı, veri güvenilirliği.
    """
    score = 5.0  # Base

    if gross_yield is not None:
        if gross_yield >= 6:
            score += 2.0
        elif gross_yield >= 4.5:
            score += 1.0
        elif gross_yield < 3:
            score -= 1.0

    if yoy_change is not None:
        if yoy_change >= 30:
            score += 1.5
        elif yoy_change >= 15:
            score += 0.5
        elif yoy_change < 0:
            score -= 2.0

    if sample_size >= 30:
        score += 0.5
    elif sample_size < 10:
        score -= 1.0

    score = max(1.0, min(10.0, score))

    if score >= 7.5:
        label = "Yüksek"
    elif score >= 5.0:
        label = "Orta"
    else:
        label = "Düşük"

    return round(score, 1), label


async def _scrape_and_store(
    db: AsyncSession,
    city: str,
    district: str,
    neighborhood: str,
    listing_type: str = "sale",
) -> int:
    """
    Çoklu kaynak scraping yapıp sonuçları DB'ye yazar.
    Prensip: TEK kaynağa dayanma — en az 2-3 kaynak kullan, çapraz doğrula.
    Returns: eklenen ilan sayısı.
    """
    stored_count = 0
    all_listings = []

    # === KAYNAK 1: Emlakjet (Cloudflare yok, en güvenilir) ===
    try:
        from scrapers.emlakjet import EmlakjetScraper
        scraper = EmlakjetScraper()
        try:
            ej_listings = await scraper.scrape_listings(
                city=city, district=district, neighborhood=neighborhood,
                listing_type=listing_type, max_pages=3,
            )
            if ej_listings:
                all_listings.extend(ej_listings)
                logger.info(f"[valuation] Emlakjet: {len(ej_listings)} ilan bulundu")
        finally:
            await scraper.close()
    except Exception as e:
        logger.warning(f"[valuation] Emlakjet hatası: {e}")

    # === KAYNAK 2: Hepsiemlak (Scrapfly ile Cloudflare bypass) ===
    he_listings = []
    try:
        from scrapers.hepsiemlak_scrapfly import HepsiemlakScrapflyScraper
        scraper2 = HepsiemlakScrapflyScraper()
        try:
            he_listings = await scraper2.scrape_listings(
                city=city, district=district, neighborhood=neighborhood,
                listing_type=listing_type, max_pages=2,  # Credit tasarrufu
            )
            if he_listings:
                logger.info(
                    f"[valuation] Hepsiemlak (Scrapfly): {len(he_listings)} ilan, "
                    f"credits used: {scraper2.credits_used}"
                )
        finally:
            await scraper2.close()
    except Exception as e:
        logger.warning(f"[valuation] Hepsiemlak Scrapfly hatası: {e}")

    # Scrapfly başarısızsa → eski HTTP scraper ile dene (Cloudflare engelleyebilir)
    if not he_listings:
        try:
            from scrapers.hepsiemlak import HepsiemlakScraper
            fallback = HepsiemlakScraper()
            try:
                he_listings = await fallback.scrape_listings(
                    city=city, district=district, neighborhood=neighborhood,
                    listing_type=listing_type, max_pages=3,
                )
                if he_listings:
                    logger.info(f"[valuation] Hepsiemlak (HTTP fallback): {len(he_listings)} ilan")
            finally:
                await fallback.close()
        except Exception as e:
            logger.warning(f"[valuation] Hepsiemlak fallback hatası: {e}")

    if he_listings:
        all_listings.extend(he_listings)

    # === KAYNAK 3: Sahibinden (anti-bot, best effort) ===
    try:
        from scrapers.sahibinden import SahibindenScraper
        scraper3 = SahibindenScraper()
        try:
            sb_listings = await scraper3.scrape_listings(
                city=city, district=district, neighborhood=neighborhood,
                listing_type=listing_type, max_pages=2,
            )
            if sb_listings:
                all_listings.extend(sb_listings)
                logger.info(f"[valuation] Sahibinden: {len(sb_listings)} ilan bulundu")
        finally:
            await scraper3.close()
    except Exception as e:
        logger.debug(f"[valuation] Sahibinden hatası (beklenen): {e}")

    # === Sonuçları birleştir ===
    listings = all_listings
    source_counts = {}
    for l in listings:
        source_counts[l.source] = source_counts.get(l.source, 0) + 1
    logger.info(f"[valuation] Toplam {len(listings)} ilan — kaynaklar: {source_counts}")

    if not listings:
        logger.warning(f"[valuation] Hiçbir kaynaktan ilan bulunamadı: {city}/{district}/{neighborhood}")
        return 0

    try:
        # DB'ye yaz
        for scraped in listings:
            try:
                # Duplicate kontrolü (source + source_id)
                if scraped.source_id:
                    existing = await db.execute(
                        select(Listing).where(
                            and_(
                                Listing.source == scraped.source,
                                Listing.source_id == scraped.source_id,
                            )
                        )
                    )
                    if existing.scalar_one_or_none():
                        continue

                listing = Listing(
                    source=scraped.source,
                    source_id=scraped.source_id,
                    listing_type=scraped.listing_type,
                    property_type=scraped.property_type,
                    city=scraped.city,
                    district=scraped.district,
                    neighborhood=scraped.neighborhood,
                    price=Decimal(str(scraped.price)),
                    currency=scraped.currency,
                    sqm=Decimal(str(scraped.sqm)) if scraped.sqm else None,
                    rooms=scraped.rooms,
                    floor_number=scraped.floor_number,
                    building_age=scraped.building_age,
                    listing_url=scraped.listing_url,
                    is_active=True,
                    raw_data=scraped.raw_data,
                )
                db.add(listing)
                stored_count += 1
            except Exception as e:
                logger.debug(f"[valuation] İlan kayıt hatası: {e}")
                continue

        await db.flush()
        logger.info(f"[valuation] {stored_count} ilan DB'ye yazıldı ({city}/{district}/{neighborhood}, {listing_type})")

    except Exception as e:
        logger.error(f"[valuation] Scraping hatası: {e}", exc_info=True)

    return stored_count


def _turkish_to_ascii(text: str) -> str:
    """Türkçe karakterleri ASCII karşılıklarına çevirir (DB karşılaştırma için)."""
    tr_map = str.maketrans({
        "ç": "c", "Ç": "c", "ğ": "g", "Ğ": "g",
        "ı": "i", "İ": "i", "ö": "o", "Ö": "o",
        "ş": "s", "Ş": "s", "ü": "u", "Ü": "u",
        "â": "a", "Â": "a", "î": "i", "Î": "i",
        "û": "u", "Û": "u",
    })
    return text.translate(tr_map).lower().strip()


async def _get_comps(
    db: AsyncSession,
    city: str,
    district: str,
    neighborhood: str,
    listing_type: str = "sale",
) -> list[Listing]:
    """
    Comparable listing'leri getirir.
    Önce mahalle bazında, yetersizse ilçe geneli.
    Hem Türkçe karakter hem ASCII slug formatını destekler.
    """
    city_lower = _turkish_to_ascii(city)
    district_lower = _turkish_to_ascii(district)
    neighborhood_lower = _turkish_to_ascii(neighborhood)
    # Strip common suffixes for flexible matching
    for suffix in [" mahallesi", " mah", " mah."]:
        if neighborhood_lower.endswith(suffix):
            neighborhood_lower = neighborhood_lower[:-len(suffix)]
            break

    # Translate fonksiyonu — PostgreSQL TRANSLATE ile Türkçe → ASCII
    _pg_tr_from = "çğıöşüÇĞİÖŞÜâÂîÎûÛ"
    _pg_tr_to = "cgiosuCGIOSUaAiIuU"
    
    def _pg_normalize(col):
        """PostgreSQL'de Türkçe karakterleri ASCII'ye çevirir ve lowercase yapar."""
        return func.lower(func.translate(col, _pg_tr_from, _pg_tr_to))

    # 1. Mahalle bazında
    stmt = (
        select(Listing)
        .where(
            and_(
                _pg_normalize(Listing.city) == city_lower,
                _pg_normalize(Listing.district) == district_lower,
                _pg_normalize(Listing.neighborhood).contains(neighborhood_lower),
                Listing.listing_type == listing_type,
                Listing.is_active == True,  # noqa: E712
                Listing.sqm.is_not(None),
                Listing.sqm > 0,
                Listing.price > 0,
            )
        )
        .order_by(Listing.scraped_at.desc())
        .limit(500)
    )
    result = await db.execute(stmt)
    comps = list(result.scalars().all())

    # 2. Yetersizse ilçe geneli
    if len(comps) < 3:
        logger.info(
            f"Mahalle bazında yetersiz ({len(comps)}), ilçe geneline genişletiliyor: {district}"
        )
        stmt = (
            select(Listing)
            .where(
                and_(
                    _pg_normalize(Listing.city) == city_lower,
                    _pg_normalize(Listing.district) == district_lower,
                    Listing.listing_type == listing_type,
                    Listing.is_active == True,  # noqa: E712
                    Listing.sqm.is_not(None),
                    Listing.sqm > 0,
                    Listing.price > 0,
                )
            )
            .order_by(Listing.scraped_at.desc())
            .limit(1000)
        )
        result = await db.execute(stmt)
        comps = list(result.scalars().all())

    return comps


def _generate_mock_data(city: str, district: str, neighborhood: str) -> ValuationResult:
    """
    Scraping başarısız olduğunda fallback mock data üretir.
    Kullanıcıya güzel görünen ama gerçek olmayan tahmini veri.
    """
    import random
    random.seed(hash(f"{city}{district}{neighborhood}") % 2**32)

    base_sqm_price = random.randint(75000, 85000)
    typical_sqm = random.choice([90, 100, 110, 120, 130])
    rent_sqm = int(base_sqm_price * 0.005)

    base_value = base_sqm_price * typical_sqm
    avg_rent = rent_sqm * typical_sqm

    now = datetime.utcnow()
    trend = []
    for i in range(6, 0, -1):
        month = now - timedelta(days=30 * i)
        factor = 1 - (i * 0.015)
        trend.append(TrendPoint(
            month=month.strftime("%Y-%m"),
            avg_price_per_sqm=round(base_sqm_price * factor),
        ))

    return ValuationResult(
        city=city,
        district=district,
        neighborhood=neighborhood,
        avg_price_per_sqm=round(base_sqm_price * 1.05),
        median_price_per_sqm=round(base_sqm_price * 0.9),
        min_price_per_sqm=round(base_sqm_price * 0.7),
        max_price_per_sqm=round(base_sqm_price * 1.4),
        min_price=round(base_value * 0.7),
        max_price=round(base_value * 1.4),
        avg_price=round(base_value * 1.05),
        estimated_value_low=round(base_value * 0.85),
        estimated_value_mid=round(base_value),
        estimated_value_high=round(base_value * 1.15),
        sale_sample_size=0,
        sale_confidence="low",
        sale_yoy_change=None,
        avg_rent_per_sqm=rent_sqm,
        avg_rent=avg_rent,
        min_rent=round(avg_rent * 0.8),
        max_rent=round(avg_rent * 1.3),
        estimated_rent_low=round(avg_rent * 0.85),
        estimated_rent_mid=avg_rent,
        estimated_rent_high=round(avg_rent * 1.15),
        rent_sample_size=0,
        rent_yoy_change=None,
        typical_sqm=typical_sqm,
        avg_rooms="3+1",
        avg_building_age=15,
        gross_rental_yield=round((avg_rent * 12) / base_value * 100, 1),
        amortization_years=round(base_value / (avg_rent * 12)),
        investment_score=5.0,
        investment_label="Orta",
        trend=trend,
        similar_listings=[],
        data_source="tahmini",
        calculated_at=now.isoformat(),
        is_mock=True,
    )


async def calculate_valuation(
    db: AsyncSession,
    city: str,
    district: str,
    neighborhood: str,
) -> ValuationResult:
    """
    Ana değerleme fonksiyonu (v2).

    Akış:
    1. Cache kontrol (24h TTL)
    2. DB'de comp ara
    3. Yoksa gerçek scraping yap
    4. IQR outlier temizleme → medyan m² fiyat → pazarlık düzeltmesi
    5. Genişletilmiş response döndür
    6. Fallback: mock data
    """

    # === 1. Cache kontrol ===
    cache_key = f"valuation:v2:{city}:{district}:{neighborhood}".lower()
    cached = await cache_get(cache_key)
    if cached:
        logger.info(f"Cache hit: {cache_key}")
        # Reconstruct nested objects
        cached["trend"] = [TrendPoint(**t) for t in cached.get("trend", [])]
        cached["similar_listings"] = [SimilarListing(**s) for s in cached.get("similar_listings", [])]
        return ValuationResult(**cached)

    try:
        result = await _do_valuation(db, city, district, neighborhood)
    except Exception as e:
        logger.error(f"[valuation] Hesaplama hatası: {e}", exc_info=True)
        result = None

    if result is None:
        logger.warning(f"[valuation] Gerçek veri bulunamadı, mock data üretiliyor: {city}/{district}/{neighborhood}")
        result = _generate_mock_data(city, district, neighborhood)

    # Cache'e yaz (24 saat)
    cache_data = result.__dict__.copy()
    cache_data["trend"] = [t.__dict__ for t in result.trend]
    cache_data["similar_listings"] = [s.__dict__ for s in result.similar_listings]
    await cache_set(cache_key, cache_data, settings.SCRAPE_CACHE_TTL)

    # DB'ye değerleme kaydı
    await _save_valuation(db, result)

    return result


async def _do_valuation(
    db: AsyncSession,
    city: str,
    district: str,
    neighborhood: str,
) -> ValuationResult | None:
    """Gerçek değerleme hesaplaması."""

    # === 2. SATILIK — DB'de comp ara ===
    sale_comps = await _get_comps(db, city, district, neighborhood, "sale")

    # === 3. Yetersizse gerçek scraping ===
    if len(sale_comps) < 3:
        logger.info(f"[valuation] DB'de yetersiz comp ({len(sale_comps)}), scraping başlatılıyor...")
        stored = await _scrape_and_store(db, city, district, neighborhood, "sale")
        if stored > 0:
            sale_comps = await _get_comps(db, city, district, neighborhood, "sale")

    if len(sale_comps) < 3:
        return None

    # === 4. m² fiyatları + IQR ===
    prices_per_sqm = [
        float(comp.price / comp.sqm) for comp in sale_comps
        if comp.sqm and comp.sqm > 0
    ]
    if not prices_per_sqm:
        return None

    filtered_prices = filter_outliers_iqr(prices_per_sqm)

    median_price = median(filtered_prices)
    avg_price_sqm = mean(filtered_prices)
    min_price_sqm = min(filtered_prices)
    max_price_sqm = max(filtered_prices)

    # Pazarlık düzeltmesi (%10)
    adjusted_median = median_price * settings.BARGAIN_FACTOR
    adjusted_avg = avg_price_sqm * settings.BARGAIN_FACTOR

    # Typical m²
    sqm_values = [float(c.sqm) for c in sale_comps if c.sqm]
    typical_sqm = median(sqm_values) if sqm_values else 100.0

    # Değer aralığı
    base_value = adjusted_median * typical_sqm

    # Gerçek min/max fiyat (toplam)
    total_prices = [float(c.price) for c in sale_comps]
    filtered_total = filter_outliers_iqr(total_prices)

    # Oda sayısı ortalaması
    room_counts = [c.rooms for c in sale_comps if c.rooms]
    avg_rooms = Counter(room_counts).most_common(1)[0][0] if room_counts else None

    # Bina yaşı ortalaması
    ages = [c.building_age for c in sale_comps if c.building_age is not None]
    avg_building_age = round(mean(ages)) if ages else None

    # === KİRALIK ANALİZ ===
    rent_comps = await _get_comps(db, city, district, neighborhood, "rent")

    # Yetersizse scraping
    if len(rent_comps) < 3:
        stored_rent = await _scrape_and_store(db, city, district, neighborhood, "rent")
        if stored_rent > 0:
            rent_comps = await _get_comps(db, city, district, neighborhood, "rent")

    avg_rent_per_sqm = None
    avg_rent = None
    min_rent = None
    max_rent = None
    rent_low = None
    rent_mid = None
    rent_high = None
    rent_sample_size = len(rent_comps)
    rent_yoy_change = None

    if len(rent_comps) >= 3:
        rent_prices_per_sqm = [
            float(comp.price / comp.sqm) for comp in rent_comps
            if comp.sqm and comp.sqm > 0
        ]
        if rent_prices_per_sqm:
            filtered_rent_sqm = filter_outliers_iqr(rent_prices_per_sqm)
            avg_rent_per_sqm = round(median(filtered_rent_sqm), 2)
            rent_mid = round(avg_rent_per_sqm * typical_sqm)
            rent_low = round(rent_mid * 0.85)
            rent_high = round(rent_mid * 1.15)

            rent_totals = [float(c.price) for c in rent_comps]
            filtered_rent_totals = filter_outliers_iqr(rent_totals)
            avg_rent = round(mean(filtered_rent_totals))
            min_rent = round(min(filtered_rent_totals))
            max_rent = round(max(filtered_rent_totals))
    else:
        # Fallback: brüt kira getirisi ile tahmin
        avg_rent_per_sqm = round(adjusted_median * settings.RENT_YIELD_MONTHLY, 2)
        rent_mid = round(base_value * settings.RENT_YIELD_MONTHLY)
        rent_low = round(rent_mid * 0.85)
        rent_high = round(rent_mid * 1.15)
        avg_rent = rent_mid
        min_rent = rent_low
        max_rent = rent_high

    # === YoY DEĞİŞİM ===
    sale_yoy = await _calculate_yoy(db, city, district, neighborhood, adjusted_median, "sale")

    # === BRÜT KİRA GETİRİSİ & AMORTİSMAN ===
    gross_yield = None
    amortization = None
    if avg_rent and base_value > 0:
        annual_rent = avg_rent * 12
        gross_yield = round((annual_rent / base_value) * 100, 1)
        amortization = round(base_value / annual_rent) if annual_rent > 0 else None

    # === YATIRIM SKORU ===
    inv_score, inv_label = _calculate_investment_score(gross_yield, sale_yoy, len(sale_comps))

    # === TREND (son 6 ay) ===
    trend = await _calculate_trend(db, city, district, neighborhood)

    # === BENZER İLANLAR (son 5) ===
    similar = []
    for comp in sale_comps[:5]:
        title = comp.raw_data.get("title", "") if comp.raw_data else ""
        if not title:
            parts = []
            if comp.rooms:
                parts.append(comp.rooms)
            parts.append("Daire")
            if comp.neighborhood:
                parts.append(comp.neighborhood)
            title = " ".join(parts)

        similar.append(SimilarListing(
            title=title,
            price=float(comp.price),
            sqm=float(comp.sqm) if comp.sqm else None,
            rooms=comp.rooms,
            source=comp.source,
            url=comp.listing_url,
        ))

    now = datetime.utcnow()

    return ValuationResult(
        city=city,
        district=district,
        neighborhood=neighborhood,
        avg_price_per_sqm=round(adjusted_avg, 2),
        median_price_per_sqm=round(adjusted_median, 2),
        min_price_per_sqm=round(min_price_sqm * settings.BARGAIN_FACTOR, 2),
        max_price_per_sqm=round(max_price_sqm * settings.BARGAIN_FACTOR, 2),
        min_price=round(min(filtered_total)),
        max_price=round(max(filtered_total)),
        avg_price=round(mean(filtered_total)),
        estimated_value_low=round(base_value * 0.85),
        estimated_value_mid=round(base_value),
        estimated_value_high=round(base_value * 1.15),
        sale_sample_size=len(sale_comps),
        sale_confidence=_confidence_level(len(sale_comps)),
        sale_yoy_change=sale_yoy,
        avg_rent_per_sqm=avg_rent_per_sqm,
        avg_rent=avg_rent,
        min_rent=min_rent,
        max_rent=max_rent,
        estimated_rent_low=rent_low,
        estimated_rent_mid=rent_mid,
        estimated_rent_high=rent_high,
        rent_sample_size=rent_sample_size,
        rent_yoy_change=await _calculate_yoy(db, city, district, neighborhood, avg_rent_per_sqm or 0, "rent"),
        typical_sqm=round(typical_sqm, 1),
        avg_rooms=avg_rooms,
        avg_building_age=avg_building_age,
        gross_rental_yield=gross_yield,
        amortization_years=amortization,
        investment_score=inv_score,
        investment_label=inv_label,
        trend=trend,
        similar_listings=similar,
        data_source=sale_comps[0].source if sale_comps else "emlakjet",
        calculated_at=now.isoformat(),
        is_mock=False,
    )


async def _calculate_trend(
    db: AsyncSession,
    city: str,
    district: str,
    neighborhood: str,
    months: int = 6,
) -> list[TrendPoint]:
    """Son N ay için aylık ortalama m² fiyat trendi."""
    trend = []
    now = datetime.utcnow()

    for i in range(months, 0, -1):
        month_start = (now - timedelta(days=30 * i)).replace(day=1, hour=0, minute=0, second=0)
        if i > 1:
            month_end = (now - timedelta(days=30 * (i - 1))).replace(day=1, hour=0, minute=0, second=0)
        else:
            month_end = now

        stmt = (
            select(func.avg(Listing.price / Listing.sqm))
            .where(
                and_(
                    func.lower(Listing.city) == city.lower(),
                    func.lower(Listing.district) == district.lower(),
                    Listing.listing_type == "sale",
                    Listing.is_active == True,  # noqa: E712
                    Listing.sqm > 0,
                    Listing.price > 0,
                    Listing.scraped_at >= month_start,
                    Listing.scraped_at < month_end,
                )
            )
        )
        result = await db.execute(stmt)
        avg = result.scalar()

        if avg:
            trend.append(TrendPoint(
                month=month_start.strftime("%Y-%m"),
                avg_price_per_sqm=round(float(avg) * settings.BARGAIN_FACTOR),
            ))

    return trend


async def _calculate_yoy(
    db: AsyncSession,
    city: str,
    district: str,
    neighborhood: str,
    current_median: float,
    listing_type: str = "sale",
) -> float | None:
    """Yıllık değer değişimini hesaplar."""
    if not current_median or current_median <= 0:
        return None

    one_year_ago = datetime.utcnow() - timedelta(days=365)

    stmt = (
        select(Valuation)
        .where(
            and_(
                func.lower(Valuation.city) == city.lower(),
                func.lower(Valuation.district) == district.lower(),
                func.lower(Valuation.neighborhood) == neighborhood.lower(),
                Valuation.listing_type == listing_type,
                Valuation.calculated_at <= one_year_ago,
            )
        )
        .order_by(Valuation.calculated_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    old_valuation = result.scalar_one_or_none()

    if old_valuation and old_valuation.median_price_per_sqm:
        old_median = float(old_valuation.median_price_per_sqm)
        if old_median > 0:
            change = ((current_median - old_median) / old_median) * 100
            return round(change, 2)

    return None


async def _save_valuation(db: AsyncSession, result: ValuationResult) -> None:
    """Değerleme sonucunu DB'ye kaydeder."""
    try:
        valuation = Valuation(
            city=result.city,
            district=result.district,
            neighborhood=result.neighborhood,
            avg_price_per_sqm=Decimal(str(result.avg_price_per_sqm)),
            median_price_per_sqm=Decimal(str(result.median_price_per_sqm)),
            min_price_per_sqm=Decimal(str(result.min_price_per_sqm)),
            max_price_per_sqm=Decimal(str(result.max_price_per_sqm)),
            avg_rent_per_sqm=Decimal(str(result.avg_rent_per_sqm)) if result.avg_rent_per_sqm else None,
            sample_size=result.sale_sample_size,
            yoy_change=Decimal(str(result.sale_yoy_change)) if result.sale_yoy_change else None,
            listing_type=result.listing_type,
        )
        db.add(valuation)
        await db.flush()
    except Exception as e:
        logger.error(f"Değerleme kaydetme hatası: {e}")
