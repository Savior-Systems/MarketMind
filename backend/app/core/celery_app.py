from celery import Celery
from app.core.config import settings

# Celery Application Setup using Redis broker and backend
celery_app = Celery(
    "marketmind_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

# Standard configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour maximum execution
)

# Autodiscover tasks from app.core.tasks
celery_app.autodiscover_tasks(["app.core"])
