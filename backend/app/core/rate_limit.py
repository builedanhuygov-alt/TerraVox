"""Rate limiting — Redis-backed when REDIS_URL is set, in-memory fallback.

Same semantics either way: `limit` requests per `window` seconds per key
(client IP). Sliding window in memory; fixed window in Redis (good enough
for abuse protection and correct across instances, unlike the old
per-process defaultdict which also reset on every restart).
"""
import time
from collections import defaultdict
from typing import Optional


class RateLimiter:
    def __init__(self, limit: int = 60, window: int = 60, redis_url: Optional[str] = None):
        self.limit = limit
        self.window = window
        self._mem: dict[str, list[float]] = defaultdict(list)
        self._redis = None
        self._redis_url = redis_url
        self._redis_failed = False
        if redis_url:
            try:
                import redis  # type: ignore

                self._redis = redis.Redis.from_url(
                    redis_url, socket_connect_timeout=2, socket_timeout=2,
                    health_check_interval=30,
                )
            except Exception:
                self._redis = None

    @property
    def backend(self) -> str:
        return "redis" if self._redis and not self._redis_failed else "memory"

    async def allow(self, key: str) -> bool:
        if self._redis and not self._redis_failed:
            try:
                return self._allow_redis(key)
            except Exception:
                self._redis_failed = True  # fall through to memory
        return self._allow_memory(key)

    def _allow_memory(self, key: str) -> bool:
        now = time.time()
        bucket = [t for t in self._mem[key] if now - t < self.window]
        self._mem[key] = bucket
        if len(bucket) >= self.limit:
            return False
        bucket.append(now)
        return True

    def _allow_redis(self, key: str) -> bool:
        window_id = int(time.time() // self.window)
        rkey = f"ecogl:rl:{window_id}:{key}"
        count = self._redis.incr(rkey)
        if count == 1:
            self._redis.expire(rkey, self.window)
        return count <= self.limit
