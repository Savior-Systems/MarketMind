import json
import re
import logging
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

from app.agents.base import BaseAgent, AgentOutput
from app.models.content import ContentPiece

logger = logging.getLogger("marketmind.agents")

class ContentVariation(BaseModel):
    """
    Validation schema for an individual generated content variation.
    """
    text: str
    hashtags: List[str] = Field(default_factory=list)
    character_count: int
    suggested_posting_time: str
    platform_warnings: List[str] = Field(default_factory=list)

class ContentOutput(BaseModel):
    """
    Collection wrapper for generated content variations.
    """
    variations: List[ContentVariation]

class ContentAgent(BaseAgent):
    """
    ContentAgent generates platform-specific marketing variations
    aligned with active brand profile tones.
    """
    async def execute(
        self,
        platform: str,
        topic: str,
        tone_override: Optional[str] = None,
        num_variations: int = 3
    ) -> AgentOutput:
        """
        Executes the content generation workflow.
        Generates num_variations posts tailored for platform.
        """
        input_data = {
            "platform": platform,
            "topic": topic,
            "tone_override": tone_override,
            "num_variations": num_variations,
            "brand_profile_id": self.brand_profile_id
        }

        try:
            # 1. Fetch brand context
            brand_context = await self.get_brand_context()

            # 2. Build system prompt based on platform guidelines
            system_prompt = f"You are an expert social media copywriter and content strategist.\n"
            system_prompt += f"Using the following brand context rules, generate high-converting copy:\n"
            system_prompt += f"{brand_context}\n\n"
            system_prompt += f"Platform requirements for {platform.upper()}:\n"

            platform_lower = platform.lower()
            if platform_lower in ["twitter", "x"]:
                system_prompt += (
                    "- MAXIMUM 280 characters. Be concise.\n"
                    "- Punchy, engaging hook, emoji-friendly.\n"
                    "- Provide 3-5 relevant hashtags.\n"
                )
            elif platform_lower == "linkedin":
                system_prompt += (
                    "- Professional, authoritative, and educational tone.\n"
                    "- ~1300 characters is optimal. Use whitespace/line breaks.\n"
                    "- Provide 3-5 relevant hashtags.\n"
                )
            elif platform_lower == "instagram":
                system_prompt += (
                    "- Casual, engaging, visual hooks, and heavy emoji usage.\n"
                    "- Provide a comment-block containing 20-30 relevant hashtags.\n"
                )
            elif platform_lower == "facebook":
                system_prompt += (
                    "- Conversational, community-oriented, and open-ended.\n"
                    "- Medium length. Can include links/actions.\n"
                    "- Provide 2-4 relevant hashtags.\n"
                )
            else:
                system_prompt += "- General engaging copy with platform appropriate formatting.\n"

            if tone_override:
                system_prompt += f"\nTone Override: You MUST write strictly in a '{tone_override}' tone."

            # Enforce JSON layout output
            system_prompt += (
                "\nCRITICAL: Return ONLY a valid JSON object matching this schema. "
                "Do not add any preamble, markdown code wrappers, or postscript text: "
                '{"variations": [{"text": "...", "hashtags": ["tag1", "tag2"], "character_count": 0, "suggested_posting_time": "ISO datetime string", "platform_warnings": ["warning"]}]}'
            )

            # 3. Build user prompt
            user_prompt = (
                f"Generate exactly {num_variations} distinct variations of social media content "
                f"about the topic: '{topic}' for the platform '{platform}'."
            )

            # 4. Call LiteLLM retrier
            logger.info("Executing ContentAgent LLM call...")
            raw_response = await self._retry_call(system_prompt=system_prompt, user_prompt=user_prompt)

            # 5. Parse response JSON robustly
            parsed_data = self._parse_json_response(raw_response)
            
            # 6. Validate with Pydantic
            validated_output = ContentOutput.model_validate(parsed_data)

            # 7. Write drafts to database
            content_ids = []
            if self.brand_profile_id:
                for variation in validated_output.variations:
                    # Append hashtags separated by newline as requested
                    hashtags_str = " ".join(f"#{tag.strip('#')}" for tag in variation.hashtags)
                    final_text = f"{variation.text}\n\n{hashtags_str}" if hashtags_str else variation.text

                    new_piece = ContentPiece(
                        brand_id=self.brand_profile_id,
                        platform=platform,
                        text=final_text,
                        status="draft",
                        scheduled_at=None,
                        published_at=None
                    )
                    self.db_session.add(new_piece)
                    await self.db_session.flush() # populate ID
                    content_ids.append(new_piece.id)
            else:
                logger.warning("No brand_profile_id configured; skipping ContentPiece writes.")

            # 8. Log the execution run
            output_data = {
                "variations": [v.model_dump() for v in validated_output.variations],
                "content_ids": content_ids
            }
            await self.log_run(
                agent_name="ContentAgent",
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
            logger.error(f"ContentAgent execution failed: {e}")
            return AgentOutput(
                success=False,
                error_message=str(e),
                execution_time_seconds=self._get_duration()
            )

    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        """
        Parses JSON strings from LLM text output robustly.
        """
        cleaned = text.strip()
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass

        # Try to locate markdown code blocks
        match = re.search(r'```json\s*(.*?)\s*```', cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        match = re.search(r'```\s*(.*?)\s*```', cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        # Try bracket locating fallback
        first_brace = cleaned.find('{')
        last_brace = cleaned.rfind('}')
        if first_brace != -1 and last_brace != -1:
            try:
                return json.loads(cleaned[first_brace:last_brace+1])
            except json.JSONDecodeError:
                pass

        raise ValueError(f"Failed to parse output JSON block from response text: {cleaned[:200]}...")

    def _get_duration(self) -> float:
        import time
        return round(time.time() - self._started_at, 2)
