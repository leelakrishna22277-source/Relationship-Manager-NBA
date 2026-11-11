"""Tests for LangChain integration in BNK-10 AI Service."""
import pytest
from app.llm.langchain_runner import (
    build_nba_langchain_runnable,
    build_outreach_langchain_runnable,
    get_langchain_chat_model,
)
from app.rag.retriever import LangchainPolicyRetriever


def test_langchain_chat_model_initialization():
    """Verify that LangChain ChatOpenAI initializes with enterprise endpoints."""
    chat_model = get_langchain_chat_model()
    assert chat_model is not None
    assert "glm" in chat_model.model_name.lower() or "glm" in str(chat_model.model).lower()


def test_langchain_lcel_runnables_compile():
    """Verify that LangChain LCEL runnable chains compile with prompt and parser."""
    nba_chain = build_nba_langchain_runnable()
    assert nba_chain is not None

    outreach_chain = build_outreach_langchain_runnable()
    assert outreach_chain is not None


def test_langchain_policy_retriever():
    """Verify that LangChain BaseRetriever adapter retrieves policy documents."""
    assert LangchainPolicyRetriever is not None
    retriever = LangchainPolicyRetriever(k=2, doc_type="SUITABILITY_POLICY")
    docs = retriever.invoke("What are the risk rules for conservative clients?")
    assert isinstance(docs, list)
    if docs:
        assert hasattr(docs[0], "page_content")
        assert "POL-SUIT" in docs[0].metadata.get("document_id", "")

