from typing import List, Optional
from pydantic import BaseModel
from datetime import date


class TripRequest(BaseModel):
    origin: str
    destination: str
    start_date: date
    end_date: date
    travelers: int = 1
    transport_type: Optional[str] = "any"


class TransportOption(BaseModel):
    provider: str
    transport_type: str
    price: float
    currency: str = "USD"
    notes: Optional[str] = None


class AccommodationEstimate(BaseModel):
    per_night: float
    nights: int
    total: float


class Breakdown(BaseModel):
    transport: List[TransportOption]
    accommodation: AccommodationEstimate
    food: float
    misc: float
    total: float


class QuoteResponse(BaseModel):
    trip_days: int
    breakdown: Breakdown
