import numpy as np

try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False

_model = None

def get_model():
    global _model
    if not SENTENCE_TRANSFORMERS_AVAILABLE:
        raise RuntimeError("Embedding model not initialized. Cannot continue indexing.")
        
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
        print("Sentence Transformers Available:", SENTENCE_TRANSFORMERS_AVAILABLE)
        print("Embedding Model:", _model)
    return _model


def get_embedding(text: str) -> list[float]:
    model = get_model()
    return model.encode(text, convert_to_numpy=True).tolist()


def get_embeddings(texts: list[str]) -> list[list[float]]:
    model = get_model()
    return model.encode(texts, convert_to_numpy=True).tolist()