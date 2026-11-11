"""LangChain integration module for BNK-10 AI Service.

Provides production LCEL (LangChain Expression Language) runnable chains
for Next-Best-Action candidate generation and Outreach drafting, using
ChatOpenAI (configured with enterprise GLM endpoint) and ChatPromptTemplate.
"""
import json
import logging
import os
import re
import time
from typing import Any, Dict, Optional

from langchain_core.messages import SystemMessage
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate
from langchain_openai import ChatOpenAI

from ..config import settings
from ..pipeline.prompts import NBA_SYSTEM_PROMPT, OUTREACH_SYSTEM_PROMPT
from .provider import LLMResult, LLMUnavailableError

logger = logging.getLogger("bnk10.ai.llm.langchain")


def get_langchain_chat_model(
    temperature: float = 0.2,
    timeout: Optional[float] = None,
) -> ChatOpenAI:
    """Instantiate a ChatOpenAI model pointing to the GLM API endpoint."""
    api_key = settings.API_KEY or os.environ.get("GLM_API_KEY", "") or os.environ.get("API_KEY", "")
    base_url = settings.API_BASE_URL or os.environ.get("API_BASE_URL", "http://10.160.0.2:4000/v1")
    model = settings.LLM_MODEL or os.environ.get("LLM_MODEL", "glm-5.3-flash")

    if not api_key:
        raise LLMUnavailableError("API key required for LangChain model initialization.")

    return ChatOpenAI(
        model=model,
        api_key=api_key,
        base_url=base_url.rstrip("/"),
        temperature=temperature,
        timeout=timeout or settings.LLM_TIMEOUT_SECONDS,
        max_retries=1,
    )


def build_nba_langchain_runnable():
    """Builds an LCEL runnable chain: Prompt -> ChatOpenAI -> JsonOutputParser."""
    chat_model = get_langchain_chat_model(temperature=0.2)
    prompt = ChatPromptTemplate.from_messages([
        SystemMessage(content=NBA_SYSTEM_PROMPT),
        HumanMessagePromptTemplate.from_template("{context}"),
    ])
    parser = JsonOutputParser()
    return prompt | chat_model | parser


def build_outreach_langchain_runnable():
    """Builds an LCEL runnable chain for Outreach drafting."""
    chat_model = get_langchain_chat_model(temperature=0.2)
    prompt = ChatPromptTemplate.from_messages([
        SystemMessage(content=OUTREACH_SYSTEM_PROMPT),
        HumanMessagePromptTemplate.from_template("{prompt}"),
    ])
    parser = JsonOutputParser()
    return prompt | chat_model | parser


def generate_nba_with_langchain(context_json_str: str) -> LLMResult:
    """Executes NBA candidate generation via LangChain LCEL runnable pipeline."""
    start = time.perf_counter()
    try:
        chain = build_nba_langchain_runnable()
        parsed_result = chain.invoke({"context": context_json_str})
        duration_ms = (time.perf_counter() - start) * 1000

        model_name = settings.LLM_MODEL or "glm-5.3-flash"
        return LLMResult(
            content=parsed_result,
            provider="langchain-glm",
            model=model_name,
            duration_ms=duration_ms,
        )
    except Exception as exc:
        logger.warning("LangChain NBA generation encountered exception: %s", exc)
        raise LLMUnavailableError(f"LangChain execution error: {exc}") from exc


def generate_outreach_with_langchain(user_prompt_json_str: str) -> Dict[str, Any]:
    """Executes Outreach drafting via LangChain LCEL runnable pipeline."""
    try:
        chain = build_outreach_langchain_runnable()
        return chain.invoke({"prompt": user_prompt_json_str})
    except Exception as exc:
        logger.warning("LangChain Outreach generation encountered exception: %s", exc)
        raise LLMUnavailableError(f"LangChain outreach error: {exc}") from exc
