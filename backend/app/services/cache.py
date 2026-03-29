"""
EvDeğer — Redis Cache Wrapper
Scraping sonuçları ve değerleme cache'i.
"""

import json
import logging
from typing import Any

import redis.asyncio as redis

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_redis_client: redis.Redis | None = None


async def get_redis() -> redis.Redis:
    """Redis bağlantısı döndürür (singleton)."""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


async def cache_get(key: str) -> Any | None:
    """Cache'ten veri okur. Yoksa None döner."""
    try:
        r = await get_redis()
        data = await r.get(key)
        if data:
            return json.loads(data)
        return None
    except Exception as e:
        logger.warning(f"Redis GET hatası (key={key}): {e}")
        return None


async def cache_set(key: str, value: Any, ttl: int | None = None) -> bool:
    """Cache'e veri yazar. ttl saniye cinsinden."""
    try:
        r = await get_redis()
        serialized = json.dumps(value, ensure_ascii=False, default=str)
        if ttl:
            await r.setex(key, ttl, serialized)
        else:
            await r.set(key, serialized)
        return True
    except Exception as e:
        logger.warning(f"Redis SET hatası (key={key}): {e}")
        return False


async def cache_delete(key: str) -> bool:
    """Cache'ten veri siler."""
    try:
        r = await get_redis()
        await r.delete(key)
        return True
    except Exception as e:
        logger.warning(f"Redis DELETE hatası (key={key}): {e}")
        return False


async def cache_flush_pattern(pattern: str) -> int:
    """Pattern'e uyan tüm key'leri siler. Silinen key sayısını döner."""
    try:
        r = await get_redis()
        count = 0
        async for key in r.scan_iter(match=pattern):
            await r.delete(key)
            count += 1
        return count
    except Exception as e:
        logger.warning(f"Redis FLUSH hatası (pattern={pattern}): {e}")
        return 0


async def close_redis():
    """Redis bağlantısını kapatır."""
    global _redis_client
    if _redis_client:
        await _redis_client.close()
        _redis_client = None
