import json
import numpy as np

# Try to import sentence-transformers, but make it optional
try:
    from sentence_transformers import SentenceTransformer
    SENTENCE_TRANSFORMERS_AVAILABLE = True
except ImportError:
    SENTENCE_TRANSFORMERS_AVAILABLE = False

# Load model (cached after first load)
_model = None

def get_model():
    """Get or load the sentence transformer model"""
    global _model
    if not SENTENCE_TRANSFORMERS_AVAILABLE:
        return None
    if _model is None:
        # Using a lightweight model - can be changed to a larger one
        _model = SentenceTransformer('all-MiniLM-L6-v2')
    return _model

def get_embedding(text: str) -> list[float]:
    """
    Generate embedding for a text string
    
    Args:
        text: The text to embed
    
    Returns:
        List of floats representing the embedding vector
    """
    if SENTENCE_TRANSFORMERS_AVAILABLE:
        model = get_model()
        if model:
            embedding = model.encode(text, convert_to_numpy=True)
            return embedding.tolist()
    
    # Fallback: return empty embedding (search will use text matching instead)
    return []

def get_embeddings(texts: list[str]) -> list[list[float]]:
    """
    Generate embeddings for multiple texts
    
    Args:
        texts: List of texts to embed
    
    Returns:
        List of embedding vectors
    """
    if SENTENCE_TRANSFORMERS_AVAILABLE:
        model = get_model()
        if model:
            embeddings = model.encode(texts, convert_to_numpy=True)
            return embeddings.tolist()
    
    # Fallback: return empty embeddings
    return [[] for _ in texts]

def embedding_to_string(embedding: list[float]) -> str:
    """Convert embedding list to JSON string for storage"""
    return json.dumps(embedding)

def string_to_embedding(embedding_str: str) -> list[float]:
    """Convert JSON string back to embedding list"""
    return json.loads(embedding_str)
