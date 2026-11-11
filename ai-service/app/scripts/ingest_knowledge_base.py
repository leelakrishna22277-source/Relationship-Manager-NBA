"""CLI script to ingest knowledge base documents into ChromaDB."""
import argparse
import json
import logging
import sys

try:
    from ..rag.ingest import ingest_knowledge_base
except (ImportError, ValueError):
    from app.rag.ingest import ingest_knowledge_base

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")


def main():
    parser = argparse.ArgumentParser(description="Ingest BNK-10 Knowledge Base markdown policies into ChromaDB.")
    parser.add_argument("--force", action="store_true", help="Force reload and re-chunk all documents.")
    args = parser.parse_args()

    print("\n--- INGESTING BNK-10 KNOWLEDGE BASE INTO CHROMADB ---")
    try:
        result = ingest_knowledge_base(force_reload=args.force)
        print("\n[SUCCESS] Knowledge Base Ingestion Complete:")
        print(json.dumps(result, indent=2))
        sys.exit(0)
    except Exception as exc:
        print(f"\n[ERROR] Ingestion Failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
