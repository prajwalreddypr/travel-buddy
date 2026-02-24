"""Tests for chatbot endpoints and behavior."""

from fastapi.testclient import TestClient

from app.main import app


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
