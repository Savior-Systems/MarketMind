from fastapi import APIRouter
from app.api.v1 import auth, brands, content, agents, public_metrics, analytics

api_router = APIRouter()

# Register sub-routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(brands.router, prefix="/brands", tags=["Brands"])
api_router.include_router(content.router, prefix="/content", tags=["Content"])
api_router.include_router(agents.router, prefix="/agents", tags=["Agents"])
api_router.include_router(public_metrics.router, prefix="/public", tags=["Public Metrics"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
