"""Tests for chatbot endpoints and behavior."""

import json
from datetime import date

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.auth.security import get_current_user
from app.db.session import get_session
from app.main import app
from app.models import SavedTrip, User


client = TestClient(app)


def test_chat_endpoint_returns_reply(monkeypatch):
    async def fake_generate_chat_reply(message: str, context):
        assert "Tokyo" in message
        assert context == {"destination": "Tokyo", "days": "5"}
        return "Test reply"

    monkeypatch.setattr("app.api.v1.chat.generate_chat_reply", fake_generate_chat_reply)

    response = client.post(
        "/api/v1/chat",
        json={
            "message": "Tokyo itinerary tips",
            "context": {"destination": "Tokyo", "days": "5"},
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["reply"] == "Test reply"


def test_chat_endpoint_validation_error():
    response = client.post(
        "/api/v1/chat",
        json={"message": "   ", "context": {"destination": "Paris", "days": "4"}},
    )

    assert response.status_code == 422


def test_chat_health_endpoint(monkeypatch):
    async def fake_health():
        return {
            "provider": "ollama",
            "base_url": "http://localhost:11434",
            "model": "qwen2.5:3b",
            "provider_reachable": True,
            "model_available": True,
        }

    monkeypatch.setattr("app.api.v1.chat._get_chat_provider_health", fake_health)

    response = client.get("/api/v1/chat/health")

    assert response.status_code == 200
    data = response.json()
    assert data["provider"] == "ollama"
    assert data["provider_reachable"] is True
    assert data["model_available"] is True


@pytest.fixture(name="session")
def session_fixture():
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


@pytest.fixture(name="authed_client")
def authed_client_fixture(session: Session):
    user = User(email="chat-user@example.com", hashed_password="hashed")
    session.add(user)
    session.commit()
    session.refresh(user)

    breakdown = {
        "transport": [
            {
                "provider": "Global Airways",
                "transport_type": "flight",
                "price": 420.0,
                "currency": "USD",
                "notes": "Direct",
            }
        ],
        "accommodation": {"per_night": 110.0, "nights": 4, "total": 440.0},
        "food": 160.0,
        "misc": 80.0,
        "total": 1100.0,
    }
    trip = SavedTrip(
        user_id=user.id,
        origin="Berlin",
        destination="Tokyo",
        start_date=date(2026, 4, 10),
        end_date=date(2026, 4, 14),
        travelers=2,
        transport_type="flight",
        breakdown_json=json.dumps(breakdown),
        total=1100.0,
    )
    session.add(trip)
    session.commit()
    session.refresh(trip)

    def get_session_override():
        return session

    def get_current_user_override():
        return user

    app.dependency_overrides[get_session] = get_session_override
    app.dependency_overrides[get_current_user] = get_current_user_override

    client = TestClient(app)
    yield client, trip.id
    app.dependency_overrides.clear()


def test_chat_from_trip_endpoint_success(monkeypatch, authed_client):
    client, trip_id = authed_client

    async def fake_generate_chat_reply(message: str, context):
        assert "itinerary" in message.lower()
        assert context["destination"] == "Tokyo"
        assert context["transport_type"] == "flight"
        return "Trip action reply"

    monkeypatch.setattr("app.api.v1.chat.generate_chat_reply", fake_generate_chat_reply)

    response = client.post(
        f"/api/v1/chat/from-trip/{trip_id}",
        json={"action": "improve_itinerary"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["trip_id"] == trip_id
    assert data["action"] == "improve_itinerary"
    assert data["reply"] == "Trip action reply"
    assert data["context"]["destination"] == "Tokyo"


def test_chat_from_trip_not_found(authed_client):
    client, _ = authed_client

    response = client.post(
        "/api/v1/chat/from-trip/99999",
        json={"action": "family_friendly"},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Trip not found"
