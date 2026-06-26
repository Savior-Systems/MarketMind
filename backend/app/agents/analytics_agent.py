import json
import re
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from sqlalchemy.future import select

from app.agents.base import BaseAgent, AgentOutput
from app.models.content import ContentPiece

logger = logging.getLogger("marketmind.agents")

class Insight(BaseModel):
    """
    Validation schema for an individual analytics insight.
    """
    title: str
    description: str
    priority: str  # 'low' | 'medium' | 'high'

class Recommendation(BaseModel):
    """
    Validation schema for an individual action recommendation.
    """
    action: str
    reasoning: str
    impact: str  # 'low' | 'medium' | 'high'

class AnalyticsOutput(BaseModel):
    """
    Validation schema for AnalyticsAgent output.
    """
    summary: str
    insights: List[Insight] = Field(default_factory=list)
    recommendations: List[Recommendation] = Field(default_factory=list)
    consistency_score: int

class AnalyticsAgent(BaseAgent):
    """
    AnalyticsAgent aggregates content metadata and computes
    actionable insights for user campaigns.
    """
    async def execute(self, brand_profile_id: int, date_range: str = "7d") -> AgentOutput:
        """
        Gathers content pieces in the specified range and creates an AI summary.
        """
        input_data = {
            "brand_profile_id": brand_profile_id,
            "date_range": date_range
        }

        try:
            # 1. Determine date range filter
            days_count = 7
            if date_range == "30d":
                days_count = 30
            elif date_range == "90d":
                days_count = 90

            start_date = datetime.utcnow() - timedelta(days=days_count)

            # 2. Fetch campaign content pieces
            result = await self.db_session.execute(
                select(ContentPiece)
                .where(ContentPiece.brand_id == brand_profile_id)
                .where(ContentPiece.created_at >= start_date)
            )
            content_pieces = result.scalars().all()

            # 3. Guard against empty data
            if not content_pieces:
                logger.info(f"No ContentPiece records found in the last {days_count} days for brand ID {brand_profile_id}.")
                return AgentOutput(
                    success=True,
                    data={
                        "message": "Not enough data yet. Publish some content first!",
                        "total_posts": 0,
                        "platform_breakdown": {},
                        "status_breakdown": {},
                        "average_posts_per_day": 0.0,
                        "consistency_score": 0,
                        "summary": "No campaign content found in the designated date range.",
                        "insights": [],
                        "recommendations": []
                    }
                )

            # 4. Compute statistics
            total_posts = len(content_pieces)
            
            platform_breakdown = {}
            status_breakdown = {}
            active_dates = set()

            for piece in content_pieces:
                # Platforms count
                plat = piece.platform.lower()
                platform_breakdown[plat] = platform_breakdown.get(plat, 0) + 1
                
                # Status count
                status = piece.status.lower()
                status_breakdown[status] = status_breakdown.get(status, 0) + 1
                
                # Active dates tracking
                active_dates.add(piece.created_at.date())

            average_posts_per_day = round(total_posts / days_count, 2)
            
            # Calculate consistency score
            active_days_count = len(active_dates)
            consistency_score = int((active_days_count / days_count) * 100)
            if consistency_score > 100:
                consistency_score = 100

            # 5. Extract flavor samples
            flavor_samples = []
            for piece in content_pieces[:5]:
                snippet = piece.text[:100] + "..." if len(piece.text) > 100 else piece.text
                flavor_samples.append(f"Platform ({piece.platform}): '{snippet}'")

            # 6. Build prompts
            system_prompt = (
                "You are a social media marketing analytics expert.\n"
                "Given historical post metadata and channel statistics, provide a high-level summary, "
                "identify top insights, and list actionable priorities to grow future engagement.\n"
                "CRITICAL: Return ONLY a valid JSON object matching this schema with no markdown formatting:\n"
                '{"summary": "A 3-sentence summary of the marketing activity.", '
                '"insights": [{"title": "insight title", "description": "insight detail", "priority": "high"}], '
                '"recommendations": [{"action": "recommendation target", "reasoning": "reasoning explanation", "impact": "medium"}], '
                '"consistency_score": 85}'
            )

            user_prompt = (
                f"Campaign Statistics over last {days_count} days:\n"
                f"- Total Posts Generated: {total_posts}\n"
                f"- Average Posts per Day: {average_posts_per_day}\n"
                f"- Active posting days: {active_days_count} of {days_count} days\n"
                f"- Calculated Consistency Score: {consistency_score}%\n"
                f"- Platforms breakdown: {json.dumps(platform_breakdown)}\n"
                f"- Statuses breakdown: {json.dumps(status_breakdown)}\n\n"
                "Sample of generated content posts:\n"
                + "\n".join(flavor_samples)
                + "\n\nProvide the summary, top 3 insights, and 5 actionable recommendations in the requested JSON structure."
            )

            # 7. Call LLM
            logger.info("Executing AnalyticsAgent LLM call...")
            raw_response = await self._retry_call(system_prompt=system_prompt, user_prompt=user_prompt)

            # 8. Parse JSON response robustly
            try:
                parsed_data = self._parse_json_response(raw_response)
                validated_output = AnalyticsOutput.model_validate(parsed_data)
            except Exception as e:
                logger.warning(f"Failed to parse LLM response for analytics; applying text fallback: {e}")
                # Fallback parameters
                validated_output = AnalyticsOutput(
                    summary=raw_response[:300] if raw_response else "Failed to parse LLM analysis response.",
                    insights=[],
                    recommendations=[],
                    consistency_score=consistency_score
                )

            # 9. Format output data combining stats and LLM evaluations
            output_data = {
                "summary": validated_output.summary,
                "insights": [i.model_dump() for i in validated_output.insights],
                "recommendations": [r.model_dump() for r in validated_output.recommendations],
                "total_posts": total_posts,
                "platform_breakdown": platform_breakdown,
                "status_breakdown": status_breakdown,
                "average_posts_per_day": average_posts_per_day,
                "consistency_score": consistency_score
            }

            # 10. Log run in database
            await self.log_run(
                agent_name="AnalyticsAgent",
                input_data=input_data,
                output_data=output_data,
                tokens=self._last_tokens_used,
                cost=self._last_cost_usd
            )

            return AgentOutput(
                success=True,
                data=output_data,
                tokens_used=self._last_tokens_used,
                cost_usd=self._last_cost_usd,
                execution_time_seconds=self._get_duration()
            )

        except Exception as e:
            logger.error(f"AnalyticsAgent execution failed: {e}")
            return AgentOutput(
                success=False,
                error_message=str(e),
                execution_time_seconds=self._get_duration()
            )

    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        """Parses JSON strings from LLM output robustly."""
        cleaned = text.strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        match = re.search(r'```json\s*(.*?)\s*```', cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        first_brace = cleaned.find('{')
        last_brace = cleaned.rfind('}')
        if first_brace != -1 and last_brace != -1:
            try:
                return json.loads(cleaned[first_brace:last_brace+1])
            except json.JSONDecodeError:
                pass

        raise ValueError("Could not extract JSON.")

    def _get_duration(self) -> float:
        import time
        return round(time.time() - self._started_at, 2)
