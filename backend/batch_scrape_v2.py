"""
EvDeger — Emlakjet RSC Batch Scraper
RSC payload'undan listing verisi cikarir.
"""
import asyncio
import json
import logging
import random
import re
import sys

import httpx

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger()

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
]

TR_TO_ASCII = str.maketrans({
    "c": "c", "g": "g", "i": "i", "o": "o", "s": "s", "u": "u",
    "C": "c", "G": "g", "I": "i", "O": "o", "S": "s", "U": "u",
    # Turkish specific chars
    "\u00e7": "c", "\u011f": "g", "\u0131": "i", "\u00f6": "o", "\u015f": "s", "\u00fc": "u",
    "\u00c7": "c", "\u011e": "g", "\u0130": "i", "\u00d6": "o", "\u015e": "s", "\u00dc": "u",
})


def slugify(text):
    result = text.lower().strip().translate(TR_TO_ASCII)
    result = re.sub(r"\s+", "-", result)
    result = re.sub(r"[^a-z0-9-]", "", result)
    result = re.sub(r"-+", "-", result)
    return result.strip("-")


def extract_listings_from_rsc(html):
    """Extract listing records from RSC payload in HTML."""
    # Decode RSC chunks
    rsc_chunks = re.findall(r'self\.__next_f\.push\(\[1,\s*"(.*?)"\]\)', html)
    full_rsc = ""
    for chunk in rsc_chunks:
        decoded = chunk.replace('\\"', '"').replace('\\n', '\n').replace('\\\\', '\\')
        full_rsc += decoded

    # Find the listingCard records array
    match = re.search(r'"listingCard"\s*:\s*\{[^}]*"records"\s*:\s*\[', full_rsc)
    if not match:
        return []

    # Extract the records array
    start = match.end() - 1  # Start at [
    depth = 0
    end = start
    for i in range(start, min(start + 500000, len(full_rsc))):
        if full_rsc[i] == '[':
            depth += 1
        elif full_rsc[i] == ']':
            depth -= 1
            if depth == 0:
                end = i + 1
                break

    try:
        records_json = full_rsc[start:end]
        records = json.loads(records_json)
        return records
    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
        return []


def parse_listing(record, city, district):
    """Parse a single listing record into structured data."""
    price_detail = record.get("priceDetail", {})
    price = price_detail.get("price", 0) or price_detail.get("tlPrice", 0)
    if not price or price <= 0:
        return None

    location = record.get("location", {})
    neighborhood = ""
    town = location.get("town", {})
    locality = location.get("locality", {})
    if town:
        neighborhood = town.get("name", "")
    elif locality:
        neighborhood = locality.get("name", "")

    sqm = record.get("squareMeter")
    rooms = record.get("roomCountName", "")
    floor_name = record.get("floorName", "")
    
    quick_infos = record.get("quickInfos", [])
    for qi in quick_infos:
        key = qi.get("key", "")
        val = qi.get("value", "")
        if key == "room_count" and not rooms:
            rooms = val
        elif key == "floor_number" and not floor_name:
            floor_name = val

    return {
        "source": "emlakjet",
        "source_id": str(record.get("id", "")),
        "listing_type": "sale",
        "city": city,
        "district": district,
        "neighborhood": neighborhood,
        "price": price,
        "currency": price_detail.get("currency", "TRY"),
        "sqm": sqm,
        "rooms": rooms,
        "floor": floor_name,
        "title": record.get("title", ""),
        "url": f"https://www.emlakjet.com{record.get('url', '')}",
        "created_at": record.get("createdAt", ""),
    }


async def scrape_district(client, city, district, max_pages=2):
    """Scrape listings for a city/district."""
    city_slug = slugify(city)
    district_slug = slugify(district)
    all_listings = []

    for page in range(1, max_pages + 1):
        url = f"https://www.emlakjet.com/satilik-daire/{city_slug}-{district_slug}/"
        if page > 1:
            url += f"{page}/"

        delay = random.uniform(2.0, 4.0)
        await asyncio.sleep(delay)

        headers = {
            "User-Agent": random.choice(USER_AGENTS),
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
            "Referer": "https://www.google.com.tr/",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
        }

        try:
            resp = await client.get(url, headers=headers, follow_redirects=True)
            if resp.status_code != 200:
                logger.warning(f"  HTTP {resp.status_code}: {url}")
                break

            records = extract_listings_from_rsc(resp.text)
            if not records:
                break

            for rec in records:
                listing = parse_listing(rec, city, district)
                if listing:
                    all_listings.append(listing)

            logger.info(f"  Sayfa {page}: {len(records)} ilan")

        except Exception as e:
            logger.error(f"  Hata: {e}")
            break

    return all_listings


async def main():
    targets = [
        ("istanbul", "kadikoy"),
        ("istanbul", "besiktas"),
        ("istanbul", "sisli"),
        ("istanbul", "esenyurt"),
        ("ankara", "cankaya"),
        ("ankara", "kecioren"),
        ("izmir", "konak"),
        ("izmir", "karsiyaka"),
        ("antalya", "muratpasa"),
        ("bursa", "nilufer"),
    ]

    client = httpx.AsyncClient(timeout=httpx.Timeout(30.0))
    grand_total = 0
    all_results = {}

    for city, district in targets:
        logger.info(f"\n>>> {city}/{district}")
        listings = await scrape_district(client, city, district, max_pages=2)
        count = len(listings)
        grand_total += count
        all_results[f"{city}/{district}"] = listings

        if listings:
            prices = [l["price"] for l in listings]
            min_p = min(prices)
            max_p = max(prices)
            avg_p = sum(prices) / len(prices)
            print(f"OK {city}/{district}: {count} ilan")
            print(f"   Fiyat araligi: {min_p:,.0f} - {max_p:,.0f} TL (ort: {avg_p:,.0f} TL)")
            for l in listings[:3]:
                sqm_s = f"{l['sqm']}m2" if l['sqm'] else "?m2"
                print(f"   {l['price']:,.0f} TL | {sqm_s} | {l['rooms']} | {l['neighborhood']}")
        else:
            print(f"WARN {city}/{district}: 0 ilan")

    await client.aclose()

    sep = "=" * 60
    print(f"\n{sep}")
    print(f"TOPLAM: {grand_total} ilan (10 bolgeden)")
    ok = sum(1 for v in all_results.values() if len(v) > 0)
    fail = sum(1 for v in all_results.values() if len(v) == 0)
    print(f"Basarili: {ok}/10")
    print(f"Basarisiz: {fail}/10")

    # Save results to JSON
    output = {
        "source": "emlakjet",
        "total_listings": grand_total,
        "districts": {}
    }
    for key, listings in all_results.items():
        output["districts"][key] = {
            "count": len(listings),
            "listings": listings
        }

    with open("/app/data/emlakjet_batch.json", "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    print(f"\nSonuclar /app/data/emlakjet_batch.json dosyasina kaydedildi.")

asyncio.run(main())
