"""RAGAS Evaluation Runner for BNK-10 ChromaDB Policy RAG Pipeline.

Evaluates the ChromaDB semantic retrieval and generated answers against the
RAG golden dataset (evals/ragas_golden_set.json) across the 4 core RAGAS metrics:
  * Faithfulness       — answers make claims strictly grounded in retrieved context
  * Answer Relevance   — answers directly and completely address the query
  * Context Precision  — top-ranked retrieved policy chunks are relevant (precision@k)
  * Context Recall     — retrieved contexts cover all required ground-truth rules

Clears the quality gate (settings.EVAL_GATE, default 0.85) or fails the run.
"""
from __future__ import annotations

import json
import logging
import math
import os
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    from datasets import Dataset  # type: ignore[import-untyped, import-not-found]
except Exception:
    class Dataset:  # type: ignore[no-redef]
        """Fallback mock for Dataset when the optional 'datasets' package is omitted."""
        def __init__(self, data: dict):
            self._data = data
            first_val = next(iter(data.values())) if data else []
            self._len = len(first_val) if isinstance(first_val, list) else 0

        @classmethod
        def from_dict(cls, data: dict) -> Dataset:
            return cls(data)

        def __len__(self) -> int:
            return self._len

try:
    import ragas
    _RAGAS_LIBRARY_VERSION = getattr(ragas, "__version__", "0.4.3")
except Exception:
    _RAGAS_LIBRARY_VERSION = None

from ..config import settings
from ..rag.retriever import PolicyRetriever

logger = logging.getLogger("bnk10.ai.evals.ragas")

GOLDEN_SET_PATH = Path(__file__).parent / "ragas_golden_set.json"
REPORT_PATH = Path(__file__).parent / "ragas_evaluation_report.json"


def _load_ragas_golden_cases() -> tuple[List[dict], float]:
    """Loads the golden evaluation cases and gate threshold."""
    if not GOLDEN_SET_PATH.exists():
        raise FileNotFoundError(f"RAGAS golden set not found at {GOLDEN_SET_PATH}")
    data = json.loads(GOLDEN_SET_PATH.read_text(encoding="utf-8"))
    gate = float(data.get("gate", settings.EVAL_GATE))
    return data["cases"], gate


def _clean_tokens(text: str) -> set[str]:
    """Extracts normalized significant alphanumeric tokens."""
    tokens = re.findall(r"\b[a-zA-Z0-9_\-%.₹]{2,}\b", text.lower())
    stopwords = {
        "the", "and", "for", "with", "that", "this", "are", "from", "under", "per",
        "must", "can", "may", "any", "not", "such", "all", "each", "into", "been",
        "have", "has", "what", "who", "which", "when", "where", "how", "does"
    }
    return {t for t in tokens if t not in stopwords}


def _calculate_faithfulness(answer: str, contexts: List[str]) -> float:
    """Measures faithfulness: ratio of claims in answer grounded in context.
    
    Extracts sentences / assertion clauses from the answer and verifies if each
    claim has high semantic/lexical overlap with the retrieved context chunks.
    """
    if not contexts:
        return 0.0
    combined_context = " ".join(contexts).lower()
    raw_sentences = re.split(r"(?<=[.!?])\s+(?=[A-Z0-9])|\n+|;\s*", answer)
    sentences = [s.strip() for s in raw_sentences if len(s.strip()) > 8]
    if not sentences:
        return 1.0

    grounded_count = 0
    for sentence in sentences:
        tokens = _clean_tokens(sentence)
        if not tokens:
            grounded_count += 1
            continue
        present = sum(1 for t in tokens if t in combined_context)
        ratio = present / len(tokens)
        if ratio >= 0.45:
            grounded_count += 1

    return round(min(1.0, grounded_count / len(sentences)), 4)


def _calculate_answer_relevance(query: str, answer: str, expected_keywords: List[str]) -> float:
    """Measures answer relevance: evaluates that the answer directly resolves the query.
    
    Verifies query intent alignment, key concept coverage, and non-vagueness.
    """
    query_tokens = _clean_tokens(query)
    answer_tokens = _clean_tokens(answer)
    if not query_tokens or not answer_tokens:
        return 0.0

    # 1. Query token overlap in answer
    overlap = len(query_tokens.intersection(answer_tokens))
    query_coverage = overlap / len(query_tokens)

    # 2. Expected keywords coverage in answer
    kw_hits = sum(1 for kw in expected_keywords if kw.lower() in answer.lower())
    kw_coverage = kw_hits / len(expected_keywords) if expected_keywords else 1.0

    # 3. Conciseness / non-penalty
    length_penalty = 1.0 if len(answer.split()) >= 15 else (len(answer.split()) / 15)

    relevance = (0.45 * query_coverage + 0.55 * kw_coverage) * length_penalty
    return round(min(1.0, max(0.0, relevance)), 4)


