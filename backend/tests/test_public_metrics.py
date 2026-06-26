from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_metrics():
    response = client.get("/api/v1/public/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "github" in data
    assert "stars" in data["github"]
    assert "growth" in data
    assert "milestones" in data
    assert "community" in data
    assert "savings" in data

def test_get_badge():
    response = client.get("/api/v1/public/badge.svg")
    assert response.status_code == 200
    assert "image/svg+xml" in response.headers["content-type"]
    assert "MarketMind" in response.text
    assert "<svg" in response.text

def test_get_stargazers():
    response = client.get("/api/v1/public/stargazers")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    if len(data) > 0:
        assert "login" in data[0]
        assert "avatar_url" in data[0]
        assert "html_url" in data[0]
