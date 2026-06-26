from datetime import datetime
from typing import Optional, List, Any
from pydantic import BaseModel, EmailStr, Field

# ==========================================
# Authentication & User Schemas
# ==========================================

class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    user_id: Optional[str] = None

# ==========================================
# BrandProfile Schemas
# ==========================================

class BrandProfileBase(BaseModel):
    name: str
    voice_description: str
    tone: str
    target_audience: str
    keywords: Optional[List[str]] = None

class BrandProfileCreate(BrandProfileBase):
    pass

class BrandProfileResponse(BrandProfileBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ==========================================
# ContentPiece Schemas
# ==========================================

class ContentPieceBase(BaseModel):
    platform: str
    text: str
    status: str = "draft"
    scheduled_at: Optional[datetime] = None
    published_at: Optional[datetime] = None

class ContentPieceCreate(ContentPieceBase):
    brand_id: int

class ContentPieceResponse(ContentPieceBase):
    id: int
    brand_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# ==========================================
# AgentRun Schemas
# ==========================================

class AgentRunBase(BaseModel):
    agent_name: str
    status: str
    input_data: Optional[Any] = None
    output_data: Optional[Any] = None
    error_message: Optional[str] = None
    tokens_used: int = 0
    cost_usd: float = 0.0

class AgentRunResponse(AgentRunBase):
    id: int
    started_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
