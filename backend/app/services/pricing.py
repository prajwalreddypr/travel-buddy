"""Pricing service for trip cost estimation."""

from datetime import date
from typing import List, Optional
from sqlmodel import Session, select

from app.schemas import TripRequest, TransportOption, AccommodationEstimate
from app.models import CityStats
from app.providers.mock_provider import MockProvider
from app.exceptions import ProviderException, DatabaseException
from app.logger import get_logger
from app.core.config import settings

logger = get_logger(__name__)


async def get_transport_options(
    trip_request: TripRequest,
) -> List[TransportOption]:
    """Get available transport options for the trip.
    
    Args:
        trip_request: The trip request with origin, destination, dates, etc.
        
    Returns:
        List of available transport options
        
    Raises:
        ProviderException: If transport provider fails
    """
    try:
        provider = MockProvider()
        price_infos = await provider.get_prices(
            trip_request.origin,
            trip_request.destination,
            trip_request.start_date,
            trip_request.end_date,
            trip_request.travelers,
        )
        
        options = [
            TransportOption(
                provider=info["provider"],
                transport_type=info["transport_type"],
                price=info["price"],
                currency=info.get("currency", "USD"),
                notes=info.get("notes"),
            )
            for info in price_infos
        ]
        
        logger.info(
            f"Got {len(options)} transport options for {trip_request.origin} -> "
            f"{trip_request.destination}: "
            f"{', '.join(f'{opt.transport_type}(${opt.price})' for opt in options)}"
        )
        
        return options
    except Exception as e:
        logger.error(f"Transport provider error: {str(e)}", exc_info=True)
        raise ProviderException("transport-provider", str(e))


def get_city_stats(city: str, session: Session) -> Optional[CityStats]:
    """Get city statistics from database.
    
    Args:
        city: City name to look up
        session: Database session
        
    Returns:
        CityStats object if found, None otherwise
        
    Raises:
        DatabaseException: If database query fails
    """
    try:
        statement = select(CityStats).where(CityStats.city.ilike(city))
        result = session.exec(statement).first()
        
        if result:
            logger.debug(f"Found stats for city: {city}")
        else:
            logger.debug(f"No stats found for city: {city}, using defaults")
        
        return result
    except Exception as e:
        logger.error(f"Error fetching city stats for {city}: {str(e)}")
        raise DatabaseException(f"Failed to fetch city stats for '{city}'")


async def estimate_trip(
    trip_request: TripRequest,
    session: Session,
) -> dict:
    """Estimate total trip cost.
    
    Args:
        trip_request: The trip request
        session: Database session
        
    Returns:
        Dictionary with trip_days, transport_options, accommodation, food, misc, total
        
    Raises:
        ProviderException: If transport provider fails
        DatabaseException: If database query fails
    """
    try:
        # Calculate trip duration
        days = max((trip_request.end_date - trip_request.start_date).days, 1)
        
        # Get transport options
        transport_options = await get_transport_options(trip_request)
        
        # Get city statistics or use defaults
        stats = get_city_stats(trip_request.destination, session)
        
        if stats:
            per_night = stats.avg_accommodation_per_night
            food_per_day = stats.avg_food_per_day
            misc_per_day = stats.avg_misc_per_day
        else:
            per_night = settings.default_accommodation_per_night
            food_per_day = settings.default_food_per_day
            misc_per_day = settings.default_misc_per_day
        
        # Calculate costs
        nights = days
        accommodation_total = per_night * nights
        food_total = food_per_day * days * trip_request.travelers
        misc_total = misc_per_day * days * trip_request.travelers
        transport_total = sum(opt.price for opt in transport_options)
        
        total = round(
            transport_total + accommodation_total + food_total + misc_total, 2
        )
        
        accommodation = AccommodationEstimate(
            per_night=per_night,
            nights=nights,
            total=round(accommodation_total, 2),
        )
        
        logger.info(
            f"Trip estimate for {trip_request.origin} -> {trip_request.destination}: "
            f"${total} ({days} days, {trip_request.travelers} travelers, "
            f"{len(transport_options)} transport options)"
        )
        
        return {
            "trip_days": days,
            "transport_options": transport_options,
            "accommodation": accommodation,
            "food": round(food_total, 2),
            "misc": round(misc_total, 2),
            "total": total,
        }
    except (ProviderException, DatabaseException):
        raise
    except Exception as e:
        logger.error(f"Error estimating trip: {str(e)}", exc_info=True)
        raise DatabaseException("Failed to estimate trip cost")
