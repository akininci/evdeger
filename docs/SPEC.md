# EvDeğer — Türkiye Emlak Değerleme Platformu

## Vizyon
Türkiye'deki herkes, adresini girerek evinin ortalama satış ve kira değerini ücretsiz öğrenebilsin.
Hedef: 1M kullanıcı → Realtor şirketlere (Remax, Century21, vb.) satış.

## MVP Özellikleri (Phase 1)
1. **Adres Girişi:** Kullanıcı il, ilçe, mahalle seçer (autocomplete)
2. **Tahmini Değer Gösterimi:**
   - Ortalama satılık m² fiyatı
   - Tahmini daire değeri (m² bazlı aralık)
   - Ortalama kira değeri
   - Bölge trend (yıllık artış %)
3. **Sign-up:** Email ile kayıt (detaylı rapor almak için)
4. **Responsive:** Mobile-first tasarım

## Veri Kaynakları

### 1. Sahibinden.com (Ana kaynak)
- İlan verisi: Fiyat, m², oda sayısı, kat, bina yaşı, mahalle
- Scraping: BeautifulSoup4 / Playwright (anti-bot bypass)
- Hem satılık hem kiralık ilanlar

### 2. Hepsiemlak.com
- Benzer ilan verisi, daha kolay scraping
- BeautifulSoup4 ile çekilebilir

### 3. Emlakjet.com
- Ek veri kaynağı, çapraz doğrulama

### 4. Endeksa.com
- Bölge bazlı m² fiyat endeksi
- Yıllık artış oranları

### 5. TCMB (Merkez Bankası)
- Konut Fiyat Endeksi (RPPI) — il bazlı resmi veri
- URL: https://evds2.tcmb.gov.tr/ (EVDS API — ücretsiz)

### 6. TÜİK
- Yapı izin istatistikleri, nüfus verileri

## Değerleme Algoritması

### Step 1: Adres Parse
```
Input: "İzmir, Karabağlar, Esenyalı Mahallesi"
→ city: İzmir, district: Karabağlar, neighborhood: Esenyalı
```

### Step 2: Comparable Listings (Comps)
- Aynı mahallede aktif satılık/kiralık ilanları çek
- Filtrele: Daire tipinde, son 90 gün içinde yayınlanmış
- En az 10 comp gerekli (yoksa ilçe geneline genişlet)

### Step 3: M² Fiyat Hesaplama
```python
prices_per_sqm = [listing.price / listing.sqm for listing in comps]
# Outlier temizleme (IQR metodu)
q1, q3 = percentile(prices_per_sqm, [25, 75])
iqr = q3 - q1
filtered = [p for p in prices_per_sqm if q1 - 1.5*iqr <= p <= q3 + 1.5*iqr]
avg_price_per_sqm = median(filtered)
```

### Step 4: İlan Fiyatı → Gerçek Değer Düzeltmesi
- İlan fiyatları genelde %5-15 pazarlık payı içerir
- Düzeltme faktörü: 0.90 (ortalama %10 indirim)

### Step 5: Değer Aralığı
```
base_value = avg_price_per_sqm * typical_sqm_for_neighborhood
low_estimate = base_value * 0.85
high_estimate = base_value * 1.15
```

### Step 6: Kira Tahmini
- Brüt kira getirisi: Türkiye ortalaması %5-7 yıllık
- Aylık kira ≈ satış_değeri * 0.005 (aylık %0.5)
- VEYA: Kiralık ilanlardan doğrudan hesapla

## Tech Stack

### Frontend
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Türkçe UI (i18n hazır — ileride İngilizce)
- Mobile-first responsive

