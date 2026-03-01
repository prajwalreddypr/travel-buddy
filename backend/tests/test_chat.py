"""Tests for chatbot endpoints and behavior."""

import json
from datetime import date

import pytest
import httpx
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine
from sqlmodel.pool import StaticPool

from app.auth.security import get_current_user
from app.core.config import settings
from app.db.session import get_session
from app.main import app
from app.models import SavedTrip, User
from app.services.llm import _extract_ollama_reply, generate_chat_reply


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


def test_chat_endpoint_unsupported_provider_returns_503(monkeypatch):
    original_provider = settings.llm_provider
    monkeypatch.setattr(settings, "llm_provider", "unsupported-provider")

    response = client.post(
        "/api/v1/chat",
        json={
            "message": "Plan me a Rome trip",
            "context": {"destination": "Rome", "days": "4"},
        },
    )

    monkeypatch.setattr(settings, "llm_provider", original_provider)

    assert response.status_code == 503
    assert "Unsupported LLM provider" in response.json()["detail"]


@pytest.mark.asyncio
async def test_generate_chat_reply_returns_fallback_on_timeout(monkeypatch):
    original_provider = settings.llm_provider
    monkeypatch.setattr(settings, "llm_provider", "ollama")

    class FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, *args, **kwargs):
            raise httpx.TimeoutException("timeout")

    monkeypatch.setattr("app.services.llm.httpx.AsyncClient", FakeAsyncClient)

    reply = await generate_chat_reply("Trip help", {"destination": "Lisbon", "days": "3"})

    monkeypatch.setattr(settings, "llm_provider", original_provider)

    assert "trouble reaching the AI model" in reply


@pytest.mark.asyncio
async def test_generate_chat_reply_raises_runtime_error_on_4xx(monkeypatch):
    original_provider = settings.llm_provider
    monkeypatch.setattr(settings, "llm_provider", "ollama")

    class FakeResponse:
        status_code = 400

        def raise_for_status(self):
            request = httpx.Request("POST", "http://localhost:11434/api/chat")
            raise httpx.HTTPStatusError("bad request", request=request, response=self)

        def json(self):
            return {}

    class FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, *args, **kwargs):
            return FakeResponse()

    monkeypatch.setattr("app.services.llm.httpx.AsyncClient", FakeAsyncClient)

    with pytest.raises(RuntimeError) as exc_info:
        await generate_chat_reply("Trip help", {"destination": "Lisbon", "days": "3"})

    monkeypatch.setattr(settings, "llm_provider", original_provider)

    assert "rejected the request" in str(exc_info.value)


@pytest.mark.asyncio
async def test_generate_chat_reply_retries_transient_failure_then_succeeds(monkeypatch):
    original_provider = settings.llm_provider
    monkeypatch.setattr(settings, "llm_provider", "ollama")
    monkeypatch.setattr(settings, "llm_retry_attempts", 2)

    calls = {"count": 0}

    class FakeResponse:
        status_code = 200

        def raise_for_status(self):
            return None

        def json(self):
            return {"message": {"content": "Recovered response"}}

    class FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, *args, **kwargs):
            calls["count"] += 1
            if calls["count"] == 1:
                raise httpx.TimeoutException("timeout")
            return FakeResponse()

    async def fake_sleep(_seconds: float):
        return None

    monkeypatch.setattr("app.services.llm.httpx.AsyncClient", FakeAsyncClient)
    monkeypatch.setattr("app.services.llm.asyncio.sleep", fake_sleep)

    reply = await generate_chat_reply("Trip help", {"destination": "Lisbon", "days": "3"})

    monkeypatch.setattr(settings, "llm_provider", original_provider)

    assert calls["count"] == 2
    assert reply == "Recovered response"


@pytest.mark.asyncio
async def test_generate_chat_reply_applies_guardrails(monkeypatch):
    original_provider = settings.llm_provider
    monkeypatch.setattr(settings, "llm_provider", "ollama")
    monkeypatch.setattr(settings, "llm_max_message_chars", 10)
    monkeypatch.setattr(settings, "llm_max_context_items", 2)
    monkeypatch.setattr(settings, "llm_max_context_value_chars", 6)
    monkeypatch.setattr(settings, "llm_context_allowed_keys", ["destination", "days"])

    captured = {"body": None}

    class FakeResponse:
        status_code = 200

        def raise_for_status(self):
            return None

        def json(self):
            return {"message": {"content": "Guardrails ok"}}

    class FakeAsyncClient:
        def __init__(self, *args, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, *args, **kwargs):
            captured["body"] = kwargs.get("json")
            return FakeResponse()

    monkeypatch.setattr("app.services.llm.httpx.AsyncClient", FakeAsyncClient)

    reply = await generate_chat_reply(
        "  this message should truncate  ",
        {
            "destination": "  tokyo-city  ",
            "days": " 123456789 ",
            "ignored": "must-not-pass",
        },
    )

    monkeypatch.setattr(settings, "llm_provider", original_provider)

    assert reply == "Guardrails ok"
    user_message = captured["body"]["messages"][1]["content"]
    assert "User question: this messa" in user_message
    assert "destination: tokyo-" in user_message
    assert "days: 123456" in user_message
    assert "ignored" not in user_message


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


def test_extract_ollama_reply_rejects_invalid_payload_shape():
    assert _extract_ollama_reply({"message": {"content": 123}}) == ""
    assert _extract_ollama_reply({"not_message": {"content": "hello"}}) == ""


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
