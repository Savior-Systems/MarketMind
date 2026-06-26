from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import String, Text, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.core.database import Base

if TYPE_CHECKING:
    from app.models.brand import BrandProfile

class ContentPiece(Base):
    """
    ContentPiece configuration mapping generated marketing copy
    to targeted social media channels and schedules.
    """
    __tablename__ = "content_pieces"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    brand_id: Mapped[int] = mapped_column(ForeignKey("brand_profiles.id", ondelete="CASCADE"), nullable=False)
    
    # Platform target (twitter, linkedin, instagram, facebook)
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    
    # Generated content copy
    text: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Status (draft, scheduled, published, failed)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)
    
    scheduled_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    brand: Mapped["BrandProfile"] = relationship("BrandProfile", back_populates="content_pieces")
