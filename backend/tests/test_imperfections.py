from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_imperfections():
    response = client.get("/api/v1/public/imperfections")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    # Check that it contains fields of the first mock item
    item = data[0]
    assert "title" in item
    assert "url" in item
    assert "category" in item
    assert "status" in item
    assert "reactions_count" in item
    assert "created_at" in item
