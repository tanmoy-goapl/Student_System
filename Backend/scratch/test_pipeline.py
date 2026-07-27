import sys
import os

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database import get_db
from services.chat_intent import detect_retrieval_mode, RetrievalMode
from services.query_planner import plan_retrieval_strategy, RetrievalStrategy
from services.document_resolver import resolve_documents, get_role_visible_docs
from services.context_builder import build_context
from services.chat_prompts import _build_system_prompt

def test_pipeline():
    db = next(get_db())
    student_id = 1
    role = "student"
    question = "Read my resume and list the things I need to learn to get a job from my college placement."

    print("--- 1. Intent Resolver ---")
    mode = detect_retrieval_mode(question, db, student_id)
    print(f"Mode: {mode.value}")

    print("\n--- 2. Document Resolver ---")
    target_docs, searched_docs = resolve_documents(mode, question, student_id, role, db)
    print(f"Target Docs: {[d.filename for d in target_docs]}")
    print(f"Searched Docs: {[d.filename for d in searched_docs]}")

    print("\n--- 3. Query Planner ---")
    strategy = plan_retrieval_strategy(question, has_specific_target_docs=bool(target_docs))
    print(f"Strategy: {strategy.value}")

    print("\n--- 4. Context Builder & Quota Ranker ---")
    chunks, searched_doc_names, retrieved_doc_names, context = build_context(
        strategy=strategy,
        question=question,
        target_docs=target_docs,
        searched_docs=searched_docs,
        db=db
    )
    print(f"Retrieved {len(chunks)} chunks from docs: {retrieved_doc_names}")
    print(f"Context snippet:\n{context[:300]}...")

    print("\n--- 5. System Prompt Construction ---")
    prompt = _build_system_prompt(mode, searched_doc_names, context, role, "Test Student")
    print(f"Prompt header snippet:\n{prompt[:400]}...")

    print("\nSUCCESS: 5-Stage RAG Pipeline executed cleanly!")

if __name__ == "__main__":
    test_pipeline()
