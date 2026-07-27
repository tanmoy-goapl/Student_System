import logging
from sqlalchemy.orm import Session
from models import Document
from chroma_store import query_chunks, get_all_chunks_for_document, get_chunks_by_ids
from services.query_planner import RetrievalStrategy
from services.search import _extract_chunks

logger = logging.getLogger(__name__)

PER_DOC_QUOTA = 5
GLOBAL_TOP_K = 20
MAX_CONTEXT_LEN = 12000


def build_context(
    strategy: RetrievalStrategy,
    question: str,
    target_docs: list[Document],
    searched_docs: list[Document],
    db: Session
) -> tuple[list[dict], list[str], list[str], str]:
    """
    Builds context according to the designated retrieval strategy using per-document quotas.
    Returns:
      (final_chunks, searched_doc_filenames, retrieved_doc_filenames, context_string)
    """
    searched_doc_names = [d.filename for d in searched_docs]
    doc_id_to_name = {d.id: d.filename for d in searched_docs}

    chunks: list[dict] = []
    total_retrieved = 0
    total_merged = 0
    total_reranked = 0
    total_expanded = 0

    queries = [question]
    if strategy.enable_query_rewrite:
        from services.query_rewriter import rewrite_query
        queries = rewrite_query(question)
        logger.info(f"[ContextBuilder] Original query: {question}")
        logger.info(f"[ContextBuilder] Expanded queries: {queries}")

    if strategy == RetrievalStrategy.DOCUMENT_RECONSTRUCTION:
        logger.info(f"[ContextBuilder] Running DOCUMENT_RECONSTRUCTION on {len(target_docs)} docs")
        for doc in target_docs:
            raw = get_all_chunks_for_document(doc.id)
            total_retrieved += len(raw)
            total_merged += len(raw)
            for c in raw:
                chunks.append({
                    "document": doc.filename,
                    "document_id": doc.id,
                    "chunk_index": c["chunk_index"],
                    "text": c["text"],
                    "similarity": 1.0
                })

    elif strategy == RetrievalStrategy.PER_DOCUMENT_SEARCH:
        logger.info(f"[ContextBuilder] Running PER_DOCUMENT_SEARCH with quota={PER_DOC_QUOTA} per doc on {len(target_docs)} target docs")
        for doc in target_docs:
            doc_all_chunks = []
            for q in queries:
                res = query_chunks(q, top_k=PER_DOC_QUOTA, allowed_doc_ids=[doc.id])
                doc_chunks = _extract_chunks(res, doc_id_to_name)
                total_retrieved += len(doc_chunks)
                logger.info(f"[ContextBuilder] Query '{q}' retrieved {len(doc_chunks)} chunks for doc {doc.filename}")
                doc_all_chunks.extend(doc_chunks)
            
            # Deduplicate by (document_id, chunk_index) keeping the smallest distance
            deduped = {}
            for dc in doc_all_chunks:
                key = (dc.get("document_id"), dc.get("chunk_index"))
                if key not in deduped or dc.get("distance", 2.0) < deduped[key].get("distance", 2.0):
                    deduped[key] = dc
            
            doc_final_chunks = list(deduped.values())
            total_merged += len(doc_final_chunks)
            doc_final_chunks.sort(key=lambda x: x.get("distance", 2.0))
            chunks.extend(doc_final_chunks[:PER_DOC_QUOTA])
            logger.info(f"[ContextBuilder] Merged chunk count for doc {doc.filename}: {len(doc_final_chunks)}")

    else:  # GLOBAL_SEARCH
        logger.info(f"[ContextBuilder] Running GLOBAL_SEARCH top_k={GLOBAL_TOP_K} on {len(searched_docs)} docs")
        searched_ids = [d.id for d in searched_docs]
        if searched_ids:
            all_chunks = []
            for q in queries:
                res = query_chunks(q, top_k=GLOBAL_TOP_K, allowed_doc_ids=searched_ids)
                q_chunks = _extract_chunks(res, doc_id_to_name)
                total_retrieved += len(q_chunks)
                logger.info(f"[ContextBuilder] Query '{q}' retrieved {len(q_chunks)} chunks globally")
                all_chunks.extend(q_chunks)
            
            # Deduplicate by (document_id, chunk_index) keeping the smallest distance
            deduped = {}
            for c in all_chunks:
                key = (c.get("document_id"), c.get("chunk_index"))
                if key not in deduped or c.get("distance", 2.0) < deduped[key].get("distance", 2.0):
                    deduped[key] = c
            
            final_chunks = list(deduped.values())
            total_merged += len(final_chunks)
            final_chunks.sort(key=lambda x: x.get("distance", 2.0))
            chunks = final_chunks[:GLOBAL_TOP_K]
            logger.info(f"[ContextBuilder] Merged chunk count globally: {len(final_chunks)}")

    # Reranking step
    import re
    STOP_WORDS = {
        'what', 'is', 'how', 'many', 'are', 'the', 'a', 'an', 'of', 'in', 'for', 'on',
        'with', 'at', 'by', 'to', 'from', 'my', 'your', 'our', 'their', 'who', 'whom',
        'which', 'that', 'this', 'these', 'those', 'where', 'when', 'why', 'can', 'you',
        'please', 'tell', 'show', 'get', 'give', 'list', 'find', 'about', 'some', 'any'
    }
    q_words = set(re.findall(r'\b\w+\b', question.lower()))
    q_keywords = {w for w in q_words if w not in STOP_WORDS}

    for c in chunks:
        # 1. Semantic Similarity
        if c.get("similarity") is None:
            dist = c.get("distance", 2.0)
            c["similarity"] = round(max(0.0, 1.0 - (dist / 2.0)), 3)
        
        # 2. Keyword Overlap
        c_text = c.get("text", "").lower()
        c_words = set(re.findall(r'\b\w+\b', c_text))
        overlap_count = len(q_keywords.intersection(c_words))
        keyword_score = round(overlap_count / len(q_keywords), 3) if q_keywords else 0.0

        # 3. Numeric Keyword Boost
        num_boost = 0.0
        boost_terms = ['how many', 'total', 'count', 'percentage', 'highest', 'lowest', 'average', 'cgpa', 'marks', 'eligible', 'placed']
        for term in boost_terms:
            if term in c_text:
                num_boost += 0.15
        num_boost = round(num_boost, 3)

        # Final score
        final_score = round(c["similarity"] + keyword_score + num_boost, 3)
        c["keyword_score"] = keyword_score
        c["numeric_boost"] = num_boost
        c["rerank_score"] = final_score

        logger.info(
            f"[Reranking] Chunk index {c.get('chunk_index')} of {c.get('document')} -> "
            f"Similarity: {c['similarity']}, Keyword Score: {keyword_score}, "
            f"Numeric Boost: {num_boost}, Final Score: {final_score}"
        )

    # Sort chunks by final score (descending)
    chunks.sort(key=lambda x: x.get("rerank_score", 0.0), reverse=True)
    total_reranked = len(chunks)

    # Neighbor Chunk Expansion
    neighbor_ids = []
    for c in chunks:
        doc_id = c.get("document_id")
        chunk_idx = c.get("chunk_index")
        if doc_id is None or chunk_idx is None:
            continue
        for offset in [-1, 0, 1]:
            idx = chunk_idx + offset
            if idx >= 0:
                neighbor_ids.append(f"{doc_id}_{idx}")

    fetched_map = {}
    if neighbor_ids:
        # Deduplicate IDs to avoid redundant query payload
        fetched = get_chunks_by_ids(list(set(neighbor_ids)))
        for f in fetched:
            fetched_map[(f["document_id"], f["chunk_index"])] = f["text"]

    expanded_chunks = []
    seen = set()
    for group_idx, c in enumerate(chunks):
        doc_id = c.get("document_id")
        doc_name = c.get("document")
        similarity = c.get("similarity")
        distance = c.get("distance", 2.0)
        chunk_idx = c.get("chunk_index")
        if doc_id is None or chunk_idx is None:
            continue

        group_items = []
        for offset in [-1, 0, 1]:
            idx = chunk_idx + offset
            if idx < 0:
                continue
            key = (doc_id, idx)
            if key in seen:
                continue
            seen.add(key)

            if key in fetched_map:
                group_items.append({
                    "document": doc_name,
                    "document_id": doc_id,
                    "chunk_index": idx,
                    "text": fetched_map[key],
                    "similarity": similarity,
                    "distance": distance,
                    "group_id": group_idx
                })
        
        # Keep neighbors sorted by chunk_index within their own retrieval group
        group_items.sort(key=lambda x: x["chunk_index"])
        expanded_chunks.extend(group_items)

    chunks = expanded_chunks
    total_expanded = len(chunks)

    # Log diagnostics for debugging
    logger.info("=== RETRIEVAL DIAGNOSTICS START ===")
    logger.info(f"Total retrieved chunks: {total_retrieved}")
    logger.info(f"Total merged chunks: {total_merged}")
    logger.info(f"Total reranked chunks: {total_reranked}")
    logger.info(f"Total neighbor-expanded chunks: {total_expanded}")
    
    for c in chunks:
        logger.info("----------------------------------------")
        logger.info(f"Document Name: {c.get('document')}")
        logger.info(f"Chunk Index: {c.get('chunk_index')}")
        logger.info(f"Similarity: {c.get('similarity')}")
        logger.info(f"Distance: {c.get('distance')}")
        logger.info(f"Chunk Text:\n{c.get('text')}")
        logger.info("----------------------------------------")
    logger.info("=== RETRIEVAL DIAGNOSTICS END ===")

    retrieved_doc_names = list(dict.fromkeys([c["document"] for c in chunks if c.get("document")]))

    # Format context string cleanly preserving semantic retrieval groups
    context_str = _format_context_string(chunks)

    logger.info(f"[ContextBuilder] Retrieved {len(chunks)} chunks from {len(retrieved_doc_names)} doc(s): {retrieved_doc_names}")
    return chunks, searched_doc_names, retrieved_doc_names, context_str


def _format_context_string(chunks: list[dict]) -> str:
    if not chunks:
        return ""

    # Group chunks by group_id while preserving the order of group_id appearance
    groups = {}
    group_order = []
    for c in chunks:
        g_id = c.get("group_id", 0)
        if g_id not in groups:
            groups[g_id] = []
            group_order.append(g_id)
        groups[g_id].append(c)

    lines = []
    for g_id in group_order:
        group_chunks = groups[g_id]
        if not group_chunks:
            continue
        
        # Sort the chunks within this group by chunk_index to ensure proper document reconstruction order
        group_chunks.sort(key=lambda x: x.get("chunk_index", 0))
        
        # Get document name from the first chunk in the group
        doc_name = group_chunks[0].get("document", "Unknown Document")
        
        lines.append(f"[Source: {doc_name}]")
        lines.append("")
        for gc in group_chunks:
            lines.append(gc.get("text", "").strip())
            lines.append("")
        lines.append("-" * 50)
        lines.append("")

    formatted = "\n".join(lines).strip()
    return formatted[:MAX_CONTEXT_LEN]
