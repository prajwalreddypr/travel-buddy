"""Base provider class for transport price fetching."""

from abc import ABC, abstractmethod
from datetime import date
from typing import List, Dict, Any


class BaseProvider(ABC):
    """Abstract base class for transport providers."""
    
    @abstractmethod
    async def get_prices(
        self,
        origin: str,
        destination: str,
        start_date: date,
        end_date: date,
        travelers: int,
    ) -> List[Dict[str, Any]]:
        """
        Get transport prices for a trip.
        
        Args:
            origin: Origin city
            destination: Destination city
            start_date: Trip start date
            end_date: Trip end date
            travelers: Number of travelers
            
        Returns:
            List of price dictionaries with format:
            {
                "provider": "Provider Name",
                "transport_type": "flight|train|bus|car",
                "price": float,
                "currency": "USD",
                "notes": "Optional notes about the option"
            }
            
        Raises:
            Exception: If price fetching fails
        """
        raise NotImplementedError()
