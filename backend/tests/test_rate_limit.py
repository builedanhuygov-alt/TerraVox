"""Rate limiter — memory path enforced, Redis path degrades gracefully."""
import asyncio

from app.core.rate_limit import RateLimiter


def test_memory_allows_then_blocks():
    lim = RateLimiter(limit=3, window=60)
    assert lim.backend == "memory"
    assert asyncio.run(lim.allow("ip")) is True
    assert asyncio.run(lim.allow("ip")) is True
    assert asyncio.run(lim.allow("ip")) is True
    assert asyncio.run(lim.allow("ip")) is False  # 4th blocked
    assert asyncio.run(lim.allow("other")) is True  # per-key


def test_unreachable_redis_falls_back_to_memory():
    lim = RateLimiter(limit=2, window=60, redis_url="redis://127.0.0.1:9")
    assert asyncio.run(lim.allow("ip")) is True
    assert asyncio.run(lim.allow("ip")) is True
    assert asyncio.run(lim.allow("ip")) is False
    assert lim.backend == "memory"
