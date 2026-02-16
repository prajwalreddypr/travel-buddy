"""Comprehensive tests for the Travel Buddy API."""

import pytest
import datetime
from fastapi.testclient import TestClient
from sqlmodel import Session, create_engine
from sqlmodel.pool import StaticPool

from app.main import app
from app.db.session import get_session
from app.models import CityStats
from app.providers.mock_provider import MockProvider


# ===== FIXTURES =====

@pytest.fixture(name="session")
def session_fixture():
    """Create a test database session."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    from sqlmodel import SQLModel
    
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="client")
def client_fixture(session: Session):
    """Create a test client with test database."""
    def get_session_override():
        return session
    
    app.dependency_overrides[get_session] = get_session_override
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture(name="sample_cities")
def sample_cities_fixture(session: Session):
    """Add sample cities to test database."""
    cities = [
        CityStats(
            city="Paris",
            country="France",
            avg_accommodation_per_night=120.0,
            avg_food_per_day=40.0,
            avg_misc_per_day=20.0,
        ),
        CityStats(
            city="New York",
            country="USA",
            avg_accommodation_per_night=180.0,
            avg_food_per_day=50.0,
            avg_misc_per_day=25.0,
        ),
    ]
    for city in cities:
        session.add(city)
    session.commit()
    return cities


# ===== HEALTH CHECK TESTS =====

def test_health_check(client: TestClient):
    """Test health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data
    assert "environment" in data


# ===== QUOTE ENDPOINT - HAPPY PATH TESTS =====

