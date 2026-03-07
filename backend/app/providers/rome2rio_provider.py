"""Rome2Rio provider for real transport cost and duration data."""

import httpx
from datetime import date
from typing import List, Dict, Any, Optional

from app.providers.base import BaseProvider
from app.logger import get_logger

logger = get_logger(__name__)

# Map Rome2Rio route names to our transport_type keys
_ROUTE_NAME_MAP: Dict[str, str] = {
    "fly": "flight",
    "flight": "flight",
    "train": "train",
    "rail": "train",
    "bus": "bus",
    "coach": "bus",
    "drive": "car",
    "car": "car",
    "ferry": "ferry",
    "boat": "ferry",
}

_PROVIDER_NAMES: Dict[str, str] = {
    "flight": "Rome2Rio Flights",
    "train": "Rome2Rio Rail",
    "bus": "Rome2Rio Bus",
    "car": "Drive (est.)",
    "ferry": "Rome2Rio Ferry",
}


def _route_name_to_type(name: str) -> Optional[str]:
    """Convert a Rome2Rio route name to our internal transport type."""
    return _ROUTE_NAME_MAP.get(name.lower().strip())


def _format_duration(minutes: int) -> str:
    """Format minutes into a human-readable duration string."""
    if minutes < 60:
        return f"{minutes}m"
    h, m = divmod(minutes, 60)
    return f"{h}h {m}m" if m else f"{h}h"


class Rome2RioProvider(BaseProvider):
    """
    Provider that queries the Rome2Rio Search API to get real transport
    options with indicative prices and travel durations.

    API docs: https://api.rome2rio.com/api/1.4/
    """

    BASE_URL = "https://api.rome2rio.com/api/1.4/json/Search"

    def __init__(self, api_key: str, timeout: int = 10):
        self.api_key = api_key
        self.timeout = timeout

    async def get_prices(
        self,
        origin: str,
        destination: str,
        start_date: date,
        end_date: date,
        travelers: int,
    ) -> List[Dict[str, Any]]:
        """Call Rome2Rio Search API and return normalised transport options."""
        params = {
            "key": self.api_key,
            "origin": origin,
            "destination": destination,
            "currencyCode": "USD",
        }

        logger.info(f"Rome2Rio: querying {origin} -> {destination}")

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.get(self.BASE_URL, params=params)
            resp.raise_for_status()
            data = resp.json()

        routes = data.get("routes", [])
        logger.info(f"Rome2Rio: received {len(routes)} routes")

        options: List[Dict[str, Any]] = []
        seen_types: set = set()

        for route in routes:
            name: str = route.get("name", "")
            transport_type = _route_name_to_type(name)
            if not transport_type:
                logger.debug(f"Rome2Rio: skipping unknown route type '{name}'")
                continue

            # Skip duplicate transport types (keep cheapest)
            if transport_type in seen_types:
                continue

            indicative = route.get("indicativePrice") or {}
            price_per_person: Optional[float] = indicative.get("price")

            if price_per_person is None:
                logger.debug(f"Rome2Rio: no indicative price for route '{name}', skipping")
                continue

            total_price = round(float(price_per_person) * travelers, 2)
            duration_min: int = route.get("totalDuration", 0)
            duration_str = _format_duration(duration_min) if duration_min else "varies"

            options.append({
                "provider": _PROVIDER_NAMES.get(transport_type, "Rome2Rio"),
                "transport_type": transport_type,
                "price": total_price,
                "currency": indicative.get("currency", "USD"),
                "notes": f"~{duration_str} travel time • {travelers} traveler(s)",
            })

            seen_types.add(transport_type)

        logger.info(
            f"Rome2Rio: returning {len(options)} options for "
            f"{origin} -> {destination}"
        )
        return options
