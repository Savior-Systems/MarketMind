from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()

@router.post("/content/generate")
async def generate_content(
    brand_profile_id: int,
    platform: str,
    topic: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Trigger ContentAgent async execution."""
    return {"task_id": "dummy_task_id_content", "status": "queued"}

@router.get("/task/{task_id}")
async def get_task_status(task_id: str, current_user: User = Depends(get_current_user)):
    """Retrieve async tasks execution status."""
    return {"task_id": task_id, "status": "PENDING"}
