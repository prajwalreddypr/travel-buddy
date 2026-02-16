"""Travel Buddy API - Main package."""

__version__ = "1.0.0"
__author__ = "Travel Buddy Team"

# Re-export commonly used items for convenience
from app.exceptions import (
    TravelBuddyException,
    InvalidTripRequestException,
    DateValidationException,
    CityNotFoundException,
    ProviderException,
    DatabaseException,
    ConfigurationException,
)
from app.schemas import TripRequest, QuoteResponse
from app.models import CityStats

__all__ = [
    "TravelBuddyException",
    "InvalidTripRequestException",
    "DateValidationException",
    "CityNotFoundException",
    "ProviderException",
    "DatabaseException",
    "ConfigurationException",
    "TripRequest",
    "QuoteResponse",
    "CityStats",
]
