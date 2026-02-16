"""Custom exceptions for the Travel Buddy API."""

from fastapi import HTTPException, status
from typing import Optional


class TravelBuddyException(Exception):
    """Base exception for Travel Buddy application."""
    pass


class InvalidTripRequestException(TravelBuddyException):
    """Raised when trip request data is invalid."""
    def __init__(self, message: str):
        self.message = message
        self.status_code = status.HTTP_400_BAD_REQUEST
        super().__init__(self.message)


class DateValidationException(InvalidTripRequestException):
    """Raised when trip dates are invalid."""
    def __init__(self, message: str = "Invalid trip dates"):
        super().__init__(message)


class CityNotFoundException(TravelBuddyException):
    """Raised when a city is not found in the database."""
    def __init__(self, city: str):
        self.city = city
        self.status_code = status.HTTP_404_NOT_FOUND
        self.message = f"City '{city}' not found in database"
        super().__init__(self.message)


class ProviderException(TravelBuddyException):
    """Raised when a transport provider fails."""
    def __init__(self, provider: str, message: str = "Provider error"):
        self.provider = provider
        self.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        self.message = f"Transport provider '{provider}' error: {message}"
        super().__init__(self.message)


class DatabaseException(TravelBuddyException):
    """Raised when database operations fail."""
    def __init__(self, message: str = "Database operation failed"):
        self.status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
        self.message = message
        super().__init__(self.message)


class ConfigurationException(TravelBuddyException):
    """Raised when configuration is invalid."""
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)


def create_http_exception(exc: TravelBuddyException) -> HTTPException:
    """Convert a TravelBuddyException to an HTTPException."""
    status_code = getattr(exc, 'status_code', status.HTTP_500_INTERNAL_SERVER_ERROR)
    detail = getattr(exc, 'message', str(exc))
    return HTTPException(status_code=status_code, detail=detail)
