"""Database seeding with sample city data."""

from app.db.session import engine
from sqlmodel import Session
from app.models import CityStats
from app.logger import get_logger
from typing import List, Dict, Any

logger = get_logger(__name__)

# Sample city data for seeding
SAMPLE_CITIES: List[Dict[str, Any]] = [
    {
        "city": "Paris",
        "country": "France",
        "avg_accommodation_per_night": 120.0,
        "avg_food_per_day": 40.0,
        "avg_misc_per_day": 20.0,
    },
    {
        "city": "New York",
        "country": "USA",
        "avg_accommodation_per_night": 180.0,
        "avg_food_per_day": 50.0,
        "avg_misc_per_day": 25.0,
    },
    {
        "city": "London",
        "country": "UK",
        "avg_accommodation_per_night": 150.0,
        "avg_food_per_day": 45.0,
        "avg_misc_per_day": 20.0,
    },
    {
        "city": "Tokyo",
        "country": "Japan",
        "avg_accommodation_per_night": 110.0,
        "avg_food_per_day": 35.0,
        "avg_misc_per_day": 15.0,
    },
    {
        "city": "Barcelona",
        "country": "Spain",
        "avg_accommodation_per_night": 95.0,
        "avg_food_per_day": 30.0,
        "avg_misc_per_day": 15.0,
    },
]


def seed_city_stats() -> int:
    """Seed the database with sample city statistics.
    
    Returns:
        Number of new cities added to the database
    """
    try:
        with Session(engine) as session:
            added_count = 0
            
            for entry in SAMPLE_CITIES:
                # Check if city already exists
                existing = session.query(CityStats).filter(
                    CityStats.city == entry["city"]
                ).first()
                
                if not existing:
                    city_stats = CityStats(**entry)
                    session.add(city_stats)
                    added_count += 1
                    logger.debug(f"Added city: {entry['city']}")
                else:
                    logger.debug(f"City already exists: {entry['city']}")
            
            session.commit()
            
            if added_count > 0:
                logger.info(f"Seeded {added_count} new cities to database")
            
            return added_count
            
    except Exception as e:
        logger.error(f"Error seeding database: {str(e)}", exc_info=True)
        raise
