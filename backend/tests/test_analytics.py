import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.security import create_access_token
from app.models.user import User
from app.models.brand import BrandProfile
from app.models.content import ContentPiece
from app.models.agent_run import AgentRun
from app.core.database import get_db

@pytest.mark.asyncio
async def test_get_savings(db_session):
    # 1. Create test user
    user = User(
        email="test@marketmind.ai", 
        hashed_password="hashed_password_placeholder", 
        is_active=True
    )
    db_session.add(user)
    await db_session.flush()

    # 2. Create test brand profile
    brand = BrandProfile(
        user_id=user.id, 
        name="Test Brand", 
        voice_description="Engaging", 
        tone="friendly", 
        target_audience="devs", 
        keywords=[]
    )
    db_session.add(brand)
    await db_session.flush()

    # 3. Create test content pieces (1 scheduled, 1 draft)
    piece1 = ContentPiece(
        brand_id=brand.id, 
        platform="twitter", 
        text="Hello world", 
        status="scheduled"
    )
    piece2 = ContentPiece(
        brand_id=brand.id, 
        platform="linkedin", 
        text="Deep post", 
        status="draft"
    )
    db_session.add(piece1)
    db_session.add(piece2)
    await db_session.flush()

    # 4. Create test agent run associated with the brand
    run1 = AgentRun(
        agent_name="ContentAgent",
        status="success",
        input_data={"brand_profile_id": brand.id, "platform": "twitter"},
        output_data={"content_ids": [piece1.id]},
        tokens_used=500,
        cost_usd=0.01
    )
    db_session.add(run1)
    await db_session.flush()
    await db_session.commit()

    # 5. Generate Access Token
    token = create_access_token(data={"sub": str(user.id)})

    # 6. Override DB Dependency
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    try:
        client = TestClient(app)
        response = client.get(
            f"/api/v1/analytics/savings?brand_profile_id={brand.id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_pieces"] == 1  # Only piece1 is counted because piece2 is a draft
        assert data["total_tokens"] == 500
        assert data["total_cost_usd"] == 0.01
        assert data["estimated_saas_cost"] == 0.50
        assert data["total_saved"] == 0.49
        assert data["savings_percentage"] == 98.0
    finally:
        app.dependency_overrides.clear()
