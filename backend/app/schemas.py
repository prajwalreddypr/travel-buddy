from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, model_validator, EmailStr
from datetime import date
from app.core.config import settings


class TripRequest(BaseModel):
    """Request schema for trip quote calculation."""
    origin: str = Field(..., min_length=1, max_length=100, description="Origin city")
    destination: str = Field(..., min_length=1, max_length=100, description="Destination city")
    start_date: date = Field(..., description="Trip start date (must be in future)")
    end_date: date = Field(..., description="Trip end date (must be after start_date)")
    travelers: int = Field(default=1, ge=1, le=settings.max_travelers, description="Number of travelers")
    transport_type: Optional[str] = Field(default="any", max_length=50, description="Preferred transport type")

    @field_validator('origin', 'destination', mode='before')
    @classmethod
    def strip_and_validate_cities(cls, v: str) -> str:
        """Strip whitespace and validate cities are not empty."""
        if isinstance(v, str):
            v = v.strip()
        if not v:
            raise ValueError("City name cannot be empty")
        return v

    @model_validator(mode='after')
    def validate_city_names_different(self) -> 'TripRequest':
        """Ensure origin and destination are different."""
        if self.origin.lower() == self.destination.lower():
            raise ValueError("Origin and destination must be different cities")
        return self

    @field_validator('start_date')
    @classmethod
    def validate_start_date_in_future(cls, v: date) -> date:
        """Ensure start_date is today or in the future."""
        from datetime import date as date_class
        today = date_class.today()
        if v < today:
            raise ValueError(f"Start date must be today or in the future (not {v})")
        return v

    @model_validator(mode='after')
    def validate_date_range(self) -> 'TripRequest':
        """Ensure dates are in correct order and within allowed range."""
        if self.end_date < self.start_date:
            raise ValueError("End date must be after or equal to start date")
        
        trip_days = (self.end_date - self.start_date).days + 1
        if trip_days > settings.max_trip_days:
            raise ValueError(f"Trip duration exceeds maximum of {settings.max_trip_days} days")
        
        return self

    class Config:
        json_schema_extra = {
            "example": {
                "origin": "New York",
                "destination": "Paris",
                "start_date": "2026-03-15",
                "end_date": "2026-03-25",
                "travelers": 2,
                "transport_type": "any"
            }
        }


class TransportOption(BaseModel):
    """Schema for a transport option in the quote."""
    provider: str = Field(..., description="Transport provider name")
    transport_type: str = Field(..., description="Type of transport (flight, train, bus, etc.)")
    price: float = Field(..., gt=0, description="Price in specified currency")
    currency: str = Field(default="USD", description="Currency code")
    notes: Optional[str] = Field(default=None, description="Additional notes about the option")

    class Config:
        json_schema_extra = {
            "example": {
                "provider": "United Airlines",
                "transport_type": "flight",
                "price": 450.00,
                "currency": "USD",
                "notes": "Direct flight, includes baggage"
            }
        }


class AccommodationEstimate(BaseModel):
    """Schema for accommodation cost estimate."""
    per_night: float = Field(..., gt=0, description="Cost per night")
    nights: int = Field(..., ge=1, description="Number of nights")
    total: float = Field(..., ge=0, description="Total accommodation cost")

    class Config:
        json_schema_extra = {
            "example": {
                "per_night": 120.0,
                "nights": 10,
                "total": 1200.0
            }
        }


class Breakdown(BaseModel):
    """Schema for cost breakdown in the quote."""
    transport: List[TransportOption] = Field(..., description="List of transport options")
    accommodation: AccommodationEstimate = Field(..., description="Accommodation cost estimate")
    food: float = Field(..., ge=0, description="Total food cost estimate")
    misc: float = Field(..., ge=0, description="Total miscellaneous cost estimate")
    total: float = Field(..., ge=0, description="Total trip cost")

    class Config:
        json_schema_extra = {
            "example": {
                "transport": [{"provider": "United", "transport_type": "flight", "price": 450.0, "currency": "USD"}],
                "accommodation": {"per_night": 120.0, "nights": 10, "total": 1200.0},
                "food": 350.0,
                "misc": 200.0,
                "total": 2200.0
            }
        }


class QuoteResponse(BaseModel):
    """Schema for the quote response."""
    trip_days: int = Field(..., ge=1, description="Number of days for the trip")
    breakdown: Breakdown = Field(..., description="Cost breakdown")

    class Config:
        json_schema_extra = {
            "example": {
                "trip_days": 10,
                "breakdown": {
                    "transport": [{"provider": "United", "transport_type": "flight", "price": 450.0, "currency": "USD"}],
                    "accommodation": {"per_night": 120.0, "nights": 10, "total": 1200.0},
                    "food": 350.0,
                    "misc": 200.0,
                    "total": 2200.0
                }
            }
        }


class ErrorResponse(BaseModel):
    """Schema for error responses."""
    detail: str = Field(..., description="Error message")
    status: int = Field(..., description="HTTP status code")

    class Config:
        json_schema_extra = {
            "example": {
                "detail": "Invalid trip dates",
                "status": 400
            }
        }


class HealthResponse(BaseModel):
    """Schema for health check response."""
    status: str = Field(..., description="Health status")
    version: str = Field(..., description="API version")
    environment: str = Field(..., description="Current environment")


class UserCreate(BaseModel):
    """Schema for user registration."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, max_length=72, description="User password")


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr = Field(..., description="User email address")
    password: str = Field(..., min_length=8, max_length=72, description="User password")


class UserResponse(BaseModel):
    """Schema for user response."""
    id: int = Field(..., description="User ID")
    email: EmailStr = Field(..., description="User email address")


class SavedTripCreate(BaseModel):
    """Schema for saving a trip."""
    origin: str = Field(..., description="Origin city")
    destination: str = Field(..., description="Destination city")
    start_date: date = Field(..., description="Trip start date")
    end_date: date = Field(..., description="Trip end date")
    travelers: int = Field(..., ge=1, description="Number of travelers")
    transport_type: Optional[str] = Field(default="any", description="Preferred transport type")
    breakdown: Breakdown = Field(..., description="Full cost breakdown")


class SavedTripResponse(BaseModel):
    """Schema for saved trip response."""
    id: int = Field(..., description="Saved trip ID")
    created_at: datetime = Field(..., description="Saved timestamp")
    origin: str = Field(..., description="Origin city")
    destination: str = Field(..., description="Destination city")
    start_date: date = Field(..., description="Trip start date")
    end_date: date = Field(..., description="Trip end date")
    travelers: int = Field(..., ge=1, description="Number of travelers")
    transport_type: Optional[str] = Field(default="any", description="Preferred transport type")
    breakdown: Breakdown = Field(..., description="Full cost breakdown")
    total: float = Field(..., ge=0, description="Total trip cost")
