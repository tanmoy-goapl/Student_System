import os
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from services.practice.base import _practice_llm_stream

def test():
    print("Testing LLM stream with large max_tokens...")
    
    topic = "System Boot"
    subject = "Operating Systems"
    context = "(Use highly rigorous general knowledge for a college level curriculum)"
    proficiency = "Beginner"
    
    system_prompt = f"""You are a university professor explaining a complex concept to a student.
Teach the topic "{topic}" in a simple, highly readable, and structured learning note style (like an AI tutor, not a textbook).
Keep paragraphs short. Avoid dumping technical terms together. Use simple analogies.

Adjust the complexity and technical depth of your explanation to match the student's proficiency level: "{proficiency}".

CRITICAL: You MUST structure your markdown explanation exactly and ONLY with the following four headings. Do NOT output any other headings, subheadings, or numbered subtopics:

# What is {topic}?

Simple explanation.

---

## Why is it important?

Explain why students should learn it.

---

## How does it work?

Step-by-step explanation.

---

## Real-world Example

Simple example/analogy. Start with:
💡 Example: ...

---REVISION---
{{
    "title": "Key Takeaways",
    "points": [
        {{"id": 1, "text": "Hard-hitting interview tip or takeaway 1"}},
        {{"id": 2, "text": "Hard-hitting interview tip or takeaway 2"}},
        {{"id": 3, "text": "Hard-hitting interview tip or takeaway 3"}}
    ]
}}
"""
    context_str = f"Subject / Context: {subject or 'General Computer Science'}\n"
    user_prompt = f"SUBJECT:\n{subject}\n\nTOPIC:\n{topic}\n\nCONTEXT:\n{context_str}{context}\n\nGenerate the study guide and revision JSON.\nIMPORTANT: Only use the CONTEXT if it strictly belongs to the SUBJECT ({subject}). Map all technical facts from the CONTEXT strictly under the four mandated headings: '# What is...', '## Why is it important?', '## How does it work?', and '## Real-world Example'.\n"

    print("\nAttempting stream call with 6000 max_tokens...")
    try:
        chunks = []
        for chunk in _practice_llm_stream(system_prompt, user_prompt, max_tokens=6000):
            chunks.append(chunk)
            # Print first 20 chunks only to see if it starts successfully
            if len(chunks) <= 5:
                print(f"Chunk: {repr(chunk)}")
        
        full_text = "".join(chunks)
        print(f"\nStream successfully completed. Total length: {len(full_text)}")
        if "ERROR:" in full_text:
            print(f"Error returned in text: {full_text}")
    except Exception as e:
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test()
