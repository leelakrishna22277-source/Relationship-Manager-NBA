"""Document ingestion pipeline for BNK-10 Policy Knowledge Base into ChromaDB."""
import hashlib
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, cast

import chromadb
from chromadb.utils import embedding_functions

from .config import (
    CHROMA_PERSIST_DIR,
    COLLECTION_NAME,
    DEFAULT_CHUNK_OVERLAP,
    DEFAULT_CHUNK_SIZE,
    KNOWLEDGE_BASE_DIR,
)

logger = logging.getLogger("bnk10.ai.rag.ingest")

_embedding_fn = None


def get_embedding_function():
    global _embedding_fn
    if _embedding_fn is None:
        _embedding_fn = embedding_functions.DefaultEmbeddingFunction()
    return _embedding_fn


def get_chroma_client():
    return chromadb.PersistentClient(path=str(CHROMA_PERSIST_DIR))


def get_or_create_collection(client=None):
    if client is None:
        client = get_chroma_client()
    return client.get_or_create_collection(
        name=COLLECTION_NAME,
        embedding_function=cast(Any, get_embedding_function()),
        metadata={"description": "BNK-10 Banking Policy and Guidelines Knowledge Base"},
    )


def extract_metadata_from_markdown(content: str, filename: str) -> Dict[str, str]:
    doc_id_match = re.search(r"\*\*Document ID:\*\*\s*([^\n\r]+)", content)
    version_match = re.search(r"\*\*Version:\*\*\s*([^\n\r]+)", content)

    doc_id = doc_id_match.group(1).strip() if doc_id_match else filename.replace(".md", "").upper()
    version = version_match.group(1).strip() if version_match else "1.0.0"

    doc_type = "GENERAL_POLICY"
    if "suitability" in filename.lower():
        doc_type = "SUITABILITY_POLICY"
    elif "product" in filename.lower():
        doc_type = "PRODUCT_GUIDELINES"
    elif "communication" in filename.lower():
        doc_type = "CUSTOMER_COMMUNICATION_POLICY"

    return {
        "document_id": doc_id,
        "document_name": filename,
        "document_type": doc_type,
        "version": version,
    }


