"""Database models for Travel Buddy API."""

from typing import Optional
from datetime import datetime, date
from sqlmodel import SQLModel, Field


class User(SQLModel, table=True):
    """User account for authentication."""

    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True, description="User email")
    hashed_password: str = Field(description="Hashed password")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Account creation time")


class SavedTrip(SQLModel, table=True):
    """Saved trip for a user account."""

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(index=True, description="User ID")
    origin: str = Field(description="Origin city")
    destination: str = Field(description="Destination city")
    start_date: date = Field(description="Trip start date")
    end_date: date = Field(description="Trip end date")
    travelers: int = Field(description="Number of travelers")
    transport_type: str = Field(default="any", description="Preferred transport type")
    breakdown_json: str = Field(description="JSON cost breakdown")
    total: float = Field(description="Total trip cost")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Saved at")


class CityStats(SQLModel, table=True):
    """City statistics for cost estimation."""
    
    id: Optional[int] = Field(default=None, primary_key=True)
    city: str = Field(index=True, description="City name")
    country: str = Field(description="Country name")
    avg_accommodation_per_night: float = Field(
        gt=0,
        description="Average accommodation cost per night in USD"
    )
    avg_food_per_day: float = Field(
        gt=0,
        description="Average food cost per day in USD"
    )
    avg_misc_per_day: float = Field(
        ge=0,
        description="Average miscellaneous cost per day in USD"
    )
    
    class Config:
        """Pydantic config."""
        json_schema_extra = {
            "example": {
                "city": "Paris",
                "country": "France",
                "avg_accommodation_per_night": 120.0,
                "avg_food_per_day": 40.0,
                "avg_misc_per_day": 20.0,
            }
        }
