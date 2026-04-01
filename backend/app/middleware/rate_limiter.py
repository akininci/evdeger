"""EvDeger - Redis-based Rate Limiting Middleware."""

import time
import logging
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.services.cache import get_redis

logger = logging.getLogger(__name__)

ENDPOINT_LIMITS = {
    "/api/valuation": 30,
    "/api/auth/login": 10,
    "/api/auth/register": 5,
    "/api/subscribe": 10,
}
DEFAULT_LIMIT = 60


def _get_limit(path: str) -> int:
    for prefix, limit in ENDPOINT_LIMITS.items():
        if path.startswith(prefix):
            return limit
    return DEFAULT_LIMIT


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path
        if path in ("/docs", "/redoc", "/openapi.json", "/", "/health", "/api/health"):
            return await call_next(request)

        client_ip = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        if not client_ip:
            client_ip = request.client.host if request.client else "unknown"

        limit = _get_limit(path)
        window = 60

        try:
            r = await get_redis()
            now = time.time()
            key = f"evdeger:ratelimit:{client_ip}:{path.split('/')[2] if len(path.split('/')) > 2 else 'root'}"

            pipe = r.pipeline()
            pipe.zremrangebyscore(key, 0, now - window)
            pipe.zadd(key, {str(now): now})
            pipe.zcard(key)
            pipe.expire(key, window + 10)
            results = await pipe.execute()

            count = results[2]
            remaining = max(0, limit - count)

            if count > limit:
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Cok fazla istek. Lutfen biraz bekleyin."},
                    headers={"Retry-After": str(window), "X-RateLimit-Limit": str(limit)},
                )

            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(limit)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            return response

        except Exception as e:
            logger.warning(f"Rate limiter error: {e}")
            return await call_next(request)
