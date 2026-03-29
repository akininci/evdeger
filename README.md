# 🏠 EvDeğer — Türkiye Emlak Değerleme Platformu

**Yapay zeka destekli, gerçek zamanlı Türkiye emlak değerleme ve analiz platformu.**

*AI-powered real estate valuation and analysis platform for Turkey.*

---

## 🇹🇷 Türkçe

### Nedir?

EvDeğer, Türkiye'deki gayrimenkullerin güncel piyasa değerini yapay zeka ile analiz eden açık kaynak bir platformdur. Sahibinden, Hepsiemlak gibi kaynaklardan veri toplayarak bölgesel fiyat trendleri, karşılaştırmalı analizler ve değerleme raporları sunar.

### ✨ Özellikler

- 🔍 **Akıllı Değerleme** — Adres veya konum bazlı anlık emlak değeri tahmini
- 📊 **Piyasa Analizi** — Bölgesel fiyat trendleri ve karşılaştırmalar
- 🗺️ **Harita Görünümü** — İnteraktif harita üzerinde fiyat ısı haritası
- 📈 **Trend Takibi** — Zaman bazlı fiyat değişim grafikleri
- 🤖 **AI Destekli** — Makine öğrenimi ile doğru değerleme

### 🛠️ Tech Stack

| Katman | Teknoloji |
|--------|-----------|
| **Frontend** | Next.js 14, React, TailwindCSS, TypeScript |
| **Backend** | FastAPI, Python 3.12, SQLAlchemy |
| **Veritabanı** | PostgreSQL 16, Redis 7 |
| **AI/ML** | scikit-learn, pandas, numpy |
| **Altyapı** | Docker, Caddy, Hetzner Cloud |
| **CI/CD** | GitHub Actions |

### 🚀 Kurulum

#### Gereksinimler
- Docker & Docker Compose
- Node.js 20+ (geliştirme için)
- Python 3.12+ (geliştirme için)

#### Docker ile Çalıştırma

```bash
# Repoyu klonla
git clone https://github.com/akininci/evdeger.git
cd evdeger

# Environment dosyasını oluştur
cp .env.example .env

# Docker ile başlat
cd docker
docker compose up -d
```

Uygulama:
- 🌐 Frontend: http://localhost:3001
- ⚡ API: http://localhost:8001
- 📖 API Docs: http://localhost:8001/docs

#### Lokal Geliştirme

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```

### 📸 Ekran Görüntüleri

> *Yakında eklenecek...*

---

## 🇬🇧 English

### What is EvDeğer?

EvDeğer is an open-source AI-powered real estate valuation platform for Turkey. It collects data from major Turkish real estate platforms (Sahibinden, Hepsiemlak) to provide regional price trends, comparative analyses, and valuation reports.

### Features

- 🔍 **Smart Valuation** — Instant property value estimation by address or location
- 📊 **Market Analysis** — Regional price trends and comparisons
- 🗺️ **Map View** — Interactive price heatmap
- 📈 **Trend Tracking** — Time-based price change charts
- 🤖 **AI-Powered** — Machine learning for accurate valuations

### Quick Start

```bash
git clone https://github.com/akininci/evdeger.git
cd evdeger
cp .env.example .env
cd docker && docker compose up -d
```

---

## 📄 Lisans / License

MIT License — see [LICENSE](LICENSE) for details.

## 🤝 Katkıda Bulunun / Contributing

Pull request'ler ve issue'lar memnuniyetle karşılanır!

---

*Made with ❤️ in İzmir, Turkey*
