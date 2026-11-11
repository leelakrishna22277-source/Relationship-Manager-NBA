"""Configuration for BNK-10 ChromaDB Policy RAG Store."""
import os
from pathlib import Path

# Base paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
KNOWLEDGE_BASE_DIR = BASE_DIR / "knowledge_base"
CHROMA_PERSIST_DIR = BASE_DIR / "data" / "chroma"

# Ensure directories exist
CHROMA_PERSIST_DIR.mkdir(parents=True, exist_ok=True)

# ChromaDB Settings
COLLECTION_NAME = "bnk10_policy_store"
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"

# Chunking & Retrieval Parameters
DEFAULT_CHUNK_SIZE = 500
DEFAULT_CHUNK_OVERLAP = 100
DEFAULT_RETRIEVAL_K = 3
RELEVANCE_DISTANCE_THRESHOLD = 1.35  # Cosine/L2 distance cutoff for policy relevance
