import re

STOP_WORDS = {
    'what', 'is', 'how', 'many', 'are', 'the', 'a', 'an', 'of', 'in', 'for', 'on',
    'with', 'at', 'by', 'to', 'from', 'my', 'your', 'our', 'their', 'who', 'whom',
    'which', 'that', 'this', 'these', 'those', 'where', 'when', 'why', 'can', 'you',
    'please', 'tell', 'show', 'get', 'give', 'list', 'find', 'about', 'some', 'any'
}

def rewrite_query(question: str) -> list[str]:
    # Keep the user's wording as one query, then add a small number of
    # deterministic linguistic variants. Do not add unrelated fallback
    # queries: those can retrieve plausible-looking but irrelevant passages.
    original = question.strip()
    if not original:
        return []

    queries = [original]

    # Normalize possessives and common shorthand without embedding any
    # answer-specific knowledge in the retriever. This lets queries such as
    # "Banker's algo" reach documents that say "Banker’s algorithm".
    normalized_text = re.sub(r"\b([\w-]+)['’]s\b", r"\1", original.lower())
    words = re.findall(r'\b\w+\b', normalized_text)
    keywords = [w for w in words if w not in STOP_WORDS]
    keywords_str = " ".join(keywords)

    if keywords_str and keywords_str != original.lower():
        queries.append(keywords_str)

    canonical_words = []
    for word in keywords:
        if word == "algo":
            word = "algorithm"
        elif word == "algos":
            word = "algorithms"
        elif len(word) > 4 and word.endswith("s") and not word.endswith(("ss", "us", "is")):
            # Lightweight singular normalization for retrieval only.
            word = word[:-1]
        canonical_words.append(word)

    canonical_query = " ".join(canonical_words)
    if canonical_query and canonical_query not in {q.lower() for q in queries}:
        queries.append(canonical_query)


    # Detect categories
    is_placement = any(w in words for w in ['placement', 'placements', 'recruit', 'recruitment', 'job', 'jobs', 'placed', 'eligible', 'eligibility', 'company', 'companies'])
    is_cgpa = any(w in words for w in ['cgpa', 'sgpa', 'gpa', 'grade', 'grades', 'transcript', 'marksheet', 'marks', 'score', 'scorecard'])
    is_resume = any(w in words for w in ['resume', 'cv', 'resumes', 'skill', 'skills', 'experience', 'projects'])
    is_attendance = any(w in words for w in ['attendance', 'present', 'absent', 'bunk', 'percentage'])
    is_policy = any(w in words for w in ['policy', 'rule', 'rules', 'regulation', 'regulations', 'criteria', 'guideline', 'guidelines', 'handbook'])
    is_numeric = any(w in words for w in ['count', 'number', 'how many', 'total', 'average', 'percentage']) or any(w.isdigit() for w in words)

    if is_placement:
        queries.extend([
            "eligible students placement",
            "placement statistics",
            "placement report",
            "campus recruitment",
            "students placed"
        ])
    elif is_cgpa:
        queries.extend([
            "cgpa",
            "grade point",
            "academic transcript",
            "marksheet"
        ])
    elif is_resume:
        queries.extend([
            "student resume",
            "skills section",
            "experience profile",
            "project portfolio"
        ])
    elif is_attendance:
        queries.extend([
            "attendance percentage",
            "class presence",
            "attendance policy",
            "academic rules"
        ])
    elif is_policy:
        queries.extend([
            "policy guidelines",
            "student handbook",
            "rules regulations",
            "criteria guidelines"
        ])

    if is_numeric:
        queries.extend([
            "statistics report",
            "summary count",
            "data table statistics"
        ])

    # Deduplicate preserving order
    unique_queries = []
    seen = set()
    for q in queries:
        q_clean = q.strip().lower()
        if q_clean and q_clean not in seen:
            seen.add(q_clean)
            # Preserve original casing for first query if possible
            if len(unique_queries) == 0:
                unique_queries.append(original)
            else:
                unique_queries.append(q)

    # Limit the number of meaningful variants to keep retrieval predictable.
    return unique_queries[:6]
