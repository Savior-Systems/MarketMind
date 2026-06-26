from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.brand import BrandProfile
from app.schemas.schemas import BrandProfileCreate, BrandProfileResponse

router = APIRouter()

@router.post("/", response_model=BrandProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_brand(
    brand_in: BrandProfileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new Brand Profile configuration."""
    new_brand = BrandProfile(
        user_id=current_user.id,
        name=brand_in.name,
        voice_description=brand_in.voice_description,
        tone=brand_in.tone,
        target_audience=brand_in.target_audience,
        keywords=brand_in.keywords
    )
    db.add(new_brand)
    await db.flush()
    return new_brand

@router.get("/", response_model=List[BrandProfileResponse])
async def list_brands(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all Brand Profiles belonging to the user."""
    result = await db.execute(select(BrandProfile).where(BrandProfile.user_id == current_user.id))
    return result.scalars().all()

@router.get("/{brand_id}", response_model=BrandProfileResponse)
async def get_brand(
    brand_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Retrieve details of a single Brand Profile."""
    result = await db.execute(select(BrandProfile).where(
        BrandProfile.id == brand_id,
        BrandProfile.user_id == current_user.id
    ))
    brand = result.scalars().first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand profile not found")
    return brand

@router.delete("/{brand_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_brand(
    brand_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Remove a Brand Profile."""
    result = await db.execute(select(BrandProfile).where(
        BrandProfile.id == brand_id,
        BrandProfile.user_id == current_user.id
    ))
    brand = result.scalars().first()
    if not brand:
        raise HTTPException(status_code=404, detail="Brand profile not found")
    await db.delete(brand)
    return
