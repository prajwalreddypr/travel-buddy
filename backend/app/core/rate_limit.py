"""In-memory sliding window rate limiter for API protection."""

import asyncio
from collections import defaultdict, deque
from time import monotonic
from typing import Deque, Dict, Tuple


class InMemoryRateLimiter:
    """Simple process-local sliding window rate limiter."""

    def __init__(self, max_requests: int, window_seconds: int) -> None:
        self.max_requests = max(1, max_requests)
        self.window_seconds = max(1, window_seconds)
        self._events: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = asyncio.Lock()

    async def allow(self, key: str) -> Tuple[bool, int, float]:
        """Check if key can proceed.

        Returns:
            allowed: Whether request is allowed.
            current_count: Number of requests in the window after this check.
            retry_after_seconds: Seconds to wait before retrying if blocked.
        """
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