### Backend
- Python FastAPI
- PostgreSQL (veri depolama)
- Redis (cache — scrape sonuçları 24h cache)
- Celery + Redis (arka plan scraping job'ları)

### Deployment
- Docker Compose (Hetzner — mevcut server)
- Caddy reverse proxy (evdeger.durinx.com)
- GitHub + CI/CD

## Veritabanı Schema

### listings (İlan verileri)
```sql
CREATE TABLE listings (
    id SERIAL PRIMARY KEY,
    source VARCHAR(50) NOT NULL, -- sahibinden, hepsiemlak, emlakjet
    source_id VARCHAR(100),
    listing_type VARCHAR(20) NOT NULL, -- sale, rent
    property_type VARCHAR(50) DEFAULT 'apartment',
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    neighborhood VARCHAR(200) NOT NULL,
    price DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'TRY',
    sqm DECIMAL(8,2),
    rooms VARCHAR(20), -- 2+1, 3+1, etc.
    floor_number INTEGER,
    total_floors INTEGER,
    building_age INTEGER,
    has_elevator BOOLEAN,
    has_parking BOOLEAN,
    heating_type VARCHAR(50),
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    listing_url TEXT,
    scraped_at TIMESTAMP DEFAULT NOW(),
    listed_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    raw_data JSONB
);

CREATE INDEX idx_listings_location ON listings(city, district, neighborhood);
CREATE INDEX idx_listings_type ON listings(listing_type, property_type);
CREATE INDEX idx_listings_price ON listings(price);
```

### valuations (Değerleme sonuçları)
```sql
CREATE TABLE valuations (
    id SERIAL PRIMARY KEY,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    neighborhood VARCHAR(200) NOT NULL,
    avg_price_per_sqm DECIMAL(10,2),
    median_price_per_sqm DECIMAL(10,2),
    min_price_per_sqm DECIMAL(10,2),
    max_price_per_sqm DECIMAL(10,2),
    avg_rent_per_sqm DECIMAL(10,2),
    sample_size INTEGER,
    yoy_change DECIMAL(5,2), -- year-over-year % change
    calculated_at TIMESTAMP DEFAULT NOW(),
    listing_type VARCHAR(20) NOT NULL -- sale, rent
);

CREATE INDEX idx_valuations_location ON valuations(city, district, neighborhood);
```

### users (Kullanıcılar)
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(200),
    created_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    search_count INTEGER DEFAULT 0
);
```

### searches (Arama geçmişi)
```sql
CREATE TABLE searches (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    city VARCHAR(100),
    district VARCHAR(100),
    neighborhood VARCHAR(200),
    result_avg_price DECIMAL(15,2),
    result_avg_rent DECIMAL(15,2),
    searched_at TIMESTAMP DEFAULT NOW(),
    ip_address VARCHAR(45)
);
```

## API Endpoints

### Public
- `GET /api/valuation?city=&district=&neighborhood=` — Ana değerleme
- `GET /api/locations/cities` — Şehir listesi
- `GET /api/locations/districts?city=` — İlçe listesi
- `GET /api/locations/neighborhoods?city=&district=` — Mahalle listesi
- `GET /api/trends?city=&district=` — Bölge trendleri

### Auth Required
- `POST /api/auth/register` — Email kayıt
- `POST /api/auth/login` — Giriş
- `GET /api/report/detailed?city=&district=&neighborhood=` — Detaylı rapor

## UI Akışı

### Ana Sayfa
```
[EvDeğer Logo]
"Evinin değerini ücretsiz öğren"

[  İl seçin  ▼] [  İlçe seçin  ▼] [  Mahalle seçin  ▼]

        [ 🔍 Değerini Öğren ]

--- Güven göstergeleri ---
"100,000+ değerleme yapıldı" | "81 il" | "Ücretsiz"
```

### Sonuç Sayfası
```
📍 Karabağlar, Esenyalı — İzmir

Tahmini Satış Değeri (100m² daire)
━━━━━━━━━━━━━━━━━━━━━━
₺4,800,000 — ₺6,200,000
   Ortalama: ₺5,500,000

Tahmini Kira Değeri
━━━━━━━━━━━━━━━━━━━━━━
₺18,000 — ₺25,000 / ay
   Ortalama: ₺21,500

📊 Bölge İstatistikleri
• Ortalama m² fiyatı: ₺36,523
• Yıllık değer artışı: +28.79%
• Aktif ilan sayısı: 156
• Ortalama daire büyüklüğü: 120 m²

[📧 Detaylı rapor almak için kayıt ol]
```

## Dosya Yapısı
```
evdeger/
├── frontend/          # Next.js 15
│   ├── app/
│   │   ├── page.tsx           # Ana sayfa (adres girişi)
│   │   ├── sonuc/page.tsx     # Sonuç sayfası
│   │   ├── kayit/page.tsx     # Kayıt sayfası
│   │   ├── api/               # API routes (proxy)
│   │   └── layout.tsx
│   ├── components/
│   │   ├── AddressForm.tsx
│   │   ├── ValuationResult.tsx
│   │   ├── TrendChart.tsx
│   │   └── Header.tsx
│   ├── package.json
│   └── Dockerfile
├── backend/           # Python FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── models.py
│   │   ├── database.py
│   │   ├── routers/
│   │   │   ├── valuation.py
│   │   │   ├── locations.py
│   │   │   └── auth.py
│   │   └── services/
│   │       ├── valuation_engine.py
│   │       └── cache.py
│   ├── scrapers/
│   │   ├── base.py
│   │   ├── hepsiemlak.py
│   │   ├── sahibinden.py
│   │   └── endeksa.py
│   ├── requirements.txt
│   └── Dockerfile
├── docker/
│   └── docker-compose.yml
├── docs/
│   └── SPEC.md
└── README.md
```
