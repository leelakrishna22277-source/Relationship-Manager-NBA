"""Prompt-injection guard.

Detects classic injection patterns in any free-text that reaches an LLM prompt
(client signal notes, RM custom instructions). Flagged text is stripped from
prompts and the interaction is annotated; a dozen scripted attack prompts are
asserted in tests/test_safety.py (PyRIT-style checks, runnable offline).
"""
import re
from typing import Any, Dict, List

from ..config import settings

INJECTION_PATTERNS: List[str] = [
    r"ignore\s+(all\s+)?(previous|prior|above)",
    r"disregard\s+(all\s+)?(previous|prior|your)",
    r"forget\s+(all\s+)?(previous|prior|your|everything)",
    r"you\s+are\s+now",
    r"act\s+as\s+(if|a|an)",
    r"pretend\s+(to\s+be|you)",
    r"system\s+prompt",
    r"reveal\s+(your|the)\s+(instructions|prompt|rules)",
    r"print\s+(your|the)\s+(instructions|prompt|rules)",
    r"developer\s+mode",
    r"jailbreak",
    r"DAN\s+mode",
    r"override\s+(your\s+)?(rules|instructions|safety)",
    r"new\s+instructions?:",
    r"do\s+not\s+follow",
    r"sudo\s+mode",
    r"admin\s+access",
    r"repeat\s+(everything|all)\s+(above|after)",
]


def detect_injection(text: str) -> Dict[str, Any]:
    """Return {'flagged': bool, 'matches': [...]} for a piece of free text."""
    if not text:
        return {"flagged": False, "matches": []}
    lowered = text.lower()
    matches = [p for p in INJECTION_PATTERNS if re.search(p, lowered)]
    return {"flagged": bool(matches), "matches": matches}


def sanitize_instruction(text: str) -> Dict[str, Any]:
    """Sanitize RM custom instructions / signal text before it reaches a prompt.

    Flagged content is removed (not forwarded to the model) and reported so the
    response can note that the instruction was dropped for safety review.
    """
    if not settings.INJECTION_GUARD_ENABLED or not text:
        return {"text": text or "", "flagged": False, "removed": []}
    detection = detect_injection(text)
    if not detection["flagged"]:
        return {"text": text, "flagged": False, "removed": []}
    cleaned = text
    removed: List[str] = []
    lowered = cleaned.lower()
    for pattern in detection["matches"]:
        cleaned = re.sub(pattern, "", cleaned, flags=re.IGNORECASE)
        match = re.search(pattern, lowered)
        if match:
            removed.append(match.group(0))
        lowered = cleaned.lower()
    cleaned = re.sub(r"\s{2,}", " ", cleaned).strip(" -,:;")
    return {"text": cleaned, "flagged": True, "removed": removed}
