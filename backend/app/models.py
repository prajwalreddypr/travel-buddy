from typing import Optional
from sqlmodel import SQLModel, Field


class CityStats(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    city: str
    country: str
    avg_accommodation_per_night: float
    avg_food_per_day: float
    avg_misc_per_day: float