def chunk_document(
    content: str,
    meta: Dict[str, str],
    chunk_size: int = DEFAULT_CHUNK_SIZE,
    chunk_overlap: int = DEFAULT_CHUNK_OVERLAP,
) -> List[Dict[str, Any]]:
    """Splits markdown into structured, semantically meaningful chunks with headers."""
    sections = re.split(r"\n(?=#{1,3}\s)", content)
    chunks = []
    chunk_idx = 0

    for sec in sections:
        sec = sec.strip()
        if not sec:
            continue

        header_match = re.match(r"^(#{1,3})\s+(.+)", sec)
        section_name = header_match.group(2).strip() if header_match else "Overview"
        sec_clean = re.sub(r"<!--.*?-->", "", sec, flags=re.DOTALL).strip()

        if len(sec_clean) <= chunk_size:
            chunk_idx += 1
            source_ref = f"{meta['document_id']}#{re.sub(r'[^a-zA-Z0-9_-]', '_', section_name)}"
            chunks.append({
                "chunk_id": f"{meta['document_id'].lower()}-chunk-{chunk_idx:03d}",
                "text": sec_clean,
                "metadata": {
                    **meta,
                    "section": section_name,
                    "source_reference": source_ref,
                    "chunk_id": f"{meta['document_id'].lower()}-chunk-{chunk_idx:03d}",
                },
            })
        else:
            # Sub-split long sections with overlap
            words = sec_clean.split()
            current_words: List[str] = []
            current_len = 0

            for word in words:
                current_words.append(word)
                current_len += len(word) + 1
                if current_len >= chunk_size:
                    chunk_idx += 1
                    chunk_text = " ".join(current_words)
                    source_ref = f"{meta['document_id']}#{re.sub(r'[^a-zA-Z0-9_-]', '_', section_name)}"
                    chunks.append({
                        "chunk_id": f"{meta['document_id'].lower()}-chunk-{chunk_idx:03d}",
                        "text": f"[{section_name}] {chunk_text}",
                        "metadata": {
                            **meta,
                            "section": section_name,
                            "source_reference": source_ref,
                            "chunk_id": f"{meta['document_id'].lower()}-chunk-{chunk_idx:03d}",
                        },
                    })
                    overlap_words = current_words[-max(1, chunk_overlap // 6):]
                    current_words = list(overlap_words)
                    current_len = sum(len(w) + 1 for w in current_words)

            if current_words:
                chunk_idx += 1
                source_ref = f"{meta['document_id']}#{re.sub(r'[^a-zA-Z0-9_-]', '_', section_name)}"
                chunks.append({
                    "chunk_id": f"{meta['document_id'].lower()}-chunk-{chunk_idx:03d}",
                    "text": f"[{section_name}] " + " ".join(current_words),
                    "metadata": {
                        **meta,
                        "section": section_name,
                        "source_reference": source_ref,
                        "chunk_id": f"{meta['document_id'].lower()}-chunk-{chunk_idx:03d}",
                    },
                })

    return chunks


def ingest_knowledge_base(force_reload: bool = False) -> Dict[str, Any]:
    """Ingests all markdown documents in knowledge_base directory into ChromaDB.
    
    Tracks content hashes to ensure idempotency and prevent duplicate chunks.
    """
    if not KNOWLEDGE_BASE_DIR.exists():
        raise FileNotFoundError(f"Knowledge base directory not found at: {KNOWLEDGE_BASE_DIR}")

    files = sorted(KNOWLEDGE_BASE_DIR.glob("*.md"))
    if not files:
        logger.warning("No markdown policy files found in %s", KNOWLEDGE_BASE_DIR)
        return {"status": "EMPTY", "documents_processed": 0, "chunks_ingested": 0}

    client = get_chroma_client()
    collection = get_or_create_collection(client)

    # Inspect existing collection to get stored content hashes
    existing_items = collection.get(include=["metadatas"])
    existing_hashes: Dict[str, str] = {}
    if existing_items and existing_items.get("metadatas"):
        metas = existing_items["metadatas"] or []
        for m in metas:
            if isinstance(m, dict) and "document_id" in m and "content_hash" in m:
                existing_hashes[str(m["document_id"])] = str(m["content_hash"])

    processed = 0
    total_chunks = 0
    skipped = 0

    for doc_path in files:
        with open(doc_path, "r", encoding="utf-8") as f:
            raw_text = f.read()

        content_hash = hashlib.sha256(raw_text.encode("utf-8")).hexdigest()
        meta = extract_metadata_from_markdown(raw_text, doc_path.name)
        meta["content_hash"] = content_hash

        doc_id = meta["document_id"]
        if not force_reload and existing_hashes.get(doc_id) == content_hash:
            logger.info("Document %s is unchanged (hash %s...). Skipping.", doc_path.name, content_hash[:8])
            skipped += 1
            continue

        # If document changed or forced reload, delete previous chunks for this document
        try:
            collection.delete(where={"document_id": doc_id})
        except Exception:
            pass

        chunks = chunk_document(raw_text, meta)
        if not chunks:
            continue

        ids = [c["chunk_id"] for c in chunks]
        texts = [c["text"] for c in chunks]
        metadatas = [c["metadata"] for c in chunks]

        collection.upsert(ids=ids, documents=texts, metadatas=metadatas)
        processed += 1
        total_chunks += len(chunks)
        logger.info("Ingested %s: %d chunks into ChromaDB", doc_path.name, len(chunks))

    total_in_db = collection.count()
    return {
        "status": "SUCCESS",
        "documents_processed": processed,
        "documents_skipped": skipped,
        "chunks_ingested": total_chunks,
        "total_collection_count": total_in_db,
    }
