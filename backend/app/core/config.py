from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    """
    MarketMind Core Application Configuration.
    Enforces 'Built By One. Owned By Everyone.' constraints.
    """
    # Environment Settings
    ENVIRONMENT: str = Field(default="development", validation_alias="ENVIRONMENT")
    SECRET_KEY: str = Field(default="super_secret_marketmind_development_key_change_me", validation_alias="SECRET_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # Database Settings
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/marketmind",
        validation_alias="DATABASE_URL"
    )
    
    # Redis & Celery Settings
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        validation_alias="REDIS_URL"
    )
    
    # LLM Provider Key Configuration
    OPENAI_API_KEY: str = Field(default="", validation_alias="OPENAI_API_KEY")
    GEMINI_API_KEY: str = Field(default="", validation_alias="GEMINI_API_KEY")
    CLAUDE_API_KEY: str = Field(default="", validation_alias="CLAUDE_API_KEY")
    
    # GitHub Integration
    GITHUB_REPO: str = Field(default="owner/repo", validation_alias="GITHUB_REPO")
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://localhost:3000",
        "http://127.0.0.1:3000",
        "https://*.marketmind.ai"
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
