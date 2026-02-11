from datetime import date
from typing import List
from app.providers.mock_provider import MockProvider
from app.schemas import TripRequest, TransportOption, AccommodationEstimate
from app.db.session import engine, init_db
from sqlmodel import Session, select
from app.models import CityStats
from typing import Optional


async def get_transport_options(tr: TripRequest) -> List[TransportOption]:
    provider = MockProvider()
    p = await provider.get_price(tr.origin, tr.destination, tr.start_date, tr.end_date, tr.travelers)
    return [TransportOption(provider=p["provider"], transport_type=p["transport_type"], price=p["price"], currency=p.get("currency", "USD"), notes=p.get("notes"))]


def get_city_stats(city: str) -> Optional[CityStats]:
    # Ensure DB tables exist (helps when tests import modules before startup)
    init_db()
    with Session(engine) as session:
        statement = select(CityStats).where(CityStats.city.ilike(city))
        result = session.exec(statement).first()
        return result


async def estimate_trip(tr: TripRequest):
    days = max((tr.end_date - tr.start_date).days, 1)
    transport_options = await get_transport_options(tr)
    # accommodation
    stats = get_city_stats(tr.destination)
    if stats:
        per_night = stats.avg_accommodation_per_night
        food_per_day = stats.avg_food_per_day
        misc_per_day = stats.avg_misc_per_day
    else:
        per_night = 80.0
        food_per_day = 30.0
        misc_per_day = 15.0

    nights = days
    accommodation_total = per_night * nights
    food_total = food_per_day * days * tr.travelers
    misc_total = misc_per_day * days * tr.travelers
    transport_total = sum(opt.price for opt in transport_options)
    total = round(transport_total + accommodation_total + food_total + misc_total, 2)

    accommodation = AccommodationEstimate(per_night=per_night, nights=nights, total=round(accommodation_total, 2))

    return {
        "trip_days": days,
        "transport_options": transport_options,
        "accommodation": accommodation,
        "food": round(food_total, 2),
        "misc": round(misc_total, 2),
        "total": total,
    }
