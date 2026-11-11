"""Semantic Retrieval module for BNK-10 ChromaDB Policy Knowledge Base."""
import logging
from typing import Any, Dict, List, Optional, cast

from .config import (
    DEFAULT_RETRIEVAL_K,
    RELEVANCE_DISTANCE_THRESHOLD,
)
from .ingest import get_or_create_collection

logger = logging.getLogger("bnk10.ai.rag.retriever")


class PolicyRetriever:
    """Retrieves relevant policy and guidelines chunks from ChromaDB with metadata filtering."""

    @classmethod
    def query_policies(
        cls,
        query: str,
        k: int = DEFAULT_RETRIEVAL_K,
        doc_type: Optional[str] = None,
        distance_threshold: float = RELEVANCE_DISTANCE_THRESHOLD,
    ) -> List[Dict[str, Any]]:
        """Queries the ChromaDB policy store semantically.
        
        Args:
            query: The semantic search query (e.g., 'Fixed deposit reinvestment rules for conservative client').
            k: Maximum number of relevant chunks to retrieve.
            doc_type: Optional metadata filter ('SUITABILITY_POLICY', 'PRODUCT_GUIDELINES', 'CUSTOMER_COMMUNICATION_POLICY').
            distance_threshold: Cutoff distance beyond which results are discarded as irrelevant.
        """
        if not query or not query.strip():
            logger.debug("Empty query passed to PolicyRetriever. Returning empty results.")
            return []

        try:
            collection = get_or_create_collection()
            if collection.count() == 0:
                logger.warning("ChromaDB policy collection is empty. Run ingestion first.")
                return []

            where_filter = cast(Any, {"document_type": doc_type}) if doc_type else None

            results = collection.query(
                query_texts=[query],
                n_results=min(k, collection.count()),
                where=where_filter,
                include=["documents", "metadatas", "distances"],
            )
        except Exception as exc:
            logger.error("ChromaDB query execution error: %s", exc)
            return []

        retrieved: List[Dict[str, Any]] = []
        if not results:
            return []
        docs_list = results.get("documents")
        if not docs_list or not docs_list[0]:
            return []

        docs = docs_list[0]
        metas_list = results.get("metadatas")
        metas = metas_list[0] if metas_list and metas_list[0] else [{}] * len(docs)
        dists_list = results.get("distances")
        distances = dists_list[0] if dists_list and dists_list[0] else [0.0] * len(docs)

        for doc_text, meta, dist in zip(docs, metas, distances):
            if dist > distance_threshold:
                logger.debug("Chunk %s filtered out (distance %.3f > threshold %.3f)", meta.get("chunk_id"), dist, distance_threshold)
                continue

            retrieved.append({
                "chunk_id": meta.get("chunk_id", "unknown"),
                "document_id": meta.get("document_id", "POL-REF"),
                "document_name": meta.get("document_name", "policy.md"),
                "document_type": meta.get("document_type", "POLICY"),
                "section": meta.get("section", "Section"),
                "source_reference": meta.get("source_reference", meta.get("document_id", "POL-REF")),
                "text": doc_text,
                "distance": round(float(dist), 4),
                "relevance_score": round(max(0.0, 1.0 - (float(dist) / 2.0)), 4),
            })

        logger.info("Policy query '%s' (filter=%s) returned %d relevant chunks", query[:40], doc_type, len(retrieved))
        return retrieved

    @classmethod
    def get_nba_policy_context(cls, client_risk_profile: str, signals: List[dict], product_catalog: List[dict]) -> List[Dict[str, Any]]:
        """Retrieves suitability rules and product guidelines relevant to client risk and signals."""
        signal_types = " ".join([s.get("type", "") for s in signals])
        query = f"Suitability rules and risk alignment for {client_risk_profile} risk client with events {signal_types}"
        
        # 1. Retrieve suitability policies
        suitability_chunks = cls.query_policies(query=query, k=2, doc_type="SUITABILITY_POLICY")
        
        # 2. Retrieve product guidelines
        prod_query = f"Product guidelines and minimum investment eligibility for {client_risk_profile} portfolio"
        product_chunks = cls.query_policies(query=prod_query, k=2, doc_type="PRODUCT_GUIDELINES")
        
        # Deduplicate by chunk_id
        seen = set()
        merged = []
        for c in suitability_chunks + product_chunks:
            if c["chunk_id"] not in seen:
                seen.add(c["chunk_id"])
                merged.append(c)
        return merged

    @classmethod
    def get_outreach_policy_context(cls, channel: str, tone: str, product_name: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieves communication guidelines and product rules for drafting outreach."""
        query = f"Customer communication standards for {channel} outreach with {tone} tone. Prohibited statements and disclosure rules."
        comm_chunks = cls.query_policies(query=query, k=2, doc_type="CUSTOMER_COMMUNICATION_POLICY")
        
        prod_chunks = []
        if product_name:
            prod_query = f"Product specifications, terms, and eligibility for {product_name}"
            prod_chunks = cls.query_policies(query=prod_query, k=2, doc_type="PRODUCT_GUIDELINES")

        seen = set()
        merged = []
        for c in comm_chunks + prod_chunks:
            if c["chunk_id"] not in seen:
                seen.add(c["chunk_id"])
                merged.append(c)
        return merged


try:
    from langchain_core.callbacks.manager import CallbackManagerForRetrieverRun
    from langchain_core.documents import Document
    from langchain_core.retrievers import BaseRetriever

    class LangchainPolicyRetriever(BaseRetriever):
        """LangChain standard BaseRetriever adapter over BNK-10 ChromaDB Policy Knowledge Base."""

        doc_type: Optional[str] = None
        k: int = DEFAULT_RETRIEVAL_K

        def _get_relevant_documents(
            self, query: str, *, run_manager: Optional[CallbackManagerForRetrieverRun] = None
        ) -> List[Document]:
            chunks = PolicyRetriever.query_policies(query=query, k=self.k, doc_type=self.doc_type)
            return [
                Document(
                    page_content=c.get("text", ""),
                    metadata={
                        "chunk_id": c.get("chunk_id"),
                        "document_id": c.get("document_id"),
                        "section": c.get("section"),
                        "source_reference": c.get("source_reference"),
                        "relevance_score": c.get("relevance_score"),
                    },
                )
                for c in chunks
            ]
except Exception as _lc_err:  # noqa: BLE001
    logger.debug("LangChain base retriever not available: %s", _lc_err)
    LangchainPolicyRetriever = None

