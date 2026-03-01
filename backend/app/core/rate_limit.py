"""Rate limiting implementations for API protection."""

import asyncio
from collections import defaultdict, deque
from time import monotonic, time
from typing import Deque, Dict, Optional, Protocol, Tuple

try:
    import redis.asyncio as redis
except Exception:  # pragma: no cover - import guard for environments without redis package
    redis = None


class RateLimiter(Protocol):
    async def allow(self, key: str) -> Tuple[bool, int, float]:
        ...

    async def close(self) -> None:
        ...


class InMemoryRateLimiter:
    """Simple process-local sliding window rate limiter."""

    def __init__(self, max_requests: int, window_seconds: int) -> None:
        self.max_requests = max(1, max_requests)
        self.window_seconds = max(1, window_seconds)
        self._events: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def allow(self, key: str) -> Tuple[bool, int, float]:
        now = monotonic()

        async with self._lock:
            queue = self._events[key]
            threshold = now - self.window_seconds

            while queue and queue[0] <= threshold:
                queue.popleft()

            if len(queue) >= self.max_requests:
                retry_after = max(0.0, self.window_seconds - (now - queue[0]))
                return False, len(queue), retry_after

            queue.append(now)
            return True, len(queue), 0.0

    async def close(self) -> None:
        return None


class RedisFixedWindowRateLimiter:
    """Redis-backed fixed-window limiter suitable for multi-instance deployments."""

    def __init__(
        self,
        redis_url: str,
        max_requests: int,
        window_seconds: int,
        key_prefix: str,
        connect_timeout_seconds: float,
        socket_timeout_seconds: float,
    ) -> None:
        if redis is None:
            raise RuntimeError("Redis package is not installed.")

        self.max_requests = max(1, max_requests)
        self.window_seconds = max(1, window_seconds)
        self.key_prefix = key_prefix.strip() or "travel_buddy:rl"
        self._client = redis.from_url(
            redis_url,
            decode_responses=True,
            socket_connect_timeout=connect_timeout_seconds,
            socket_timeout=socket_timeout_seconds,
        )

    def _build_window_key(self, key: str) -> str:
        window_id = int(time() // self.window_seconds)
        return f"{self.key_prefix}:{key}:{window_id}"

    async def allow(self, key: str) -> Tuple[bool, int, float]:
        redis_key = self._build_window_key(key)

        pipeline = self._client.pipeline(transaction=True)
        pipeline.incr(redis_key)
        pipeline.ttl(redis_key)
        count, ttl_seconds = await pipeline.execute()

        if int(count) == 1 or int(ttl_seconds) < 0:
            await self._client.expire(redis_key, self.window_seconds + 1)
            ttl_seconds = self.window_seconds

        retry_after = float(max(0, int(ttl_seconds)))
        allowed = int(count) <= self.max_requests
        return allowed, int(count), 0.0 if allowed else retry_after

    async def close(self) -> None:
        await self._client.aclose()


def create_rate_limiter(
    backend: str,
    max_requests: int,
    window_seconds: int,
    redis_url: Optional[str] = None,
    redis_key_prefix: str = "travel_buddy:rl",
    redis_connect_timeout_seconds: float = 1.5,
    redis_socket_timeout_seconds: float = 1.5,
) -> RateLimiter:
    selected_backend = (backend or "memory").strip().lower()
    if selected_backend == "redis":
        if not redis_url:
            raise RuntimeError("API_RATE_LIMIT_BACKEND=redis requires REDIS_URL.")
        return RedisFixedWindowRateLimiter(
            redis_url=redis_url,
            max_requests=max_requests,
            window_seconds=window_seconds,
            key_prefix=redis_key_prefix,
            connect_timeout_seconds=redis_connect_timeout_seconds,
            socket_timeout_seconds=redis_socket_timeout_seconds,
        )

    return InMemoryRateLimiter(max_requests=max_requests, window_seconds=window_seconds)
