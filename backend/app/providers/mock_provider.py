from .base import BaseProvider
from datetime import date
import math


class MockProvider(BaseProvider):
    """Deterministic mock provider: price based on simple hash of origin/destination and days."""

    async def get_price(self, origin: str, destination: str, start_date: date, end_date: date, travelers: int):
        days = max((end_date - start_date).days, 1)
        # naive distance proxy
        key = (origin + "-" + destination).lower()
        score = sum(ord(c) for c in key) % 300
        base_price = 50 + score * 0.5
        trip_multiplier = 1 + days * 0.02
        price_per_person = base_price * trip_multiplier
        total = price_per_person * max(1, travelers)
        return {
            "provider": "mock-air",
            "transport_type": "flight",
            "price": round(total, 2),
            "currency": "USD",
            "notes": "mocked deterministic price",
        }
