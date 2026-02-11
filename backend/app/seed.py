from app.db.session import engine
from sqlmodel import Session
from app.models import CityStats


SAMPLE = [
    {"city": "Paris", "country": "France", "avg_accommodation_per_night": 120.0, "avg_food_per_day": 40.0, "avg_misc_per_day": 20.0},
    {"city": "New York", "country": "USA", "avg_accommodation_per_night": 180.0, "avg_food_per_day": 50.0, "avg_misc_per_day": 25.0},
    {"city": "London", "country": "UK", "avg_accommodation_per_night": 150.0, "avg_food_per_day": 45.0, "avg_misc_per_day": 20.0},
]


def seed_city_stats():
    with Session(engine) as session:
        for entry in SAMPLE:
            exists = session.query(CityStats).filter(CityStats.city == entry["city"]).first()
            if not exists:
                cs = CityStats(**entry)
                session.add(cs)
        session.commit()
