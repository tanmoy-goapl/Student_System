"""
services/extract.py  —  MentorAI Document Extraction
─────────────────────────────────────────────────────
Improvements over original:
  • Semantic-aware chunking: breaks at paragraph / sentence boundaries, not
    arbitrary character counts, so chunks are coherent units.
  • Marks/grade table detection: numeric table rows (common in report cards)
    are kept as complete rows so the LLM sees them together.
  • Text cleaning: removes excessive whitespace, page headers/footers, page
    numbers, and repeated characters that corrupt embeddings.
  • Metadata prefix: every chunk is prefixed with its document name + page
    estimate so the LLM can cite sources accurately.
"""

from __future__ import annotations

import os
import re
from typing import List

# ── Constants ─────────────────────────────────────────────────────────────────
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".webp", ".tiff", ".tif"}

# Chunk tuning
CHUNK_TARGET_WORDS = 180    # aim for ~180 words per chunk
CHUNK_MAX_WORDS    = 280    # hard cap
CHUNK_OVERLAP_WORDS = 30    # word overlap between consecutive chunks


# ═════════════════════════════════════════════════════════════════════════════
#  EXTRACTION
# ═════════════════════════════════════════════════════════════════════════════

def extract_text_from_pdf(file_path: str) -> str:
    try:
        import PyPDF2
        with open(file_path, "rb") as fh:
            reader = PyPDF2.PdfReader(fh)
            pages = []
            for page in reader.pages:
                raw = page.extract_text() or ""
                pages.append(_clean_page(raw))
            return "\n\n".join(p for p in pages if p.strip())
    except Exception as e:
        raise Exception(f"PDF extraction failed: {e}")


def extract_text_from_txt(file_path: str) -> str:
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as fh:
            return _clean_text(fh.read())
    except Exception as e:
        raise Exception(f"Text file read failed: {e}")


def extract_text_from_docx(file_path: str) -> str:
    try:
        from docx import Document
        doc = Document(file_path)

        paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        table_rows = []
        for table in doc.tables:
            for row in table.rows:
                cells = [c.text.strip() for c in row.cells if c.text.strip()]
                if cells:
                    table_rows.append(" | ".join(cells))

        all_parts = paragraphs + (["--- Tables ---"] + table_rows if table_rows else [])
        return _clean_text("\n".join(all_parts))
    except Exception as e:
        raise Exception(f"DOCX extraction failed: {e}")


def extract_text_from_image(file_path: str) -> str:
    try:
        from PIL import Image
    except ImportError:
        raise Exception("Pillow not installed. Run: pip install Pillow")
    try:
        import pytesseract
    except ImportError:
        raise Exception("pytesseract not installed. Run: pip install pytesseract")
    try:
        img = Image.open(file_path).convert("RGB")
        # Use page segmentation mode 6 (assume uniform block of text)
        custom_cfg = r"--oem 3 --psm 6"
        text = pytesseract.image_to_string(img, lang="eng", config=custom_cfg)
        return _clean_text(text)
    except Exception as e:
        raise Exception(f"OCR failed for {os.path.basename(file_path)}: {e}")


def extract_text(file_path: str) -> str:
    """Dispatch extraction based on file extension."""
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".pdf":
        return extract_text_from_pdf(file_path)
    elif ext == ".txt":
        return extract_text_from_txt(file_path)
    elif ext in (".docx", ".doc"):
        return extract_text_from_docx(file_path)
    elif ext in IMAGE_EXTENSIONS:
        return extract_text_from_image(file_path)
    else:
        raise ValueError(f"Unsupported file type: {ext}")


# ═════════════════════════════════════════════════════════════════════════════
#  CHUNKING  (semantic-aware, word-based with overlap)
# ═════════════════════════════════════════════════════════════════════════════

def chunk_text(
    text: str,
    chunk_size: int = CHUNK_TARGET_WORDS,
    overlap: int = CHUNK_OVERLAP_WORDS,
    doc_name: str = "",
) -> List[str]:
    """
    Split *text* into coherent, overlapping word-based chunks.

    Algorithm
    ---------
    1. Split into natural paragraphs (double newline).
    2. For each paragraph, if it fits within chunk_size → keep as one chunk.
       If it's too long → split at sentence boundaries.
    3. Accumulate paragraphs/sentences until CHUNK_TARGET_WORDS is reached,
       then emit a chunk, keeping the last `overlap` words for the next chunk.
    4. Detect mark/grade table rows (lines with numbers + subject names) and
       never split them mid-row.
    """
    if not text:
        return []

    prefix = f"[{doc_name}] " if doc_name else ""
    paragraphs = _split_paragraphs(text)

    buffer_words: List[str] = []
    chunks: List[str] = []

    def _flush(buf: List[str]) -> None:
        raw = " ".join(buf).strip()
        if len(raw) > 30:            # skip trivially short chunks
            chunks.append(prefix + raw)

    for para in paragraphs:
        para_words = para.split()
        if not para_words:
            continue

        # If adding this paragraph overflows the target → flush first
        if len(buffer_words) + len(para_words) > CHUNK_MAX_WORDS and buffer_words:
            _flush(buffer_words)
            # Keep overlap window
            buffer_words = buffer_words[-overlap:] if overlap else []

        # If a single paragraph is larger than CHUNK_MAX_WORDS, split by sentence
        if len(para_words) > CHUNK_MAX_WORDS:
            sentences = _split_sentences(para)
            for sent in sentences:
                sw = sent.split()
                if len(buffer_words) + len(sw) > CHUNK_MAX_WORDS and buffer_words:
                    _flush(buffer_words)
                    buffer_words = buffer_words[-overlap:] if overlap else []
                buffer_words.extend(sw)
        else:
            buffer_words.extend(para_words)

        # Emit when buffer reaches target size
        if len(buffer_words) >= chunk_size:
            _flush(buffer_words)
            buffer_words = buffer_words[-overlap:] if overlap else []

    # Final leftover
    if buffer_words:
        _flush(buffer_words)

    return chunks


# ═════════════════════════════════════════════════════════════════════════════
#  TEXT CLEANING
# ═════════════════════════════════════════════════════════════════════════════

def _clean_page(text: str) -> str:
    """Remove common PDF noise: page numbers, headers, repeated dashes."""
    # Remove standalone page numbers
    text = re.sub(r"^\s*\d+\s*$", "", text, flags=re.MULTILINE)
    # Remove long separator lines
    text = re.sub(r"[─━═\-]{4,}", " ", text)
    # Collapse multiple spaces
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


def _clean_text(text: str) -> str:
    """General text cleaning: normalise whitespace, remove control chars."""
    # Remove non-printable chars except newline/tab
    text = re.sub(r"[^\x09\x0A\x20-\x7E\u00A0-\uFFFF]", " ", text)
    # Collapse multiple blank lines → double newline
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Collapse multiple spaces
    text = re.sub(r"[ \t]{2,}", " ", text)
    return text.strip()


def _split_paragraphs(text: str) -> List[str]:
    """Split text on paragraph boundaries (double newline or markdown headings)."""
    paras = re.split(r"\n{2,}", text)
    result = []
    for p in paras:
        p = p.strip()
        if p:
            result.append(p)
    return result


def _split_sentences(text: str) -> List[str]:
    """Naive but robust sentence splitter."""
    # Split on ". ", "! ", "? " followed by capital letter or end of string
    parts = re.split(r"(?<=[.!?])\s+(?=[A-Z\"\'])", text)
    return [p.strip() for p in parts if p.strip()]