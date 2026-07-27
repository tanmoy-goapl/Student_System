import re

STOP_WORDS = {
    'what', 'is', 'how', 'many', 'are', 'the', 'a', 'an', 'of', 'in', 'for', 'on',
    'with', 'at', 'by', 'to', 'from', 'my', 'your', 'our', 'their', 'who', 'whom',
    'which', 'that', 'this', 'these', 'those', 'where', 'when', 'why', 'can', 'you',
    'please', 'tell', 'show', 'get', 'give', 'list', 'find', 'about', 'some', 'any'
}

def rewrite_query(question: str) -> list[str]:
    # Ensure original question is included and normalized
    original = question.strip()
    if not original:
        return []

    queries = [original]

    # Normalize words
    words = re.findall(r'\b\w+\b', original.lower())
    keywords = [w for w in words if w not in STOP_WORDS]
    keywords_str = " ".join(keywords)

    if keywords_str and keywords_str != original.lower():
        queries.append(keywords_str)

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

    # Fallback to make sure we have at least 3 queries
    fallback_pool = [
        "student profile overview",
        "academic records database",
        "university info handbook",
        "performance metrics report"
    ]
    
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

    # Fill up if less than 3
    for fb in fallback_pool:
        if len(unique_queries) >= 3:
            break
        if fb.lower() not in seen:
            unique_queries.append(fb)
            seen.add(fb.lower())

    # Limit between 3 and 6
    return unique_queries[:6]
