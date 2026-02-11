from fastapi.testclient import TestClient
from app.main import app
import datetime


client = TestClient(app)


def test_quote_basic():
    payload = {
        "origin": "Berlin",
        "destination": "Paris",
        "start_date": (datetime.date.today() + datetime.timedelta(days=30)).isoformat(),
        "end_date": (datetime.date.today() + datetime.timedelta(days=33)).isoformat(),
        "travelers": 2,
    }
    r = client.post("/api/v1/quote", json=payload)
    assert r.status_code == 200
    data = r.json()
    assert "trip_days" in data
    assert "breakdown" in data
    assert data["breakdown"]["total"] > 0
