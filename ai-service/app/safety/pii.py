"""PII masking for inputs, logs and prompts.

Uses Microsoft Presidio when installed (with its NLP engine); otherwise falls
back to deterministic regex detectors so masking always works offline.
"""
import logging
import re
from typing import Dict, List, Tuple

from ..config import settings

logger = logging.getLogger("bnk10.ai.safety.pii")

_PATTERNS: List[Tuple[str, str]] = [
    # Order matters: most specific patterns first so broad digit patterns
    # (phone/card) don't consume context needed by labelled identifiers.
    ("EMAIL", r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),
    ("ACCOUNT_NUMBER", r"\b(?:Acct|Account)\s*(?:No\.?|Number|#)\s*[:#]?\s*\d{6,18}\b"),
    ("IBAN", r"\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b"),
    ("SSN_LIKE", r"\b\d{3}-\d{2}-\d{4}\b"),
    ("CREDIT_CARD", r"\b(?:\d[ -]*?){13,16}\b"),
    ("IP_ADDRESS", r"\b(?:\d{1,3}\.){3}\d{1,3}\b"),
    ("PHONE", r"(?:\+?\d{1,3}[-.\s]?)?(?:\d[-.\s]?){9,14}\d"),
]

_presidio_available = False
_presidio_analyzer = None
try:  # optional dependency — graceful degradation
    from presidio_analyzer import AnalyzerEngine  # type: ignore

    _presidio_analyzer = AnalyzerEngine()
    _presidio_available = True
    logger.info("Presidio analyzer available — using it for PII detection")
except Exception:  # ImportError or model download failure
    logger.info("Presidio unavailable — using regex PII masking fallback")


def mask_text(text: str) -> Tuple[str, List[Dict[str, str]]]:
    """Return (masked_text, findings) where findings list entity type + sample."""
    if not settings.PII_MASKING_ENABLED or not text:
        return text or "", []

    findings: List[Dict[str, str]] = []
    masked = text

    if _presidio_available and _presidio_analyzer is not None:
        results = _presidio_analyzer.analyze(text=text, language="en")
        # Replace from the end to keep offsets valid
        for result in sorted(results, key=lambda r: r.start, reverse=True):
            entity = result.entity_type
            findings.append({"type": entity, "sample_length": str(result.end - result.start)})
            masked = masked[: result.start] + f"[{entity}_MASKED]" + masked[result.end:]
        return masked, findings

    for entity, pattern in _PATTERNS:
        def _sub(match):
            findings.append({"type": entity, "sample_length": str(len(match.group(0)))})
            return f"[{entity}_MASKED]"
        masked = re.sub(pattern, _sub, masked)
    return masked, findings


def mask_context(context: dict) -> Tuple[dict, List[Dict[str, str]]]:
    """Mask free-text fields inside a Client 360 context dict (non-destructive copy)."""
    if not settings.PII_MASKING_ENABLED:
        return context, []
    masked = dict(context)
    findings: List[Dict[str, str]] = []

    client = dict(masked.get("client") or {})
    name = client.get("full_name")
    if name:
        client["full_name"] = f"[CLIENT_{abs(hash(name)) % 10000:04d}]"
        findings.append({"type": "PERSON", "sample_length": str(len(name))})
    masked["client"] = client

    masked_signals: List[dict] = []
    for signal in masked.get("signals", []):
        text = str(signal.get("data", ""))
        new_text, new_findings = mask_text(text)
        if new_findings:
            signal = dict(signal)
            signal["data"] = new_text
            findings.extend(new_findings)
        masked_signals.append(signal)
    masked["signals"] = masked_signals
    return masked, findings
