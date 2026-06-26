from datetime import datetime
from sqlalchemy import String, Integer, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class DiscordVerification(Base):
    """
    Tracks verified GitHub stargazers on the MarketMind Discord server.
    Used for welcoming, star role assignment, and milestone triggers.
    """
    __tablename__ = "discord_verifications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    discord_user_id: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    github_username: Mapped[str] = mapped_column(String(100), nullable=False)
    github_user_id: Mapped[int] = mapped_column(Integer, nullable=False)
    starred_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    is_founding_member: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