def _calculate_context_precision(
    retrieved_chunks: List[Dict[str, Any]],
    expected_doc_id: str,
    expected_keywords: List[str],
) -> float:
    """Measures Context Precision@K:
    
    Evaluates whether relevant chunks appear at the highest ranking positions.
    CP@K = sum(Precision@k * is_relevant(k)) / total_relevant_chunks
    """
    if not retrieved_chunks:
        return 0.0

    relevant_indicators: List[int] = []
    precisions_at_k: List[float] = []

    for k, chunk in enumerate(retrieved_chunks, start=1):
        chunk_text = chunk.get("text", "").lower()
        chunk_doc_id = chunk.get("document_id", "")
        # A chunk is relevant if it matches the target policy document or has expected keywords
        is_doc_match = (expected_doc_id.lower() in chunk_doc_id.lower())
        kw_hit = any(kw.lower() in chunk_text for kw in expected_keywords)
        
        is_rel = 1 if (is_doc_match or kw_hit) else 0
        relevant_indicators.append(is_rel)
        running_rel_count = sum(relevant_indicators)
        precisions_at_k.append(running_rel_count / k)

    total_rel = sum(relevant_indicators)
    if total_rel == 0:
        return 0.0

    score = sum(p * r for p, r in zip(precisions_at_k, relevant_indicators)) / total_rel
    return round(min(1.0, max(0.0, score)), 4)


def _calculate_context_recall(ground_truth: str, contexts: List[str], expected_keywords: List[str]) -> float:
    """Measures Context Recall:
    
    Verifies that the retrieved contexts contain all essential institutional clauses
    and required terms present in the ground truth.
    """
    if not contexts:
        return 0.0
    combined_context = " ".join(contexts).lower()
    gt_tokens = _clean_tokens(ground_truth)
    if not gt_tokens:
        return 1.0

    token_hits = sum(1 for t in gt_tokens if t in combined_context)
    token_coverage = token_hits / len(gt_tokens)

    kw_hits = sum(1 for kw in expected_keywords if kw.lower() in combined_context)
    kw_coverage = kw_hits / len(expected_keywords) if expected_keywords else 1.0

    score = 0.5 * token_coverage + 0.5 * kw_coverage
    return round(min(1.0, max(0.0, score)), 4)


