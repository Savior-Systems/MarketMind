import json
import re
import logging
import datetime
from zoneinfo import ZoneInfo
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from app.agents.base import BaseAgent, AgentOutput
from app.models.content import ContentPiece

logger = logging.getLogger("marketmind.agents")

class ScheduleOutput(BaseModel):
    """
    Validation schema for SchedulerAgent output.
    """
    optimal_time: datetime.datetime
    confidence: float
    reasoning: str
    alternatives: List[datetime.datetime] = Field(default_factory=list)

class SchedulerAgent(BaseAgent):
    """
    SchedulerAgent evaluates content piece text, channel targets,
    and returns optimized calendar posting schedules.
    """
    # Hardcoded optimal posting time windows (in local time) per platform
    OPTIMAL_WINDOWS: Dict[str, List[tuple]] = {
        "twitter": [
            ("Tuesday", 9, 0), ("Tuesday", 15, 0), 
            ("Wednesday", 9, 0), ("Wednesday", 15, 0), 
            ("Thursday", 9, 0)
        ],
        "linkedin": [
            ("Tuesday", 8, 0), ("Tuesday", 12, 0), 
            ("Wednesday", 8, 0), ("Wednesday", 12, 0), 
            ("Thursday", 8, 0)
        ],
        "instagram": [
            ("Monday", 11, 0), ("Monday", 14, 0), ("Monday", 17, 0),
            ("Tuesday", 11, 0), ("Tuesday", 14, 0), ("Tuesday", 17, 0),
            ("Wednesday", 11, 0), ("Wednesday", 14, 0), ("Wednesday", 17, 0),
            ("Thursday", 11, 0), ("Thursday", 14, 0), ("Thursday", 17, 0),
            ("Friday", 11, 0), ("Friday", 14, 0), ("Friday", 17, 0)
        ],
        "facebook": [
            ("Wednesday", 13, 0), ("Wednesday", 16, 0),
            ("Thursday", 13, 0), ("Thursday", 16, 0),
            ("Friday", 13, 0), ("Friday", 16, 0)
        ]
    }

    async def execute(self, content_piece_id: int, user_timezone: str = "UTC") -> AgentOutput:
        """
        Calculates the next optimal posting date/time for the specified ContentPiece.
        """
        input_data = {
            "content_piece_id": content_piece_id,
            "user_timezone": user_timezone
        }

        try:
            # 1. Retrieve the ContentPiece
            content_piece = await self.db_session.get(ContentPiece, content_piece_id)
            if not content_piece:
                logger.error(f"ContentPiece with ID {content_piece_id} not found.")
                return AgentOutput(success=False, error_message="Content piece not found")

            platform = content_piece.platform.lower()
            content_text = content_piece.text

            # 2. Get platform-specific optimal candidates
            windows = self.OPTIMAL_WINDOWS.get(platform, [("Monday", 9, 0)]) # default fallback window
            candidates = self._calculate_next_occurrences(windows, user_timezone)

            if not candidates:
                raise ValueError("Could not compute posting candidate datetimes.")

            # Format candidates as ISO strings for the prompt
            candidates_iso = [c.isoformat() for c in candidates]

            # 3. Assemble prompts
            system_prompt = (
                "You are a social media scheduling expert.\n"
                "Given a social media post and target platform, evaluate the text style/length "
                "and select the single best posting slot from the provided options.\n"
                "Provide a confidence rating (0-1), a technical explanation of your choice, "
                "and list 2 other candidate slots as alternatives.\n"
                "CRITICAL: Return ONLY a valid JSON object matching this schema with no markdown formatting:\n"
                '{"chosen_time_str": "ISO format datetime", "confidence": 0.85, "reasoning": "text explanation", "alternatives": ["ISO format datetime", "ISO format datetime"]}'
            )

            user_prompt = (
                f"Platform: {platform.upper()}\n"
                f"Content: {content_text}\n"
                f"Candidate Time Slots (User Timezone: {user_timezone}):\n"
                f"{json.dumps(candidates_iso, indent=2)}\n\n"
                "Select the best slot from the list and return JSON."
            )

            # 4. Call LLM
            logger.info("Executing SchedulerAgent LLM choice call...")
            raw_response = await self._retry_call(system_prompt=system_prompt, user_prompt=user_prompt)

            # 5. Parse output with fallback safety
            try:
                parsed_data = self._parse_json_response(raw_response)
                optimal_time = datetime.datetime.fromisoformat(parsed_data["chosen_time_str"])
                confidence = float(parsed_data["confidence"])
                reasoning = parsed_data["reasoning"]
                alternatives = [datetime.datetime.fromisoformat(a) for a in parsed_data.get("alternatives", [])]
            except Exception as e:
                logger.warning(f"Failed to parse LLM response for scheduler; applying static fallback: {e}")
                # Fallback parameters
                optimal_time = candidates[0]
                confidence = 0.5
                reasoning = "Static fallback applied: LLM response could not be parsed."
                alternatives = candidates[1:3] if len(candidates) > 2 else candidates[1:]

            # 6. Validate with Pydantic
            validated_output = ScheduleOutput(
                optimal_time=optimal_time,
                confidence=confidence,
                reasoning=reasoning,
                alternatives=alternatives
            )

            # 7. Update database record
            content_piece.scheduled_at = validated_output.optimal_time
            if content_piece.status == "draft":
                content_piece.status = "scheduled"

            await self.db_session.flush()

            # 8. Log the execution run
            output_data = validated_output.model_dump(mode="json")
            await self.log_run(
                agent_name="SchedulerAgent",
                input_data=input_data,
                output_data=output_data,
                tokens=self._last_tokens_used,
                cost=self._last_cost_usd
            )

            return AgentOutput(
                success=True,
                data={
                    "schedule": output_data,
                    "content_id": content_piece_id
                },
                tokens_used=self._last_tokens_used,
                cost_usd=self._last_cost_usd,
                execution_time_seconds=self._get_duration()
            )

        except Exception as e:
            logger.error(f"SchedulerAgent execution failed: {e}")
            return AgentOutput(
                success=False,
                error_message=str(e),
                execution_time_seconds=self._get_duration()
            )

    def _calculate_next_occurrences(self, windows: List[tuple], tz_str: str) -> List[datetime.datetime]:
        """
        Calculates the next occurrences of target weekday/hours starting from the current time.
        """
        tz = ZoneInfo(tz_str)
        now = datetime.datetime.now(tz)
        candidates = []

        day_mapping = {
            "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
            "friday": 4, "saturday": 5, "sunday": 6
        }

        for day_name, hour, minute in windows:
            target_weekday = day_mapping[day_name.lower()]
            
            # Start with today at the target hour/minute in target timezone
            candidate = now.replace(hour=hour, minute=minute, second=0, microsecond=0)
            
            # Calculate difference in days
            days_ahead = target_weekday - now.weekday()
            if days_ahead < 0 or (days_ahead == 0 and now.time() >= candidate.time()):
                days_ahead += 7
                
            candidate += datetime.timedelta(days=days_ahead)
            candidates.append(candidate)

        # Sort chronologically
        candidates.sort()
        return candidates

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
