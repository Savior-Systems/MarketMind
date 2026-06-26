import asyncio
import logging
from typing import Optional, Dict, Any

from app.core.celery_app import celery_app
from app.core.database import SessionLocal

logger = logging.getLogger("marketmind.tasks")

@celery_app.task(name="generate_content")
def generate_content_task(
    platform: str,
    topic: str,
    brand_profile_id: int,
    tone_override: Optional[str] = None,
    num_variations: int = 3
) -> Dict[str, Any]:
    """
    Celery background task running ContentAgent to generate social drafts.
    Runs inside a synchronous task, wrapping async agent executions.
    """
    async def _execute():
        async with SessionLocal() as db:
            from app.agents.content_agent import ContentAgent
            agent = ContentAgent(db_session=db, brand_profile_id=brand_profile_id)
            result = await agent.execute(
                platform=platform,
                topic=topic,
                tone_override=tone_override,
                num_variations=num_variations
            )
            return result.model_dump()

    try:
        logger.info(f"Starting ContentAgent Celery task for brand {brand_profile_id}...")
        return asyncio.run(_execute())
    except Exception as e:
        logger.error(f"Celery task generate_content failed: {e}")
        return {"success": False, "error_message": str(e)}

@celery_app.task(name="schedule_content")
def schedule_content_task(
    content_piece_id: int,
    user_timezone: str = "UTC"
) -> Dict[str, Any]:
    """
    Celery background task running SchedulerAgent to select optimal posting datetimes.
    """
    async def _execute():
        async with SessionLocal() as db:
            from app.agents.scheduler_agent import SchedulerAgent
            agent = SchedulerAgent(db_session=db)
            result = await agent.execute(
                content_piece_id=content_piece_id,
                user_timezone=user_timezone
            )
            return result.model_dump()

    try:
        logger.info(f"Starting SchedulerAgent Celery task for content piece {content_piece_id}...")
        return asyncio.run(_execute())
    except Exception as e:
        logger.error(f"Celery task schedule_content failed: {e}")
        return {"success": False, "error_message": str(e)}

@celery_app.task(name="generate_analytics")
def generate_analytics_task(
    brand_profile_id: int,
    date_range: str = "7d"
) -> Dict[str, Any]:
    """
    Celery background task running AnalyticsAgent to generate insights.
    """
    async def _execute():
        async with SessionLocal() as db:
            from app.agents.analytics_agent import AnalyticsAgent
            agent = AnalyticsAgent(db_session=db)
            result = await agent.execute(
                brand_profile_id=brand_profile_id,
                date_range=date_range
            )
            return result.model_dump()

    try:
        logger.info(f"Starting AnalyticsAgent Celery task for brand {brand_profile_id}...")
        return asyncio.run(_execute())
    except Exception as e:
        logger.error(f"Celery task generate_analytics failed: {e}")
        return {"success": False, "error_message": str(e)}
