# EvDeğer Backend

Türkiye Emlak Değerleme Platformu — Python FastAPI Backend

## 🚀 Hızlı Başlangıç

### Gereksinimler
- Python 3.12+
- PostgreSQL 14+
- Redis 7+

### Kurulum

```bash
# 1. Virtual environment oluştur
python3.12 -m venv venv
source venv/bin/activate  # Linux/Mac
# veya
.\venv\Scripts\activate  # Windows

# 2. Bağımlılıkları yükle
pip install -r requirements.txt

# 3. Environment dosyasını oluştur
cp .env.example .env
# .env dosyasını düzenle (DATABASE_URL, REDIS_URL, SECRET_KEY)

# 4. PostgreSQL veritabanı oluştur
createdb evdeger
# veya psql ile:
# CREATE DATABASE evdeger;

# 5. Uygulamayı başlat
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

API artık http://localhost:8000 adresinde çalışıyor.

**Interaktif Dokümantasyon:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## 📂 Proje Yapısı

```
backend/
├── app/
│   ├── main.py              # FastAPI app, lifespan, CORS
│   ├── config.py            # Environment konfigürasyonu
│   ├── database.py          # Async PostgreSQL bağlantısı
│   ├── models.py            # SQLAlchemy modelleri
│   ├── routers/
│   │   ├── valuation.py     # Değerleme endpoint'leri
│   │   ├── locations.py     # Lokasyon listeleri (il/ilçe/mahalle)
│   │   └── auth.py          # Kullanıcı kaydı ve giriş
│   └── services/
│       ├── valuation_engine.py  # Değerleme algoritması
│       └── cache.py             # Redis cache wrapper
├── scrapers/
│   ├── base.py              # BaseScraper (ortak HTTP logic)
│   ├── hepsiemlak.py        # Hepsiemlak scraper
│   ├── sahibinden.py        # Sahibinden scraper (anti-bot placeholder)
│   └── endeksa.py           # Endeksa bölge verisi scraper
├── data/
│   └── locations.json       # Türkiye lokasyon verisi (81 il)
├── scripts/
│   ├── seed_locations.py    # Lokasyon verisini doğrula
│   └── initial_scrape.py    # İlk scraping batch'i
├── requirements.txt
├── Dockerfile
└── README.md
```

---

## 🔥 API Endpoint'leri

### Değerleme
```http
GET /api/valuation?city=İzmir&district=Karabağlar&neighborhood=Esenyalı
```

**Yanıt:**
```json
{
  "city": "İzmir",
  "district": "Karabağlar",
  "neighborhood": "Esenyalı",
  "avg_price_per_sqm": 36523.45,
  "median_price_per_sqm": 35800.0,
  "min_price_per_sqm": 28000.0,
  "max_price_per_sqm": 52000.0,
  "estimated_value_low": 4250000.0,
  "estimated_value_mid": 5000000.0,
  "estimated_value_high": 5750000.0,
  "avg_rent_per_sqm": 182.5,
  "estimated_rent_low": 18000.0,
  "estimated_rent_mid": 21500.0,
  "estimated_rent_high": 25000.0,
  "sample_size": 156,
  "typical_sqm": 120.0,
  "yoy_change": 28.79,
  "currency": "TRY"
}
```

### Lokasyonlar
```http
GET /api/locations/cities
GET /api/locations/districts?city=İzmir
GET /api/locations/neighborhoods?city=İzmir&district=Karabağlar
```

### Kimlik Doğrulama
```http
POST /api/auth/register
POST /api/auth/login
```

**Kayıt isteği:**
```json
{
  "email": "user@example.com",
  "password": "secure123",
  "name": "Ahmet Yılmaz"
}
```

---

## 🧮 Değerleme Algoritması

Spec'te belirtilen algoritma birebir uygulanmıştır:

### 1. Comparable Listings (Comps)
- Aynı mahallede son 90 gün içinde yayınlanmış aktif ilanlar
- Minimum 10 comp gerekli
- Yetersizse ilçe geneline genişletir

### 2. M² Fiyat Hesaplama
```python
prices_per_sqm = [listing.price / listing.sqm for listing in comps]
```

### 3. IQR Outlier Temizleme
```python
q1 = percentile(prices, 25)
q3 = percentile(prices, 75)
iqr = q3 - q1
filtered = [p for p in prices if q1 - 1.5*iqr <= p <= q3 + 1.5*iqr]
```

### 4. Medyan Fiyat
```python
median_price = median(filtered)
```

### 5. Pazarlık Düzeltmesi (%10)
```python
adjusted = median_price * 0.90
```

### 6. Değer Aralığı (±%15)
```python
base_value = adjusted * typical_sqm
low = base_value * 0.85
high = base_value * 1.15
```

### 7. Kira Tahmini
- Kiralık ilanlardan doğrudan hesapla VEYA
- Brüt kira getirisi: aylık %0.5

---

## 📊 Veritabanı Şeması

### `listings` — İlan verileri
```sql
id, source (sahibinden/hepsiemlak), source_id, listing_type (sale/rent),
property_type, city, district, neighborhood, price, currency, sqm, rooms,
floor_number, total_floors, building_age, has_elevator, has_parking,
heating_type, latitude, longitude, listing_url, scraped_at, listed_at,
is_active, raw_data (JSONB)
```

### `valuations` — Değerleme sonuçları
```sql
id, city, district, neighborhood, avg_price_per_sqm, median_price_per_sqm,
min_price_per_sqm, max_price_per_sqm, avg_rent_per_sqm, sample_size,
yoy_change, calculated_at, listing_type
```

### `users` — Kullanıcılar
```sql
id, email, hashed_password, name, created_at, last_login, search_count, is_active
```

### `searches` — Arama geçmişi
```sql
id, user_id, city, district, neighborhood, result_avg_price, result_avg_rent,
searched_at, ip_address
```

---

## 🕷️ Scraping

### İlk Veri Yükleme
```bash
# Öncelikli mahalleleri scrape et (İstanbul, İzmir, Ankara)
python scripts/initial_scrape.py
```

13 lokasyon için satılık + kiralık ilanları çeker (~500-1000 ilan).

### Scraper'lar

#### 1. **Hepsiemlak** (`scrapers/hepsiemlak.py`)
- ✅ Çalışıyor
- BeautifulSoup4 + requests
- Rate limiting: 2-4 saniye
- Hem HTML parse hem JSON-LD desteği

#### 2. **Sahibinden** (`scrapers/sahibinden.py`)
- ⚠️ Placeholder
- Güçlü anti-bot koruması var
- TODO: Playwright ile headless browser

#### 3. **Endeksa** (`scrapers/endeksa.py`)
- ✅ Çalışıyor (bölge verileri)
- m² fiyat endeksi, YoY değişim

### Scraper Kullanımı
```python
from scrapers.hepsiemlak import HepsiemlakScraper

