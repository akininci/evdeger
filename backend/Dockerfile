FROM python:3.12-slim

WORKDIR /app

# System dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    cron \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Playwright + Chromium (Hepsiemlak Cloudflare bypass)
RUN pip install playwright \
    && playwright install chromium \
    && playwright install-deps

# App
COPY . .

# Log directory
RUN mkdir -p /var/log/evdeger

# Cron job: günlük scraping (saat 04:00 UTC)
RUN echo "0 4 * * * cd /app && python scripts/daily_scrape.py >> /var/log/evdeger/daily_scrape.log 2>&1" > /etc/cron.d/evdeger-scrape \
    && chmod 0644 /etc/cron.d/evdeger-scrape \
    && crontab /etc/cron.d/evdeger-scrape

# Start cron in background + uvicorn
CMD cron && uvicorn app.main:app --host 0.0.0.0 --port 8000
