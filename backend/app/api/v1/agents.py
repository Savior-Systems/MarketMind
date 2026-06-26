from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from celery.result import AsyncResult

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.celery_app import celery_app
from app.models.user import User
from app.models.brand import BrandProfile
from app.models.agent_run import AgentRun
from app.schemas.schemas import AgentRunResponse

# Import Celery tasks
from app.core.tasks import (
    generate_content_task,
    schedule_content_task,
    generate_analytics_task
)

router = APIRouter()

# ==========================================
# Input Validation Schemas
# ==========================================

class ContentGenerateRequest(BaseModel):
    platform: str
    topic: str
    brand_profile_id: int
    tone_override: Optional[str] = None
    num_variations: int = 3

class ContentScheduleRequest(BaseModel):
    user_timezone: str = "UTC"

class AnalyticsGenerateRequest(BaseModel):
    brand_profile_id: int
    date_range: str = "7d"

# ==========================================
# Endpoints
# ==========================================

@router.post("/content/generate", status_code=status.HTTP_202_ACCEPTED)
async def generate_content(
    body: ContentGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Trigger ContentAgent background task to generate marketing variations.
    """
    # Verify brand profile ownership
    brand_res = await db.execute(
        select(BrandProfile).where(
            BrandProfile.id == body.brand_profile_id,
            BrandProfile.user_id == current_user.id
        )
    )
    brand = brand_res.scalars().first()
    if not brand:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized brand profile mapping"
        )

    # Queue Celery task
    task = generate_content_task.delay(
        platform=body.platform,
        topic=body.topic,
        brand_profile_id=body.brand_profile_id,
        tone_override=body.tone_override,
        num_variations=body.num_variations
    )

    return {
        "task_id": task.id,
        "status": "queued",
        "message": "Content generation started"
    }

@router.post("/content/{content_id}/schedule", status_code=status.HTTP_202_ACCEPTED)
async def schedule_content(
    content_id: int,
    body: ContentScheduleRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Trigger SchedulerAgent background task to calculate optimal posting schedules.
    """
    # Verify ContentPiece ownership via BrandProfile relationship
    from app.models.content import ContentPiece
    content_res = await db.execute(
        select(ContentPiece).join(BrandProfile).where(
            ContentPiece.id == content_id,
            BrandProfile.user_id == current_user.id
        )
    )
    piece = content_res.scalars().first()
    if not piece:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content piece not found or unauthorized"
        )

    # Queue Celery task
    task = schedule_content_task.delay(
        content_piece_id=content_id,
        user_timezone=body.user_timezone
    )

    return {
        "task_id": task.id,
        "status": "queued"
    }

@router.post("/analytics/generate", status_code=status.HTTP_202_ACCEPTED)
async def generate_analytics(
    body: AnalyticsGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Trigger AnalyticsAgent background task to compile insights.
    """
    # Verify brand profile ownership
    brand_res = await db.execute(
        select(BrandProfile).where(
            BrandProfile.id == body.brand_profile_id,
            BrandProfile.user_id == current_user.id
        )
    )
    brand = brand_res.scalars().first()
    if not brand:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Unauthorized brand profile mapping"
        )

    # Queue Celery task
    task = generate_analytics_task.delay(
        brand_profile_id=body.brand_profile_id,
        date_range=body.date_range
    )

    return {
        "task_id": task.id,
        "status": "queued"
    }

@router.get("/task/{task_id}")
async def get_task_status(task_id: str):
    """
    Fetch background Celery task result and execution status.
    """
    res = AsyncResult(task_id, app=celery_app)
    
    result_data = None
    error_data = None
    
    if res.ready():
        if res.successful():
            result_data = res.result
        else:
            error_data = str(res.result)

    return {
        "task_id": task_id,
        "status": res.status,
        "result": result_data,
        "error": error_data
    }

@router.get("/runs", response_model=List[AgentRunResponse])
async def list_runs(
    brand_profile_id: Optional[int] = None,
    agent_name: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List historical AgentRun records for the current user's brand profiles.
    """
    # Fetch user brand ids
    brand_query = await db.execute(
        select(BrandProfile.id).where(BrandProfile.user_id == current_user.id)
    )
    user_brand_ids = [row[0] for row in brand_query.all()]

    if not user_brand_ids:
        return []

    # Select base runs
    query = select(AgentRun)

    # Filter by user brand ids to protect user privacy
    if brand_profile_id:
        if brand_profile_id not in user_brand_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Unauthorized access to brand profile runs"
            )
        query = query.where(AgentRun.input_data["brand_profile_id"].as_integer() == brand_profile_id)
    else:
        query = query.where(AgentRun.input_data["brand_profile_id"].as_integer().in_(user_brand_ids))

    # Apply optional agent name filters
    if agent_name:
        query = query.where(AgentRun.agent_name == agent_name)

    # Execute paginated ordering query
    query = query.order_by(AgentRun.started_at.desc()).offset(offset).limit(limit)
    runs_res = await db.execute(query)
    return runs_res.scalars().all()
