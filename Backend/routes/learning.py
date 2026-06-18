import json
import logging
from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from practice_models import TopicPerformance
from services.practice_engine import extract_topics_from_documents, generate_learning_content

router = APIRouter(prefix="/learning", tags=["learning"])
logger = logging.getLogger("chatbot")

@router.get("/data")
def get_learning_data(student_id: int = 1, topic: Optional[str] = None, db: Session = Depends(get_db)):
    """Fetch dynamic learning data based on documents and curriculum."""
    
    # 1. Build Sidebar Data
    sidebar_data = []
    
    # 1a. Document-derived topics
    topics_data = extract_topics_from_documents(student_id, db)
    doc_subjects = []
    colors = ["#a78bfa", "#f43f5e", "#14b8a6", "#f97316", "#3b82f6"]
    for idx, subj in enumerate(topics_data.get("subjects", [])):
        color = colors[idx % len(colors)]
        doc_subjects.append({
            "id": f"doc-{idx}",
            "title": subj.get("name", "Document"),
            "color": color,
            "topics": [
                {"id": t["name"], "title": t["name"]} 
                for t in subj.get("topics", [])
            ]
        })
        
    if doc_subjects:
        sidebar_data.append({
            "id": "documents",
            "title": "Your Uploaded Document Topics",
            "remark": "neutral",
            "subjects": doc_subjects
        })
        
    # 1b. Curriculum topics
    curriculum_subjects = []
    try:
        with open("config/default_curriculum.json", "r") as f:
            default_curr = json.load(f)
            for sem in default_curr.get("semesters", []):
                curriculum_subjects.append({
                    "id": sem["id"],
                    "title": sem["title"],
                    "color": sem["color"],
                    "topics": [
                        {"id": t, "title": t} 
                        for t in sem.get("topics", [])
                    ]
                })
    except Exception as e:
        logger.error(f"Failed to load curriculum: {e}")

    sidebar_data.append({
        "id": "curriculum",
        "title": "Your Course Curriculum",
        "remark": "neutral",
        "subjects": curriculum_subjects
    })
    
    # Select default topic if none provided
    selected_topic = topic
    if not selected_topic:
        if doc_subjects and doc_subjects[0]["topics"]:
            selected_topic = doc_subjects[0]["topics"][0]["id"]
        elif curriculum_subjects and curriculum_subjects[0]["topics"]:
            selected_topic = curriculum_subjects[0]["topics"][0]["id"]
        else:
            selected_topic = "General Topic"
            
    # 2. Get Performance Data for Header and Right Sidebar
    perf = db.query(TopicPerformance).filter_by(student_id=student_id, topic=selected_topic).first()
    
    accuracy = round(perf.accuracy, 1) if perf else 0.0
    difficulty = (perf.current_difficulty.capitalize()) if perf else "Mixed"
    total_attempts = perf.total_attempts if perf else 0
    mastery = perf.mastery_level if perf else "weak"
    
    header_response = {
        "success": True,
        "data": {
            "category": "Topic",
            "status": f"{mastery.capitalize()} Topic",
            "title": selected_topic,
            "subtitle": "Learning Mode",
            "stats": [
                {
                    "label": "Difficulty",
                    "value": difficulty,
                    "valueColor": "text-amber-400" if difficulty == "Hard" else "text-cyan-400",
                },
                {
                    "label": "Attempts",
                    "value": str(total_attempts),
                    "valueColor": "text-purple-400",
                },
                {
                    "label": "Accuracy",
                    "value": f"{accuracy}%",
                    "valueColor": "text-rose-400" if accuracy < 50 else "text-green-400",
                },
            ],
        },
    }
    
    right_sidebar_data = {
        "success": True,
        "data": {
            "understandingLevel": {
                "mainPercentage": accuracy,
                "status": mastery,
                "skillBreakdown": [
                    {"id": "conceptual", "label": "Conceptual", "percentage": accuracy, "color": "#a78bfa"},
                    {"id": "problem-solving", "label": "Problem Solving", "percentage": accuracy * 0.8, "color": "#f87171"},
                ],
                "baselineText": f"Based on {total_attempts} practice attempts",
            },
            "commonMistakes": {
                "mistakes": [
                    {"id": "m1", "text": "Review fundamentals for better accuracy.", "severity": "medium"}
                ],
            },
            "aiSuggestions": {
                "suggestions": [
                    {"id": "s1", "label": f"Practice {selected_topic}", "iconName": "BookOpen", "color": "indigo"},
                    {"id": "s2", "label": "Take a short quiz", "iconName": "Zap", "color": "amber"},
                ],
            },
            "relatedDocuments": {
                "documents": [
                    {"id": "d1", "title": "Reference Material", "type": "pdf", "iconName": "FileText"}
                ],
            },
            "timeSpent": {
                "metrics": [
                    {"id": "t1", "label": "Attempts", "value": str(total_attempts), "color": "text-blue-400"},
                ],
                "comparison": {"value": "", "trend": "neutral", "text": "Start practicing to see trends"},
            },
        },
    }
    
    notes_response = {
        "success": True,
        "generatedBy": "AI Assistant",
        "status": "Loading content...",
        "topic": selected_topic,
        "content": []
    }
    
    learning_assistant_response = {
        "success": True,
        "data": {
            "revision": {"title": "Quick Revision", "points": []},
            "actions": [
                {"id": 'simpler', "label": 'Explain Simpler', "iconName": 'Lightbulb', "variant": 'primary'},
                {"id": 'example', "label": 'Give Example', "iconName": 'FlaskConical', "variant": 'cyan'},
                {"id": 'summary', "label": 'Summarize', "iconName": 'FileText', "variant": 'purple'},
            ],
            "relatedConcepts": [
                {"id": '1', "label": "Practice makes perfect"},
            ],
            "learningActions": [
                {"id": 'practice_topic', "label": 'Practice Topic', "subLabel": 'Solve problems', "iconName": 'Pen', "variant": 'neutral'},
            ]
        },
    }

    return {
        "sidebarData": sidebar_data,
        "notesResponse": notes_response,
        "headerResponse": header_response,
        "learningAssistantResponse": learning_assistant_response,
        "rightSidebarData": right_sidebar_data,
        "selectedTopic": selected_topic
    }

@router.get("/content")
def get_learning_content(student_id: int = 1, topic: Optional[str] = None, db: Session = Depends(get_db)):
    """Fetch ONLY the generated LLM content for a topic (which may be slow if not cached)."""
    if not topic:
        return {"notesResponse": [], "revision": {}}
        
    content_data = generate_learning_content(student_id, topic, db)
    
    return {
        "notesResponse": {
            "success": True,
            "generatedBy": "AI Assistant",
            "status": "Personal Study Guide",
            "topic": topic,
            "content": content_data["notesResponse"]
        },
        "revision": content_data["revision"]
    }
