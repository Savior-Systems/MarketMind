import os
import time
import asyncio
import logging
from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

import litellm
from sqlalchemy.future import select

from app.core.config import settings
from app.core.database import AsyncSession
from app.models.agent_run import AgentRun
from app.models.brand import BrandProfile

logger = logging.getLogger("marketmind.agents")

class AgentOutput(BaseModel):
    """
    Standard output payload structure for all MarketMind AI Agents.
    """
    success: bool
    data: Dict[str, Any] = Field(default_factory=dict)
    tokens_used: int = 0
    cost_usd: float = 0.0
    execution_time_seconds: float = 0.0
    error_message: Optional[str] = None

class BaseAgent(ABC):
    """
    Abstract base agent defining LLM client routing, token calculation,
    execution metrics tracking, and database logging.
    """
    def __init__(self, db_session: AsyncSession, brand_profile_id: Optional[int] = None):
        self.db_session = db_session
        self.brand_profile_id = brand_profile_id
        self._started_at = time.time()
        self._last_tokens_used = 0
        self._last_cost_usd = 0.0

    @abstractmethod
    async def execute(self, **kwargs) -> AgentOutput:
        """
        Abstract method to execute agent logic.
        Must return an AgentOutput.
        """
        pass

    async def call_llm(
        self,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.7
    ) -> str:
        """
        Executes a completion request using LiteLLM.
        Detects API keys from configuration and routes to OpenAI, Anthropic, or Ollama.
        """
        provider = "openai"
        
        # 1. Determine provider based on specified model or key existence
        if model:
            model_lower = model.lower()
            if "gpt" in model_lower:
                provider = "openai"
            elif "claude" in model_lower:
                provider = "anthropic"
            elif "llama" in model_lower or "ollama" in model_lower:
                provider = "ollama"
        else:
            if settings.OPENAI_API_KEY:
                provider = "openai"
            elif getattr(settings, "CLAUDE_API_KEY", "") or os.environ.get("ANTHROPIC_API_KEY"):
                provider = "anthropic"
            else:
                provider = "ollama"

        # 2. Select default models if none specified
        if not model:
            if provider == "openai":
                model = "gpt-4o-mini"
            elif provider == "anthropic":
                model = "claude-3-haiku-20240307"
            else:
                model = "ollama/llama3.2"

        # 3. Setup credentials
        api_key = None
        api_base = None
        
        if provider == "openai":
            api_key = settings.OPENAI_API_KEY
        elif provider == "anthropic":
            api_key = getattr(settings, "CLAUDE_API_KEY", "") or os.environ.get("ANTHROPIC_API_KEY", "")
        elif provider == "ollama":
            api_base = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")

        try:
            logger.info(f"Routing LLM request to provider: {provider}, model: {model}")
            
            # LiteLLM completion arguments
            kwargs = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                "temperature": temperature
            }
            if api_key:
                kwargs["api_key"] = api_key
            if api_base:
                kwargs["api_base"] = api_base

            response = await litellm.acompletion(**kwargs)
            
            # Extract content text
            content = response.choices[0].message.content or ""
            
            # Log and calculate token usage and costs
            prompt_tokens = 0
            completion_tokens = 0
            if hasattr(response, "usage") and response.usage:
                prompt_tokens = getattr(response.usage, "prompt_tokens", 0)
                completion_tokens = getattr(response.usage, "completion_tokens", 0)

            total_tokens = prompt_tokens + completion_tokens
            self._last_tokens_used = total_tokens
            
            # Cost calculation: $0.15/1M input tokens, $0.60/1M output tokens (default fallback)
            self._last_cost_usd = (prompt_tokens * 0.15 / 1_000_000) + (completion_tokens * 0.60 / 1_000_000)
            
            logger.info(f"LLM execution succeeded. Tokens used: {total_tokens}, Cost: ${self._last_cost_usd:.6f}")
            return content

        except Exception as e:
            logger.error(f"LiteLLM completion call failed: {e}")
            raise e

    async def _retry_call(
        self,
        system_prompt: str,
        user_prompt: str,
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_retries: int = 3
    ) -> str:
        """
        Helper method executing LLM calls with exponential backoff on LiteLLM exceptions.
        """
        for attempt in range(max_retries):
            try:
                return await self.call_llm(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    model=model,
                    temperature=temperature
                )
            except Exception as e:
                logger.warning(f"LiteLLM call failed on attempt {attempt + 1}/{max_retries}: {e}")
                if attempt == max_retries - 1:
                    # Final attempt failed
                    raise e
                backoff = 2 ** attempt  # 1s, 2s, 4s
                await asyncio.sleep(backoff)
        return ""

    async def get_brand_context(self) -> str:
        """
        Retrieves BrandProfile data from database and returns a formatted prompt context.
        """
        if not self.brand_profile_id:
            return "No brand profile configured."

        try:
            result = await self.db_session.execute(
                select(BrandProfile).where(BrandProfile.id == self.brand_profile_id)
            )
            brand = result.scalars().first()
            if not brand:
                return "No brand profile configured."

            keywords_str = ", ".join(brand.keywords) if brand.keywords else "None"
            return (
                f"Brand Name: {brand.name}\n"
                f"Tone: {brand.tone}\n"
                f"Target Audience: {brand.target_audience}\n"
                f"Voice Description: {brand.voice_description}\n"
                f"Keywords: {keywords_str}"
            )
        except Exception as e:
            logger.error(f"Error fetching brand context: {e}")
            return "No brand profile configured."

    async def log_run(
        self,
        agent_name: str,
        input_data: Dict[str, Any],
        output_data: Dict[str, Any],
        tokens: int,
        cost: float
    ) -> AgentRun:
        """
        Logs agent execution to the AgentRun database table.
        """
        try:
            from datetime import datetime as dt
            # Use utcfromtimestamp to match self._started_at float
            started_dt = dt.utcfromtimestamp(self._started_at)
            completed_dt = dt.utcnow()

            run_record = AgentRun(
                agent_name=agent_name,
                status="success",
                input_data=input_data,
                output_data=output_data,
                tokens_used=tokens,
                cost_usd=cost,
                started_at=started_dt,
                completed_at=completed_dt
            )
            self.db_session.add(run_record)
            await self.db_session.flush()
            return run_record
        except Exception as e:
            logger.error(f"Failed to write AgentRun database logs: {e}")
            raise e
