from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.content import ContentPiece
from app.models.agent_run import AgentRun

router = APIRouter()

@router.get("/savings")
async def get_savings(
    brand_profile_id: int = Query(..., description="Brand Profile ID to filter savings"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Calculate transparent cost savings metrics comparing self-hosted MarketMind
    API costs to standard SaaS platforms (Buffer, Hootsuite, Jasper).
    """
    # 1. Fetch all content pieces for the given brand_profile_id
    content_result = await db.execute(
        select(ContentPiece).where(ContentPiece.brand_id == brand_profile_id)
    )
    content_pieces = content_result.scalars().all()
    brand_content_ids = {p.id for p in content_pieces}
    
    total_pieces = len([p for p in content_pieces if p.status != "draft"])
    
    if total_pieces == 0:
        return {
            "total_pieces": 0,
            "total_tokens": 0,
            "total_cost_usd": 0.0,
            "estimated_saas_cost": 0.0,
            "total_saved": 0.0,
            "savings_percentage": 0.0,
            "message": "Generate some content first to see your savings!"
        }
        
    # 2. Fetch all AgentRun records
    run_result = await db.execute(select(AgentRun))
    all_runs = run_result.scalars().all()
    
    total_tokens = 0
    total_cost_usd = 0.0
    
    for run in all_runs:
        inp = run.input_data or {}
        out = run.output_data or {}
        
        is_match = False
        if inp.get("brand_profile_id") == brand_profile_id:
            is_match = True
        elif inp.get("brand_id") == brand_profile_id:
            is_match = True
        elif inp.get("content_piece_id") in brand_content_ids:
            is_match = True
        else:
            gen_ids = out.get("content_ids", [])
            if any(cid in brand_content_ids for cid in gen_ids):
                is_match = True
                
        if is_match:
            total_tokens += run.tokens_used or 0
            total_cost_usd += run.cost_usd or 0.0
            
    estimated_saas_cost = total_pieces * 0.50
    total_saved = estimated_saas_cost - total_cost_usd
    savings_percentage = (total_saved / estimated_saas_cost * 100) if estimated_saas_cost > 0 else 0
    
    return {
        "total_pieces": total_pieces,
        "total_tokens": total_tokens,
        "total_cost_usd": round(total_cost_usd, 4),
        "estimated_saas_cost": round(estimated_saas_cost, 2),
        "total_saved": round(total_saved, 4),
        "savings_percentage": round(savings_percentage, 2)
    }
