from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import timedelta

from app.core.database import get_db
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user
)
from app.models.user import User
from app.schemas.schemas import UserCreate, UserResponse, Token

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new developer owner on the MarketMind instance."""
    result = await db.execute(select(User).where(User.email == user_in.email))
    existing_user = result.scalars().first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    new_user = User(
        email=user_in.email,
        hashed_password=hash_password(user_in.password),
        is_active=True
    )
    db.add(new_user)
    await db.flush() # flush to generate ID
    return new_user

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    """Authenticate and obtain JWT access token."""
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def read_current_user(current_user: User = Depends(get_current_user)):
    """Get active user profile details."""
    return current_user

import httpx
import os
from fastapi import Query
from app.models.discord_verification import DiscordVerification

@router.get("/github/callback")
async def github_callback(
    code: str,
    discord_user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Callback endpoint for GitHub OAuth. Exchanges authorization code for access token,
    checks if user has starred Savior-Systems/MarketMind, and stores the status in the DB.
    """
    client_id = os.getenv("GITHUB_CLIENT_ID")
    client_secret = os.getenv("GITHUB_CLIENT_SECRET")
    repo = os.getenv("GITHUB_REPO", "Savior-Systems/MarketMind")
    if repo == "owner/repo" or not repo:
        repo = "Savior-Systems/MarketMind"

    # 1. Exchange code for GitHub access token
    async with httpx.AsyncClient(timeout=10.0) as client:
        token_res = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": client_id,
                "client_secret": client_secret,
                "code": code
            },
            headers={"Accept": "application/json"}
        )
        if token_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange OAuth code")
        
        token_data = token_res.json()
        access_token = token_data.get("access_token")
        if not access_token:
            raise HTTPException(status_code=400, detail="Invalid OAuth code or credentials")

        # 2. Get user info
        user_res = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "User-Agent": "MarketMind-App"
            }
        )
        if user_res.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to retrieve GitHub user details")
        
        user_data = user_res.json()
        github_username = user_data.get("login")
        github_user_id = user_data.get("id")

        # 3. Check if user starred the repository
        star_res = await client.get(
            f"https://api.github.com/user/starred/{repo}",
            headers={
                "Authorization": f"Bearer {access_token}",
                "User-Agent": "MarketMind-App"
            }
        )
        
        # 4. If starred:
        if star_res.status_code == 204:
            # Check total stars on the repository to verify founding member status
            repo_res = await client.get(
                f"https://api.github.com/repos/{repo}",
                headers={"User-Agent": "MarketMind-App"}
            )
            total_stars = 0
            if repo_res.status_code == 200:
                total_stars = repo_res.json().get("stargazers_count", 0)
            
            is_founding = total_stars <= 1000

            # Save/update DiscordVerification record
            verification_query = await db.execute(
                select(DiscordVerification).where(DiscordVerification.discord_user_id == discord_user_id)
            )
            verification = verification_query.scalars().first()

            if not verification:
                verification = DiscordVerification(
                    discord_user_id=discord_user_id,
                    github_username=github_username,
                    github_user_id=github_user_id,
                    is_founding_member=is_founding
                )
                db.add(verification)
            else:
                verification.github_username = github_username
                verification.github_user_id = github_user_id
                verification.is_founding_member = is_founding
            
            await db.flush()
            await db.commit()

            return {
                "starred": True,
                "github_username": github_username,
                "is_founding": is_founding,
                "total_stars": total_stars
            }
        else:
            return {
                "starred": False,
                "message": "Please star first!",
                "repo_url": f"https://github.com/{repo}"
            }

@router.get("/discord/status")
async def get_discord_status(
    discord_user_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Check if the given Discord User ID has been verified as a repo stargazer.
    """
    result = await db.execute(
        select(DiscordVerification).where(DiscordVerification.discord_user_id == discord_user_id)
    )
    verification = result.scalars().first()
    if verification:
        return {
            "verified": True,
            "github_username": verification.github_username,
            "is_founding_member": verification.is_founding_member
        }
    return {"verified": False}
