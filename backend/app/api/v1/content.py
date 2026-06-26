from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.content import ContentPiece
from app.models.brand import BrandProfile
from app.schemas.schemas import ContentPieceCreate, ContentPieceResponse

router = APIRouter()

@router.post("/", response_model=ContentPieceResponse, status_code=status.HTTP_201_CREATED)
async def create_content(
    content_in: ContentPieceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Save an AI-crafted or custom content draft."""
    # Verify brand belongs to user
    brand_res = await db.execute(select(BrandProfile).where(
        BrandProfile.id == content_in.brand_id,
        BrandProfile.user_id == current_user.id
    ))
    brand = brand_res.scalars().first()
    if not brand:
        raise HTTPException(status_code=403, detail="Invalid brand profile mapping")

    new_content = ContentPiece(
        brand_id=content_in.brand_id,
        platform=content_in.platform,
        text=content_in.text,
        status=content_in.status,
        scheduled_at=content_in.scheduled_at,
        published_at=content_in.published_at
    )
    db.add(new_content)
    await db.flush()
    return new_content

@router.get("/", response_model=List[ContentPieceResponse])
async def list_content(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all Content Pieces belonging to the user's brands."""
    result = await db.execute(select(ContentPiece).join(BrandProfile).where(
        BrandProfile.user_id == current_user.id
    ))
    return result.scalars().all()
