"""LLM provider abstraction.

Directly powers Next-Best-Action generation and Outreach drafting via the
enterprise Cloud LLM API gateway (GLM-5.3-Flash).
"""
import json
import logging
import os
import re
import time
from typing import Any, Optional

import httpx

try:
    from langchain_core.messages import SystemMessage
    from langchain_core.output_parsers import JsonOutputParser
    from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate
    from langchain_openai import ChatOpenAI
    _LANGCHAIN_AVAILABLE = True
except Exception:
    _LANGCHAIN_AVAILABLE = False

from ..config import settings

logger = logging.getLogger("bnk10.ai.llm")


class LLMUnavailableError(Exception):
    """Raised when the configured LLM backend cannot be reached."""


class LLMResult:
    def __init__(
        self,
        content: Optional[dict],
        provider: str,
        model: str,
        prompt_tokens: int = 0,
        completion_tokens: int = 0,
        duration_ms: float = 0.0,
        error: Optional[str] = None,
    ):
        self.content = content
        self.provider = provider
        self.model = model
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens
        self.duration_ms = duration_ms
        self.error = error

    @property
    def ok(self) -> bool:
        return self.content is not None

    def to_meta(self) -> dict:
        return {
            "provider": self.provider,
            "model": self.model,
            "prompt_tokens": self.prompt_tokens,
            "completion_tokens": self.completion_tokens,
            "duration_ms": round(self.duration_ms, 2),
            "error": self.error,
        }


class CloudAPIProvider:
    """High-speed enterprise Cloud API provider (GLM-5.3-Flash / OpenAI-compatible)."""

    def __init__(self, api_key: str, model: str = "glm-5.3-flash", base_url: str = "http://10.160.0.2:4000/v1"):
        self.api_key = api_key.strip()
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.name = "glm"

    def is_available(self) -> bool:
        return bool(self.api_key)

    def generate_json(self, system: str, user: str) -> LLMResult:
        start = time.perf_counter()
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            "temperature": 0.2,
        }

        try:
            resp = httpx.post(
                f"{self.base_url}/chat/completions",
                headers=headers,
                json=payload,
                timeout=settings.LLM_TIMEOUT_SECONDS,
                trust_env=False,
            )
            duration_ms = (time.perf_counter() - start) * 1000

            if resp.status_code != 200:
                raise LLMUnavailableError(f"GLM API HTTP {resp.status_code}: {resp.text[:200]}")

            data = resp.json()
            raw = data["choices"][0]["message"]["content"]

            # Clean markdown code block fences if present (```json ... ```)
            cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.IGNORECASE)
            cleaned = re.sub(r"\s*```$", "", cleaned).strip()

            parsed = json.loads(cleaned)
            usage = data.get("usage", {})
            return LLMResult(
                content=parsed,
                provider=self.name,
                model=self.model,
                prompt_tokens=usage.get("prompt_tokens", 0),
                completion_tokens=usage.get("completion_tokens", 0),
                duration_ms=duration_ms,
            )
        except Exception as exc:
            logger.warning("GLM API generation failed: %s", exc)
            raise LLMUnavailableError(f"GLM API error: {exc}")


class LangChainProvider:
    """Enterprise LangChain LCEL provider running ChatOpenAI + JsonOutputParser."""

    def __init__(self, api_key: str, model: str = "glm-5.3-flash", base_url: str = "http://10.160.0.2:4000/v1"):
        self.api_key = api_key.strip()
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.name = "glm"

    def is_available(self) -> bool:
        return bool(self.api_key)

    def generate_json(self, system: str, user: str) -> LLMResult:
        start = time.perf_counter()
        try:
            chat_model = ChatOpenAI(
                model=self.model,
                api_key=self.api_key,
                base_url=self.base_url,
                temperature=0.2,
                timeout=settings.LLM_TIMEOUT_SECONDS,
                max_retries=1,
            )
            prompt = ChatPromptTemplate.from_messages([
                SystemMessage(content=system),
                HumanMessagePromptTemplate.from_template("{input_prompt}"),
            ])
            parser = JsonOutputParser()
            chain = prompt | chat_model | parser

            parsed = chain.invoke({"input_prompt": user})
            duration_ms = (time.perf_counter() - start) * 1000
            return LLMResult(
                content=parsed,
                provider=self.name,
                model=self.model,
                duration_ms=duration_ms,
            )
        except Exception as exc:
            logger.warning("LangChain generation failed: %s, falling back to direct HTTP", exc)
            fallback = CloudAPIProvider(api_key=self.api_key, model=self.model, base_url=self.base_url)
            return fallback.generate_json(system, user)


_provider_instance: Any = None
_provider_probed = False


def resolve_provider(force_refresh: bool = False):
    """Resolve active LLM provider (LangChain GLM LCEL runner with direct HTTP fallback)."""
    global _provider_instance, _provider_probed
    if force_refresh:
        _provider_probed = False
    if _provider_probed and _provider_instance:
        return _provider_instance

    api_key = settings.API_KEY or os.environ.get("GLM_API_KEY", "") or os.environ.get("API_KEY", "")
    base_url = settings.API_BASE_URL or os.environ.get("API_BASE_URL", "http://10.160.0.2:4000/v1")
    model = settings.LLM_MODEL or os.environ.get("LLM_MODEL", "glm-5.3-flash")

    if not api_key:
        raise LLMUnavailableError("API key required: neither API_KEY nor GLM_API_KEY was provided.")

    if _LANGCHAIN_AVAILABLE:
        provider = LangChainProvider(api_key=api_key, model=model, base_url=base_url)
    else:
        provider = CloudAPIProvider(api_key=api_key, model=model, base_url=base_url)
    logger.info("LLM provider resolved: %s (%s via %s at %s)", provider.name, provider.model, type(provider).__name__, provider.base_url)

    _provider_instance = provider
    _provider_probed = True
    return provider


def provider_status() -> dict:
    """Health-report helper: reports current active LLM provider."""
    try:
        provider = resolve_provider()
        return {
            "configured": "api",
            "active": provider.name,
            "model": provider.model,
            "gateway_url": provider.base_url,
        }
    except Exception as exc:
        return {
            "configured": "api",
            "active": "error",
            "error": str(exc),
        }
