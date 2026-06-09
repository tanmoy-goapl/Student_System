from fastapi import APIRouter

router = APIRouter(prefix="/practice", tags=["practice"])

PRACTICE_DATA = {
    "practiceModes": [
        {
            "id": "weakness",
            "iconName": "alert-circle",
            "title": "Weakness-Based",
            "description": "AI targets your weak areas",
            "isCurrent": True,
        },
        {
            "id": "topic",
            "iconName": "book-2",
            "title": "Topic-Based",
            "description": "Practice a specific topic",
        },
        {
            "id": "exam",
            "iconName": "clipboard-check",
            "title": "Exam Simulation",
            "description": "Full mock exam experience",
        },
        {
            "id": "revision",
            "iconName": "bookmark",
            "title": "Revision Mode",
            "description": "Revisit bookmarked topics",
        },
    ],
    "subjects": [
        {
            "id": "physics",
            "title": "Physics",
            "iconName": "Flask",
            "color": "#a78bfa",
            "weakAreas": [
                "Wave Optics",
                "Electrostatics",
                "Current Electricity",
                "Ray Optics",
                "Magnetism",
                "Modern Physics",
                "Thermodynamics",
                "Kinematics",
            ],
            "isExpanded": True,
        },
        {
            "id": "mathematics",
            "title": "Mathematics",
            "iconName": "Function",
            "color": "#60a5fa",
            "weakAreas": [
                "Integration",
                "Differentiation",
                "Probability",
                "Matrices",
                "Determinants",
                "Complex Numbers",
                "Vector Algebra",
                "3D Geometry",
            ],
            "isExpanded": False,
        },
        {
            "id": "chemistry",
            "title": "Chemistry",
            "iconName": "Molecule2",
            "color": "#14b8a6",
            "weakAreas": [
                "Organic Chemistry",
                "Chemical Bonding",
                "Electrochemistry",
                "Coordination Compounds",
                "Thermodynamics",
                "Redox Reactions",
                "Hydrocarbons",
                "Equilibrium",
            ],
            "isExpanded": False,
        },
    ],
    "difficulties": [
        {"label": "Easy", "value": "easy"},
        {"label": "Mixed", "value": "mixed"},
        {"label": "Hard", "value": "hard"},
    ],
    "sessionStats": {
        "attempted": 6,
        "accuracy": 67,
        "time": "18m",
        "progress": 30,
        "total": 40,
    },
    "sampleQuestions": [
        {
            "id": 1,
            "number": 1,
            "totalQuestions": 20,
            "category": "PHYSICS",
            "topic": "Wave Optics",
            "difficulty": "Hard",
            "mode": "Weakness-Based",
            "description": "AI-curated question",
            "questionText": "In Young's double-slit experiment, the slits are separated by 0.5 mm and the screen is placed 1.0 m away. If monochromatic light of wavelength 600 nm is used, what is the fringe width?",
            "answers": [
                {"id": "A", "text": "0.6 mm", "isCorrect": False},
                {"id": "B", "text": "1.2 mm", "isCorrect": True},
                {"id": "C", "text": "0.3 mm", "isCorrect": False},
                {"id": "D", "text": "2.4 mm", "isCorrect": False},
            ],
            "progressColor": "bg-gradient-to-r from-emerald-500 via-cyan-500 to-red-500",
        }
    ]
}

@router.get("/data")
async def get_practice_data():
    return PRACTICE_DATA
