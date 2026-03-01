"""Tests for rate limiter implementations and factory behavior."""

import pytest

from app.core.rate_limit import InMemoryRateLimiter, create_rate_limiter


@pytest.mark.asyncio
async def test_in_memory_rate_limiter_blocks_after_limit():
    limiter = InMemoryRateLimiter(max_requests=2, window_seconds=60)

    allowed_1, count_1, retry_1 = await limiter.allow("client-a:/api/v1/chat")
    allowed_2, count_2, retry_2 = await limiter.allow("client-a:/api/v1/chat")
    allowed_3, count_3, retry_3 = await limiter.allow("client-a:/api/v1/chat")

    assert allowed_1 is True
    assert count_1 == 1
    assert retry_1 == 0.0

    assert allowed_2 is True
    assert count_2 == 2
    assert retry_2 == 0.0

    assert allowed_3 is False
    assert count_3 == 2
    assert retry_3 > 0


@pytest.mark.asyncio
async def test_create_rate_limiter_defaults_to_memory():
    limiter = create_rate_limiter(
        backend="memory",
        max_requests=10,
        window_seconds=60,
    )
    assert isinstance(limiter, InMemoryRateLimiter)


def test_create_rate_limiter_redis_requires_url():
    with pytest.raises(RuntimeError):
        create_rate_limiter(
            backend="redis",
            max_requests=10,
            window_seconds=60,
            redis_url="",
        )