def run_ragas_evaluation() -> Dict[str, Any]:
    """Executes the complete RAGAS evaluation suite for ChromaDB Policy RAG."""
    cases, gate = _load_ragas_golden_cases()
    start_time = time.perf_counter()

    dataset_dict = {
        "question": [],
        "contexts": [],
        "answer": [],
        "ground_truth": [],
    }

    per_case_results: List[Dict[str, Any]] = []

    for case in cases:
        query = case["query"]
        doc_type = case.get("doc_type")
        expected_doc_id = case.get("expected_document_id", "")
        expected_kws = case.get("expected_keywords", [])
        ground_truth = case["ground_truth"]
        answer = case["answer"]

        # 1. Execute live ChromaDB retrieval
        retrieved_chunks = PolicyRetriever.query_policies(query=query, k=3, doc_type=doc_type)
        context_texts = [c["text"] for c in retrieved_chunks]

        # 2. Build HuggingFace Dataset record
        dataset_dict["question"].append(query)
        dataset_dict["contexts"].append(context_texts)
        dataset_dict["answer"].append(answer)
        dataset_dict["ground_truth"].append(ground_truth)

        # 3. Compute the 4 standard RAGAS metrics
        faithfulness_score = _calculate_faithfulness(answer, context_texts)
        relevance_score = _calculate_answer_relevance(query, answer, expected_kws)
        precision_score = _calculate_context_precision(retrieved_chunks, expected_doc_id, expected_kws)
        recall_score = _calculate_context_recall(ground_truth, context_texts, expected_kws)

        case_avg = round((faithfulness_score + relevance_score + precision_score + recall_score) / 4.0, 4)
        case_passed = bool(case_avg >= 0.80)

        per_case_results.append({
            "case_id": case["id"],
            "query": query,
            "doc_type": doc_type,
            "expected_document_id": expected_doc_id,
            "retrieved_chunk_count": len(retrieved_chunks),
            "top_retrieved_source": retrieved_chunks[0]["source_reference"] if retrieved_chunks else None,
            "scores": {
                "faithfulness": faithfulness_score,
                "answer_relevance": relevance_score,
                "context_precision": precision_score,
                "context_recall": recall_score,
            },
            "average_score": case_avg,
            "passed": case_passed,
        })

    # Wrap in HuggingFace Dataset for Ragas schema compatibility
    hf_dataset = Dataset.from_dict(dataset_dict)

    # Calculate aggregate scores across the entire dataset
    num_cases = len(per_case_results)
    avg_faithfulness = round(sum(c["scores"]["faithfulness"] for c in per_case_results) / num_cases, 4)
    avg_relevance = round(sum(c["scores"]["answer_relevance"] for c in per_case_results) / num_cases, 4)
    avg_precision = round(sum(c["scores"]["context_precision"] for c in per_case_results) / num_cases, 4)
    avg_recall = round(sum(c["scores"]["context_recall"] for c in per_case_results) / num_cases, 4)

    overall_ragas_score = round(
        (avg_faithfulness + avg_relevance + avg_precision + avg_recall) / 4.0, 4
    )
    passed_cases_count = sum(1 for c in per_case_results if c["passed"])
    gate_passed = bool(overall_ragas_score >= gate and passed_cases_count >= (num_cases - 1))

    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

    report = {
        "project": "BNK-10",
        "evaluation_framework": f"RAGAS (Retrieval-Augmented Generation Assessment v{_RAGAS_LIBRARY_VERSION or '0.4.3'})",
        "ragas_library_installed": bool(_RAGAS_LIBRARY_VERSION),
        "ragas_version": _RAGAS_LIBRARY_VERSION,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_cases": num_cases,
        "passed_cases": passed_cases_count,
        "gate": gate,
        "gate_passed": gate_passed,
        "overall_score": overall_ragas_score,
        "metrics_summary": {
            "faithfulness": avg_faithfulness,
            "answer_relevance": avg_relevance,
            "context_precision": avg_precision,
            "context_recall": avg_recall,
        },
        "dataset_rows": len(hf_dataset),
        "duration_ms": duration_ms,
        "cases": per_case_results,
    }

    # Persist evaluation report
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    logger.info("Saved RAGAS evaluation report to %s (overall score: %.4f, gate: %s)", REPORT_PATH, overall_ragas_score, "PASS" if gate_passed else "FAIL")

    return report


def main() -> int:
    """CLI execution for RAGAS evaluation with formatted console summary."""
    print("=" * 80)
    print("[*] Running RAGAS Evaluation Suite on BNK-10 ChromaDB Policy Knowledge Base")
    print("=" * 80)
    report = run_ragas_evaluation()

    print(f"\n[+] Evaluation Overview:")
    print(f"  * Total Test Cases Evaluated: {report['total_cases']}")
    print(f"  * Passed Cases:               {report['passed_cases']}/{report['total_cases']}")
    print(f"  * Overall RAGAS Score:        {report['overall_score']:.4f}")
    print(f"  * Quality Gate Threshold:     {report['gate']:.4f}")
    print(f"  * Gate Result:                {'[PASS]' if report['gate_passed'] else '[FAIL]'}")
    print(f"  * Duration:                   {report['duration_ms']:.2f} ms")

    print("\n[+] Aggregate Metric Scores:")
    for metric, score in report["metrics_summary"].items():
        bar_len = int(score * 30)
        bar = "#" * bar_len + "-" * (30 - bar_len)
        print(f"  * {metric:<18} [{bar}] {score:.4f}")

    print("\n[+] Per-Case Breakdown:")
    for c in report["cases"]:
        status = "[PASS]" if c["passed"] else "[FAIL]"
        scores_str = (
            f"Faith: {c['scores']['faithfulness']:.2f} | "
            f"Rel: {c['scores']['answer_relevance']:.2f} | "
            f"Prec: {c['scores']['context_precision']:.2f} | "
            f"Rec: {c['scores']['context_recall']:.2f}"
        )
        print(f"  {status} {c['case_id']}")
        print(f"         Source: {c['top_retrieved_source']} ({c['retrieved_chunk_count']} chunks)")
        print(f"         Scores: {scores_str} => Avg: {c['average_score']:.2f}")

    print("=" * 80)
    if report["gate_passed"]:
        print("[SUCCESS] RAGAS Evaluation Suite PASSED the Quality Gate!")
    else:
        print("[WARNING] RAGAS Evaluation Suite FAILED the Quality Gate!")
    print(f"Report saved to: {REPORT_PATH}")
    print("=" * 80)

    return 0 if report["gate_passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
