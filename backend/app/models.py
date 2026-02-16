"""Database models for Travel Buddy API."""

from typing import Optional
from sqlmodel import SQLModel, Field


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
