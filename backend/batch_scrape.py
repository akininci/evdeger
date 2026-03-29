import asyncio
import logging
import sys

logging.basicConfig(level=logging.INFO, format="%(message)s")

sys.path.insert(0, "/app")

from scrapers.emlakjet import EmlakjetScraper

async def scrape_batch():
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

    scraper = EmlakjetScraper()
    total = 0
    results = {}

    for city, district in targets:
        try:
            listings = await scraper.scrape_listings(
                city=city, district=district, neighborhood="",
                listing_type="sale", max_pages=2
            )
            count = len(listings)
            total += count
            results[f"{city}/{district}"] = count

            if listings:
                prices = [l.price for l in listings if l.price > 0]
                min_p = min(prices) if prices else 0
                max_p = max(prices) if prices else 0
                avg_p = sum(prices) / len(prices) if prices else 0

                print(f"OK {city}/{district}: {count} ilan")
                print(f"   Fiyat: {min_p:,.0f} - {max_p:,.0f} TL (ort: {avg_p:,.0f} TL)")

                for l in listings[:3]:
                    sqm_str = f"{l.sqm:.0f}m2" if l.sqm else "?m2"
                    rooms_str = l.rooms or "?"
                    print(f"   {l.price:,.0f} TL | {sqm_str} | {rooms_str}")
            else:
                print(f"WARN {city}/{district}: 0 ilan")

        except Exception as e:
            print(f"ERR {city}/{district}: HATA - {e}")
            results[f"{city}/{district}"] = 0

    await scraper.close()

    sep = "=" * 50
    print(f"\n{sep}")
    print(f"TOPLAM: {total} ilan (10 bolgeden)")
    ok = sum(1 for v in results.values() if v > 0)
    fail = sum(1 for v in results.values() if v == 0)
    print(f"Basarili: {ok}/10")
    print(f"Basarisiz: {fail}/10")

asyncio.run(scrape_batch())
