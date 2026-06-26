from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api.v1.router import api_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan events mapping DB connection checks, Celery status,
    and agent ecosystem triggers on boot/shutdown.
    """
    # Startup operations (e.g. log initial settings/connections)
    yield
    # Shutdown operations (e.g. cleanup connections)

app = FastAPI(
    title="MarketMind API Core",
    description="Backend services powering AI coding agents and social campaigns.",
    version="0.1.0",
    lifespan=lifespan
)

# CORS Middleware Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global Exception Handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Log uncaught execution exceptions and return standard error JSON."""
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred. Please contact system admin."}
    )

# Core endpoints
@app.get("/health", status_code=status.HTTP_200_OK, tags=["System Check"])
async def health_check():
    """System health check endpoint for deployments and monitoring."""
    return {
        "status": "ok",
        "version": "0.1.0",
        "narrative": "Built By One. Owned By Everyone."
    }

# Register API v1 routers
app.include_router(api_router, prefix="/api/v1")
