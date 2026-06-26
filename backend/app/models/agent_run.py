from datetime import datetime
from typing import Optional, Any
from sqlalchemy import String, Text, DateTime, JSON, Integer, Float
from sqlalchemy.orm import Mapped, mapped_column
from app.core.database import Base

class AgentRun(Base):
    """
    AgentRun configuration tracking executing swarm agents,
    consumed tokens, and billing statistics in real-time.
    """
    __tablename__ = "agent_runs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    agent_name: Mapped[str] = mapped_column(String(100), nullable=False)
    
    # Status (running, completed, failed)
    status: Mapped[str] = mapped_column(String(50), default="running", nullable=False)
    
    input_data: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    output_data: Mapped[Optional[Any]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    tokens_used: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    
    started_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
