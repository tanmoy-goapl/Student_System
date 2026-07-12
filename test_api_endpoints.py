import requests
import json
import sys
from typing import Optional

BASE_URL = "http://127.0.0.1:8001"
STUDENT_ID = 3
TEST_SUBJECT = "operating-system"
TEST_TOPIC = "Processes"

def print_result(name, success, info=""):
    status = "SUCCESS" if success else "FAILED"
    color = "\033[92m" if success else "\033[91m"
    reset = "\033[0m"
    print(f"[{color}{status}{reset}] {name} {f'({info})' if info else ''}")

def test_root():
    try:
        r = requests.get(f"{BASE_URL}/")
        if r.status_code == 200:
            print_result("Backend Server Connection", True)
            return True
    except Exception as e:
        print_result("Backend Server Connection", False, str(e))
    return False

def test_homepage_data():
    try:
        r = requests.get(f"{BASE_URL}/homepage/data", params={"student_id": STUDENT_ID})
        if r.status_code == 200:
            data = r.json()
            readiness = data.get("examOverview", [])
            print_result("GET /homepage/data", True, f"Found {len(readiness)} metrics")
            return True
        else:
            print_result("GET /homepage/data", False, f"HTTP {r.status_code}")
    except Exception as e:
        print_result("GET /homepage/data", False, str(e))
    return False

def test_learning_data():
    try:
        params = {
            "topic": TEST_TOPIC,
            "student_id": STUDENT_ID,
            "subject": TEST_SUBJECT
        }
        r = requests.get(f"{BASE_URL}/learning/data", params=params)
        if r.status_code == 200:
            data = r.json()
            print_result("GET /learning/data", True, f"Topic: {data.get('topic')}")
            return True
        else:
            print_result("GET /learning/data", False, f"HTTP {r.status_code}")
    except Exception as e:
        print_result("GET /learning/data", False, str(e))
    return False

def test_chatbot_stream():
    try:
        payload = {
            "question": "Explain OS processes in one sentence.",
            "student_id": STUDENT_ID,
            "role": "student",
            "reset": False
        }
        r = requests.post(f"{BASE_URL}/chat", json=payload)
        if r.status_code == 200:
            print_result("POST /chat (Conversational LLM)", True)
            return True
        else:
            print_result("POST /chat (Conversational LLM)", False, f"HTTP {r.status_code}")
    except Exception as e:
        print_result("POST /chat (Conversational LLM)", False, str(e))
    return False

def test_practice_sidebar():
    try:
        r = requests.get(f"{BASE_URL}/practice/data", params={"student_id": STUDENT_ID})
        if r.status_code == 200:
            data = r.json()
            subjects = data.get("subjects", [])
            print_result("GET /practice/data", True, f"Found {len(subjects)} subjects in practice data")
            return True
        else:
            print_result("GET /practice/data", False, f"HTTP {r.status_code}")
    except Exception as e:
        print_result("GET /practice/data", False, str(e))
    return False

def test_current_roadmap():
    try:
        r = requests.get(f"{BASE_URL}/roadmap/current/{STUDENT_ID}")
        if r.status_code == 200:
            data = r.json()
            print_result("GET /roadmap/current", True, f"Roadmap Title: {data.get('title', 'Unknown')}")
            return True
        elif r.status_code == 404:
            print_result("GET /roadmap/current", True, "No active roadmap (expected fallback)")
            return True
        else:
            print_result("GET /roadmap/current", False, f"HTTP {r.status_code}")
    except Exception as e:
        print_result("GET /roadmap/current", False, str(e))
    return False

def test_courses_subject():
    try:
        r = requests.get(f"{BASE_URL}/courses/subject/Software%20Engineering/{STUDENT_ID}")
        if r.status_code == 200:
            data = r.json()
            topics = data.get("topics", [])
            print_result("GET /courses/subject", True, f"Found {len(topics)} topics for Software Engineering")
            return True
        else:
            print_result("GET /courses/subject", False, f"HTTP {r.status_code}")
    except Exception as e:
        print_result("GET /courses/subject", False, str(e))
    return False

def test_delete_classroom():
    try:
        r = requests.delete(f"{BASE_URL}/classroom/delete-classroom/99999", params={"user_id": 999})
        if r.status_code in [403, 404]:
            print_result("DELETE /classroom/delete-classroom (Security/Safety Check)", True, f"Returned HTTP {r.status_code} as expected")
            return True
        else:
            print_result("DELETE /classroom/delete-classroom (Security/Safety Check)", False, f"HTTP {r.status_code}")
    except Exception as e:
        print_result("DELETE /classroom/delete-classroom (Security/Safety Check)", False, str(e))
    return False

def test_professor_classes():
    try:
        professor_id = 2
        r = requests.get(f"{BASE_URL}/professor/classes/{professor_id}")
        if r.status_code == 200:
            data = r.json()
            classes = data.get("classes", [])
            print_result("GET /professor/classes", True, f"Found {len(classes)} classes")
            if classes:
                return classes[0].get("id")
            return True
        else:
            print_result("GET /professor/classes", False, f"HTTP {r.status_code}")
    except Exception as e:
        print_result("GET /professor/classes", False, str(e))
    return False

def test_professor_class_analytics(class_id):
    try:
        r = requests.get(f"{BASE_URL}/professor/class/{class_id}/analytics")
        if r.status_code == 200:
            data = r.json()
            students = data.get("students", [])
            print_result("GET /professor/class/{id}/analytics", True, f"Found {len(students)} students in class {class_id}")
            return True
        else:
            print_result("GET /professor/class/{id}/analytics", False, f"HTTP {r.status_code}")
    except Exception as e:
        print_result("GET /professor/class/{id}/analytics", False, str(e))
    return False

if __name__ == "__main__":
    print("==================================================")
    print("   STUDENT SYSTEM API ENDPOINT INTEGRATION TEST   ")
    print("==================================================")
    
    if not test_root():
        print("\n[CRITICAL] Cannot connect to Backend. Is the server running on port 8001?")
        sys.exit(1)
        
    test_homepage_data()
    test_learning_data()
    test_chatbot_stream()
    test_practice_sidebar()
    test_current_roadmap()
    test_courses_subject()
    test_delete_classroom()
    
    class_id = test_professor_classes()
    if isinstance(class_id, int):
        test_professor_class_analytics(class_id)
        
    print("==================================================")
