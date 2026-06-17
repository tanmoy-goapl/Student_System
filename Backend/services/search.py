import logging
import re
from sqlalchemy.orm import Session
from models import Document
from chroma_store import query_chunks

logger = logging.getLogger("chatbot")

def _detect_mentioned_doc(question: str, docs: list[Document]) -> list[int]:
    q = question.lower()
    mentioned_ids = []
    for doc in docs:
        filename = doc.filename.lower()
        basename = filename.split('.')[0] if '.' in filename else filename
        # Clean any underscores, hyphens, spaces
        tokens = [t for t in re.split(r'[\s_\-]', basename) if len(t) > 2]
        
        # Check if the filename or basename matches
        if filename in q or basename in q:
            mentioned_ids.append(doc.id)
            continue
        
        # Check if any significant token matches
        for t in tokens:
            if t in q:
                mentioned_ids.append(doc.id)
                break
    return mentioned_ids

def _extract_chunks(results, doc_id_to_name: dict[int, str]) -> list[dict]:
    extracted = []
    if not results or "documents" not in results or not results["documents"]:
        return extracted
    
    docs_list = results["documents"][0]
    metas_list = results.get("metadatas", [[]])[0] if results.get("metadatas") else []
    distances_list = results.get("distances", [[]])[0] if results.get("distances") else []
    
    for idx, text in enumerate(docs_list):
        meta = metas_list[idx] if idx < len(metas_list) else {}
        dist = distances_list[idx] if idx < len(distances_list) else 1.0
        
        # Sometimes metadata document_id can be string/int, normalize it
        doc_id = meta.get("document_id")
        if doc_id is not None:
            try:
                doc_id = int(doc_id)
            except ValueError:
                pass
        
        chunk_idx = meta.get("chunk_index", 0)
        doc_name = doc_id_to_name.get(doc_id, f"Document #{doc_id}")
        
        extracted.append({
            "document": doc_name,
            "text": text,
            "document_id": doc_id,
            "chunk_index": chunk_idx,
            "distance": dist
        })
    return extracted

def search_relevant_chunks(
    question: str,
    student_id: int,
    role: str,
    db: Session,
    top_k: int = 8
) -> list[dict]:
    logger.info(f"[Search] Searching relevant chunks for student_id={student_id}, question='{question}'")
    
    # 1. Fetch student's documents from PostgreSQL
    docs = db.query(Document).filter(Document.student_id == student_id).all()
    if not docs:
        logger.info("[Search] No documents found in database for this student.")
        return []
        
    doc_ids = [d.id for d in docs]
    doc_id_to_name = {d.id: d.filename for d in docs}
    logger.info(f"[Search] Student has {len(docs)} document(s): {list(doc_id_to_name.values())}")
    
    # 2. Check if specific document is mentioned
    mentioned_ids = _detect_mentioned_doc(question, docs)
    
    all_extracted_chunks = []
    
    if mentioned_ids:
        logger.info(f"[Search] Mentioned document(s) detected: {[doc_id_to_name[mid] for mid in mentioned_ids]}")
        # Query mentioned docs for most of the budget
        mentioned_k = max(2, top_k - 2)
        res_mentioned = query_chunks(question, top_k=mentioned_k, allowed_doc_ids=mentioned_ids)
        all_extracted_chunks.extend(_extract_chunks(res_mentioned, doc_id_to_name))
        
        # Query remaining docs if any exist for the remaining budget
        other_ids = [did for did in doc_ids if did not in mentioned_ids]
        if other_ids:
            res_others = query_chunks(question, top_k=2, allowed_doc_ids=other_ids)
            all_extracted_chunks.extend(_extract_chunks(res_others, doc_id_to_name))
    else:
        logger.info("[Search] No specific document mentioned. Performing balanced retrieval across all documents.")
        # Perform per-document queries to ensure each document is represented
        per_doc_k = max(2, top_k // len(docs))
        for doc in docs:
            logger.info(f"[Search] Querying document '{doc.filename}' (ID: {doc.id}) for up to {per_doc_k} chunks...")
            res_doc = query_chunks(question, top_k=per_doc_k, allowed_doc_ids=[doc.id])
            all_extracted_chunks.extend(_extract_chunks(res_doc, doc_id_to_name))
            
        # Also perform a global query across all student's documents for general relevancy/diversity
        logger.info(f"[Search] Performing global query across all documents for top_{top_k}...")
        res_global = query_chunks(question, top_k=top_k, allowed_doc_ids=doc_ids)
        all_extracted_chunks.extend(_extract_chunks(res_global, doc_id_to_name))
        
    # 3. Deduplicate chunks using (document_id, chunk_index)
    seen_chunks = set()
    deduped_chunks = []
    for chunk in all_extracted_chunks:
        key = (chunk["document_id"], chunk["chunk_index"])
        if key not in seen_chunks:
            seen_chunks.add(key)
            deduped_chunks.append(chunk)
            
    # 4. Group chunks by document_id and sort within each group by relevance (distance ascending)
    by_doc = {}
    for chunk in deduped_chunks:
        did = chunk["document_id"]
        if did not in by_doc:
            by_doc[did] = []
        by_doc[did].append(chunk)
        
    for did in by_doc:
        by_doc[did].sort(key=lambda x: x.get("distance", 1.0))
        
    # 5. Round-robin selection to ensure balanced representation across all documents
    final_chunks = []
    doc_ids_list = list(by_doc.keys())
    
    while len(final_chunks) < top_k and any(by_doc.values()):
        for did in doc_ids_list:
            if by_doc[did]:
                final_chunks.append(by_doc[did].pop(0))
                if len(final_chunks) >= top_k:
                    break

    logger.info(f"[Search] Finished search. Returning {len(final_chunks)} chunks after balanced round-robin selection.")
    return final_chunks

def build_rich_context(chunks: list[dict]) -> str:
    if not chunks:
        return ""
    
    grouped = {}
    for c in chunks:
        doc = c.get("document", "Unknown Document")
        if doc not in grouped:
            grouped[doc] = []
        grouped[doc].append(c)
        
    lines = []
    for doc_name, doc_chunks in grouped.items():
        lines.append(f"--- DOCUMENT: {doc_name} ---")
        sorted_chunks = sorted(doc_chunks, key=lambda x: x.get("chunk_index", 0))
        for c in sorted_chunks:
            lines.append(f"[Chunk {c.get('chunk_index', 0)}]:")
            lines.append(c.get("text", ""))
        lines.append("")
        
    return "\n".join(lines)
