import json
import logging

def _load_curriculum():
    with open("config/default_curriculum.json", "r") as f:
        return json.load(f)

def _load_subject_topics():
    try:
        with open("config/subject_topics.json", "r") as f:
            return json.load(f)
    except Exception as e:
        print(f"Failed to load subject_topics: {e}")
        return {}

try:
    c = _load_curriculum()
    print("Curriculum loaded successfully")
except Exception as e:
    print(f"Failed curriculum: {e}")

try:
    s = _load_subject_topics()
    print("Subject topics loaded successfully")
except Exception as e:
    print(f"Failed subject topics: {e}")
