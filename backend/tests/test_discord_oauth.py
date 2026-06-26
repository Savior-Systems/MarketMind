from unittest.mock import patch, MagicMock
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import get_db
from app.models.discord_verification import DiscordVerification
from sqlalchemy.future import select

@pytest.mark.asyncio
async def test_github_callback_success(db_session):
    # Setup OAuth params
    code = "mock_code"
    discord_user_id = "1234567890"

    # Mock responses for httpx
    # 1. token response
    mock_token_res = MagicMock()
    mock_token_res.status_code = 200
    mock_token_res.json.return_value = {"access_token": "mock_access_token"}

    # 2. user info response
    mock_user_res = MagicMock()
    mock_user_res.status_code = 200
    mock_user_res.json.return_value = {"login": "octocat", "id": 5832347}

    # 3. star check response (204 means starred)
    mock_star_res = MagicMock()
    mock_star_res.status_code = 204

    # 4. repo detail response (for total star check)
    mock_repo_res = MagicMock()
    mock_repo_res.status_code = 200
    mock_repo_res.json.return_value = {"stargazers_count": 500}

    # Helper mock class to return specific mocks for specific URLs
    class MockAsyncClient:
        async def __aenter__(self):
            return self
        async def __aexit__(self, exc_type, exc_val, exc_tb):
            pass
        async def post(self, url, *args, **kwargs):
            if "oauth/access_token" in url:
                return mock_token_res
            return MagicMock()
        async def get(self, url, *args, **kwargs):
            if "api.github.com/user/starred" in url:
                return mock_star_res
            elif "api.github.com/user" in url:
                return mock_user_res
            elif "api.github.com/repos" in url:
                return mock_repo_res
            return MagicMock()

    # Override get_db
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    try:
        with patch("httpx.AsyncClient", return_value=MockAsyncClient()):
            client = TestClient(app)
            response = client.get(f"/api/v1/auth/github/callback?code={code}&discord_user_id={discord_user_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["starred"] is True
            assert data["github_username"] == "octocat"
            assert data["is_founding"] is True
            assert data["total_stars"] == 500

            # Verify in DB
            result = await db_session.execute(
                select(DiscordVerification).where(DiscordVerification.discord_user_id == discord_user_id)
            )
            v = result.scalars().first()
            assert v is not None
            assert v.github_username == "octocat"
            assert v.github_user_id == 5832347
            assert v.is_founding_member is True
    finally:
        app.dependency_overrides.clear()
