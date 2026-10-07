# 07. LLM, GPT-OSS, RAG, and external-service preview

## LLM configuration names

`Backend/config.py` reads these names; their values are intentionally not reproduced:

- GPT/OpenAI-compatible provider: `OPENAI_API_KEY`, `GPT4O_MINI_API_KEY`, `OPENAI_API_BASE_URL`, `GPT4O_MINI_BASE_URL`, `LLM_NAME`, `GPT_MODEL`.
- Llama/Red Hat AI provider: `REDHATAI_BASE_URL`, `LLAMA_BASE_URL`, `REDHATAI_API_KEY`, `LLAMA_API_KEY`, `LLAMA_MODEL`, `REDHATAI_MODEL`.
- Provider selection: `DEFAULT_LLM_PROVIDER` with `gpt4o` or `llama` values.

The architecture document (`Backend/system_architecture_doc.md`) describes a GPT-OSS provider and Red Hat AI Llama endpoint. Runtime code uses generic OpenAI-compatible base URL/model configuration. No dedicated `GPT_OSS_*` variable was identified in the inspected code; GPT-OSS appears to be selected through the generic model name configuration and referenced in comments/documentation.

## LLM call origins

- `Backend/services/llm_client.py`: general chat completion and streaming path used by `Backend/routes/chat.py`. It builds a provider fallback chain, caches OpenAI clients, applies a ten-second call timeout, and returns streamed content.
- `Backend/services/practice/base.py`: separate synchronous and streaming provider chain used by practice/content and classroom curriculum flows. Its timeout behavior is separate from the general chat client.
- `Backend/services/roadmap/roadmap_engine.py`: separate OpenAI client path for structured roadmap generation, with JSON cleanup/fallback handling.
- `Backend/routes/upload.py`: direct OpenAI client use for optional document classification when rule-based classification returns `general`.
- `Backend/services/practice/question_generator.py` and `content_generator.py`: feature-level generation and caching paths that use Chroma context and the practice LLM helper.

This is more than one LLM integration path. Provider selection is process-local in `Backend/llm_state.py`; the `/settings/llm` endpoint changes that in-memory value and does not visibly persist it by user or database.

## RAG/document ingestion flow

```text
upload request
  -> Backend/routes/upload.py
  -> save file under Backend/uploads/
  -> services/extract.py: PDF/TXT/DOCX/image extraction
  -> extractor chunk_text(): word-based chunks with overlap
  -> services/embedding.py: all-MiniLM-L6-v2
  -> chroma_store.py: persistent collection document_chunks
  -> topic extraction / caches

chat request
  -> routes/chat.py: intent/retrieval mode
  -> services/document_resolver.py: role/visibility document set
  -> services/query_planner.py: reconstruction/per-document/global strategy
  -> services/query_rewriter.py: optional query expansion
  -> context_builder.py + chroma_store.py: filtered search, rerank, neighbor expansion
  -> services/chatbot/chat_prompts.py: grounded prompt
  -> services/llm_client.py: streamed answer
```

The index uses Chroma metadata containing `document_id` and `chunk_index`. `Backend/models.py` also defines a relational `document_chunks` table, but `Backend/routes/upload.py` explicitly stores chunks in Chroma in the inspected path; the actual synchronization/usage of the relational table should be verified later.

## Retrieval modes and prompt behavior

`Backend/services/chatbot/chat_intent.py` identifies strict-document, factual-RAG, learning, personalized-advisor, and roadmap-creation modes. `Backend/services/chatbot/chat_prompts.py` applies role guidance and mode-specific grounding rules. `Backend/services/context_builder.py` performs semantic/keyword reranking, numeric boosts, neighbor expansion, and context length trimming.

## External services and local components

- PostgreSQL is the configured relational service in Compose.
- ChromaDB and the SentenceTransformer model are local backend-side components, with Hugging Face cache mounted by Compose and offline mode requested.
- LLM endpoints are external to the backend process and appear to be OpenAI-compatible. The architecture notes identify GPT-OSS and Red Hat AI Llama; the exact live endpoint/model selection comes from environment configuration and was not verified by starting services.
- No separately configured queue, cache service, reverse proxy, or GPT-OSS container appears in `docker-compose.yml`.

## High-level follow-up questions

Step 2 should trace which routes use `llm_client.py` versus `practice/base.py`, whether all calls share timeout/retry/logging policies, how Chroma and SQL document chunks are intended to coexist, and whether the documented GPT-OSS deployment matches the current environment values. Secret values and tokens are intentionally excluded from this report.