scraper = HepsiemlakScraper()
listings = await scraper.scrape_listings(
    city="İzmir",
    district="Karabağlar",
    neighborhood="Esenyalı",
    listing_type="sale",
    max_pages=5,
)
await scraper.close()
```

---

## 🔐 Güvenlik

- Şifreler bcrypt ile hash'lenir
- JWT token ile auth (7 gün geçerlilik)
- CORS ayarları (production'da whitelist)
- SQL injection koruması (SQLAlchemy ORM)
- Rate limiting (TODO: Celery + Redis)

---

## 🐳 Docker Deployment

```bash
# Build
docker build -t evdeger-backend .

# Run
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql+asyncpg://user:pass@host/evdeger \
  -e REDIS_URL=redis://host:6379/0 \
  -e SECRET_KEY=your-secret-key \
  evdeger-backend
```

---

## 📝 Environment Variables

| Değişken | Açıklama | Default |
|----------|----------|---------|
| `DATABASE_URL` | PostgreSQL async bağlantı URL'i | `postgresql+asyncpg://evdeger:evdeger@localhost:5432/evdeger` |
| `REDIS_URL` | Redis bağlantı URL'i | `redis://localhost:6379/0` |
| `SECRET_KEY` | JWT token secret key (min 32 char) | `change-me-in-production...` |
| `DEBUG` | Debug modu (true/false) | `false` |

---

## 🧪 Test

```bash
# Health check
curl http://localhost:8000/health

# Değerleme test
curl "http://localhost:8000/api/valuation?city=İzmir&district=Karabağlar&neighborhood=Esenyalı"

# Şehir listesi
curl http://localhost:8000/api/locations/cities
```

---

## 🔧 Geliştirme Notları

### TODO
- [ ] Celery beat ile periyodik scraping (günlük)
- [ ] Sahibinden için Playwright entegrasyonu
- [ ] Rate limiting middleware
- [ ] Admin panel (Django admin benzeri)
- [ ] Elasticsearch ile mahalle arama
- [ ] TCMB Konut Fiyat Endeksi entegrasyonu
- [ ] Email bildirimleri (yeni değerleme)
- [ ] Grafik verisi (trend chart için)

### Bilinen Sorunlar
- Sahibinden anti-bot koruması nedeniyle scraping çalışmıyor → Playwright gerekli
- Bazı mahalleler için yetersiz ilan verisi → İlçe geneline genişletme yapılıyor

---

## 📚 Kaynaklar

- FastAPI docs: https://fastapi.tiangolo.com
- SQLAlchemy async: https://docs.sqlalchemy.org/en/20/orm/extensions/asyncio.html
- BeautifulSoup4: https://www.crummy.com/software/BeautifulSoup/
- Redis Python: https://redis-py.readthedocs.io

---

## 📄 Lisans

MIT License — Ticari kullanım için frontend + backend birlikte satış planlanıyor.