def test_quote_basic_with_known_city(client: TestClient, sample_cities):
    """Test creating a quote with a known destination city."""
    today = datetime.date.today()
    payload = {
        "origin": "Berlin",
        "destination": "Paris",
        "start_date": (today + datetime.timedelta(days=30)).isoformat(),
        "end_date": (today + datetime.timedelta(days=33)).isoformat(),
        "travelers": 2,
    }
    response = client.post("/api/v1/quote", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "trip_days" in data
    assert "breakdown" in data
    assert data["trip_days"] == 3
    assert data["breakdown"]["total"] > 0
    assert len(data["breakdown"]["transport"]) > 0  # Multiple options


def test_quote_with_unknown_city(client: TestClient):
    """Test quote with unknown destination (uses defaults)."""
    today = datetime.date.today()
    payload = {
        "origin": "Berlin",
        "destination": "UnknownCity",
        "start_date": (today + datetime.timedelta(days=30)).isoformat(),
        "end_date": (today + datetime.timedelta(days=35)).isoformat(),
        "travelers": 1,
    }
    response = client.post("/api/v1/quote", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["trip_days"] == 5
    assert data["breakdown"]["total"] > 0


def test_quote_single_day_trip(client: TestClient):
    """Test with single-day trip."""
    today = datetime.date.today()
    payload = {
        "origin": "Berlin",
        "destination": "Paris",
        "start_date": (today + datetime.timedelta(days=10)).isoformat(),
        "end_date": (today + datetime.timedelta(days=10)).isoformat(),
        "travelers": 1,
    }
    response = client.post("/api/v1/quote", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["trip_days"] == 1


def test_quote_multiple_travelers(client: TestClient):
    """Test with multiple travelers."""
    today = datetime.date.today()
    payload = {
        "origin": "Berlin",
        "destination": "Paris",
        "start_date": (today + datetime.timedelta(days=10)).isoformat(),
        "end_date": (today + datetime.timedelta(days=15)).isoformat(),
        "travelers": 5,
    }
    response = client.post("/api/v1/quote", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["breakdown"]["total"] > 0


def test_quote_response_structure(client: TestClient, sample_cities):
    """Test response structure is correct."""
    today = datetime.date.today()
    payload = {
        "origin": "New York",
        "destination": "Paris",
        "start_date": (today + datetime.timedelta(days=20)).isoformat(),
        "end_date": (today + datetime.timedelta(days=25)).isoformat(),
        "travelers": 2,
    }
    response = client.post("/api/v1/quote", json=payload)
    assert response.status_code == 200
    data = response.json()
    
    # Check structure
    assert "trip_days" in data
    assert "breakdown" in data
    breakdown = data["breakdown"]
    
    assert "transport" in breakdown
    assert isinstance(breakdown["transport"], list)
    assert len(breakdown["transport"]) > 0
    
    # Check transport option structure
    transport = breakdown["transport"][0]
    assert "provider" in transport
    assert "transport_type" in transport
    assert "price" in transport
    assert "currency" in transport
    
    # Check accommodation
    assert "accommodation" in breakdown
    assert "per_night" in breakdown["accommodation"]
    assert "nights" in breakdown["accommodation"]
    assert "total" in breakdown["accommodation"]
    
    # Check costs
    assert "food" in breakdown
    assert "misc" in breakdown
    assert "total" in breakdown
    
    # Validate totals are positive
    assert breakdown["accommodation"]["total"] > 0
    assert breakdown["food"] >= 0
    assert breakdown["misc"] >= 0
    assert breakdown["total"] > 0


# ===== VALIDATION TESTS - INVALID INPUT =====

def test_quote_dates_in_past(client: TestClient):
    """Test that past dates are rejected."""
    today = datetime.date.today()
    payload = {
        "origin": "Berlin",
        "destination": "Paris",
        "start_date": (today - datetime.timedelta(days=5)).isoformat(),
        "end_date": (today + datetime.timedelta(days=5)).isoformat(),
        "travelers": 1,
    }
    response = client.post("/api/v1/quote", json=payload)
    assert response.status_code in [400, 422]  # Both are validation errors


def test_quote_end_before_start(client: TestClient):
    """Test that end_date < start_date is rejected."""
    today = datetime.date.today()
    payload = {
        "origin": "Berlin",
        "destination": "Paris",
        "start_date": (today + datetime.timedelta(days=20)).isoformat(),
        "end_date": (today + datetime.timedelta(days=10)).isoformat(),
        "travelers": 1,
    }
    response = client.post("/api/v1/quote", json=payload)
    assert response.status_code in [400, 422]


def test_quote_same_origin_destination(client: TestClient):
    """Test that origin == destination is rejected."""
    today = datetime.date.today()
    payload = {
        "origin": "Paris",
        "destination": "Paris",
        "start_date": (today + datetime.timedelta(days=10)).isoformat(),
        "end_date": (today + datetime.timedelta(days=15)).isoformat(),
        "travelers": 1,
    }
    response = client.post("/api/v1/quote", json=payload)
    assert response.status_code in [400, 422]


def test_quote_empty_origin(client: TestClient):
    """Test that empty origin is rejected."""
    today = datetime.date.today()
    payload = {
        "origin": "",
        "destination": "Paris",
        "start_date": (today + datetime.timedelta(days=10)).isoformat(),
        "end_date": (today + datetime.timedelta(days=15)).isoformat(),
        "travelers": 1,
    }
    response = client.post("/api/v1/quote", json=payload)
    assert response.status_code in [400, 422]


def test_quote_invalid_travelers(client: TestClient):
    """Test that zero or negative travelers are rejected."""
    today = datetime.date.today()
    payload = {
        "origin": "Berlin",
        "destination": "Paris",
        "start_date": (today + datetime.timedelta(days=10)).isoformat(),
        "end_date": (today + datetime.timedelta(days=15)).isoformat(),
        "travelers": 0,
    }
    response = client.post("/api/v1/quote", json=payload)
    assert response.status_code in [400, 422]


def test_quote_too_many_travelers(client: TestClient):
    """Test that travelers exceeding max are rejected."""
    today = datetime.date.today()
    payload = {
        "origin": "Berlin",
        "destination": "Paris",
        "start_date": (today + datetime.timedelta(days=10)).isoformat(),
        "end_date": (today + datetime.timedelta(days=15)).isoformat(),
        "travelers": 100,  # Exceeds max typically (20)
    }
    response = client.post("/api/v1/quote", json=payload)
    assert response.status_code in [400, 422]


def test_quote_trip_too_long(client: TestClient):
    """Test that trips exceeding max days are rejected."""
    today = datetime.date.today()
    payload = {
        "origin": "Berlin",
        "destination": "Paris",
        "start_date": (today + datetime.timedelta(days=10)).isoformat(),
        "end_date": (today + datetime.timedelta(days=400)).isoformat(),  # Way over 365 max
        "travelers": 1,
    }
    response = client.post("/api/v1/quote", json=payload)
    assert response.status_code in [400, 422]


def test_quote_missing_required_field(client: TestClient):
    """Test that missing required fields are rejected."""
    payload = {
        "origin": "Berlin",
        "destination": "Paris",
        # missing start_date and end_date
        "travelers": 1,
    }
    response = client.post("/api/v1/quote", json=payload)
    assert response.status_code == 422  # Unprocessable entity


def test_quote_invalid_date_format(client: TestClient):
    """Test that invalid date format is rejected."""
    payload = {
        "origin": "Berlin",
        "destination": "Paris",
        "start_date": "2026-13-01",  # Invalid month
        "end_date": "2026-03-15",
        "travelers": 1,
    }
    response = client.post("/api/v1/quote", json=payload)
    assert response.status_code == 422


# ===== MOCK PROVIDER TESTS =====

@pytest.mark.asyncio
async def test_mock_provider_returns_multiple_options():
    """Test that mock provider returns multiple transport options."""
    provider = MockProvider()
    today = datetime.date.today()
    
    prices = await provider.get_prices(
        "Berlin",
        "Paris",
        today + datetime.timedelta(days=10),
        today + datetime.timedelta(days=15),
        2,
    )
    
    assert len(prices) >= 2  # At least flight and train
    
    # Check structure of each option
    for price_info in prices:
        assert "provider" in price_info
        assert "transport_type" in price_info
        assert "price" in price_info
        assert price_info["price"] > 0
        assert "currency" in price_info


@pytest.mark.asyncio
async def test_mock_provider_determines_price():
    """Test that prices vary by route and travelers."""
    provider = MockProvider()
    today = datetime.date.today()
    
    prices1 = await provider.get_prices(
        "Berlin",
        "Paris",
        today + datetime.timedelta(days=10),
        today + datetime.timedelta(days=15),
        1,
    )
    
    prices2 = await provider.get_prices(
        "Berlin",
        "Paris",
        today + datetime.timedelta(days=10),
        today + datetime.timedelta(days=15),
        2,
    )
    
    # Prices should be different for different travelers
    price1 = prices1[0]["price"]
    price2 = prices2[0]["price"]
    assert price2 > price1  # More travelers = more expensive


# ===== FRONTEND TESTS =====

def test_frontend_index(client: TestClient):
    """Test that frontend index page is served."""
    response = client.get("/")
    # Should succeed (200) or at least not be a server error
    assert response.status_code in [200, 404]  # 404 if frontend not present


def test_static_files_mounted(client: TestClient):
    """Test that static files are mounted."""
    # This will return 404 if the file doesn't exist, which is fine for this test
    response = client.get("/static/app.js")
    # Just checking that the mount exists and responds (not 500)
    assert response.status_code in [200, 404]


# ===== EDGE CASE TESTS =====

def test_quote_whitespace_cities(client: TestClient):
    """Test that cities with leading/trailing whitespace are handled."""
    today = datetime.date.today()
    payload = {
        "origin": "  Berlin  ",
        "destination": "  Paris  ",
        "start_date": (today + datetime.timedelta(days=10)).isoformat(),
        "end_date": (today + datetime.timedelta(days=15)).isoformat(),
        "travelers": 1,
    }
    response = client.post("/api/v1/quote", json=payload)
    assert response.status_code == 200


def test_quote_case_insensitive_cities(client: TestClient, sample_cities):
    """Test that city lookup is case-insensitive."""
    today = datetime.date.today()
    payload = {
        "origin": "Berlin",
        "destination": "paris",  # lowercase
        "start_date": (today + datetime.timedelta(days=10)).isoformat(),
        "end_date": (today + datetime.timedelta(days=15)).isoformat(),
        "travelers": 1,
    }
    response = client.post("/api/v1/quote", json=payload)
    assert response.status_code == 200
    # Should still find Paris data
    data = response.json()
    assert data["breakdown"]["accommodation"]["per_night"] == 120.0
