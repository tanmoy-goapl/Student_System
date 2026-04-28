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
        return None
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def get_embedding(text: str) -> list[float]:
    if SENTENCE_TRANSFORMERS_AVAILABLE:
        model = get_model()
        if model:
            return model.encode(text, convert_to_numpy=True).tolist()
    return []


def get_embeddings(texts: list[str]) -> list[list[float]]:
    if SENTENCE_TRANSFORMERS_AVAILABLE:
        model = get_model()
        if model:
            return model.encode(texts, convert_to_numpy=True).tolist()
    return [[] for _ in texts]