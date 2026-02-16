"""Mock provider implementation for testing and development."""

from app.providers.base import BaseProvider
from datetime import date
from typing import List, Dict, Any
import math
from app.logger import get_logger

logger = get_logger(__name__)


class MockProvider(BaseProvider):
    """
    Deterministic mock provider returning multiple transport options.
    
    Pricing is based on:
    - A simple hash of origin/destination (distance proxy)
    - Days of travel
    - Number of travelers
    - Transport type multipliers
    """
    
    def __init__(self):
        """Initialize the mock provider."""
        self.name = "mock-provider"
        self.transport_types = ["flight", "train", "bus"]
        self.type_multipliers = {
            "flight": 1.0,  # Base price
            "train": 0.6,   # 60% of flight price
            "bus": 0.4,     # 40% of flight price
        }
    
    async def get_prices(
        self,
        origin: str,
        destination: str,
        start_date: date,
        end_date: date,
        travelers: int,
    ) -> List[Dict[str, Any]]:
        """Get multiple transport options with prices.
        
        Returns a list with flight, train, and bus options.
        """
        days = max((end_date - start_date).days, 1)
        
        # Create deterministic "distance" proxy from city names
        key = (origin + "-" + destination).lower()
        score = sum(ord(c) for c in key) % 300
        
        # Base price calculation
        base_price = 50 + score * 0.5
        trip_multiplier = 1 + days * 0.02
        price_per_person = base_price * trip_multiplier
        
        # Generate multiple options
        options = []
        for transport_type in self.transport_types:
            multiplier = self.type_multipliers.get(transport_type, 1.0)
            total_price = round(price_per_person * multiplier * travelers, 2)
            
            options.append({
                "provider": self._get_provider_name(transport_type),
                "transport_type": transport_type,
                "price": total_price,
                "currency": "USD",
                "notes": self._get_notes(transport_type, days),
            })
        
        logger.debug(
            f"Generated {len(options)} mock transport options for "
            f"{origin} -> {destination} ({days} days)"
        )
        
        return options
    
    def _get_provider_name(self, transport_type: str) -> str:
        """Get a realistic provider name based on transport type."""
        providers = {
            "flight": "Global Airways",
            "train": "Express Railways",
            "bus": "Budget Motors",
        }
        return providers.get(transport_type, "Unknown Provider")
    
    def _get_notes(self, transport_type: str, days: int) -> str:
        """Get notes that vary by transport type and duration."""
        notes = {
            "flight": f"Direct/one-stop flights, {int(days/2)} hour travel time",
            "train": f"Scenic route, overnight option available ({days * 3} hours travel)",
            "bus": f"Budget option, {days * 5} hours travel time",
        }
        return notes.get(transport_type, "Estimated travel time varies")
