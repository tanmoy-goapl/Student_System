from fastapi import APIRouter

router = APIRouter(prefix="/career", tags=["career"])

CAREER_DATA = {
    "careerKpi": [
        {
            "id": "1",
            "title": "Jobs Matched",
            "value": "48",
            "subheading": "+12 new since yesterday",
            "type": "jobs",
            "iconClassName": "bg-blue-500/20 text-blue-400 border border-blue-500/30",
        },
        {
            "id": "2",
            "title": "Avg Match Score",
            "value": "76",
            "unit": "%",
            "subheading": "↑ 4% from last week",
            "type": "match",
            "iconClassName": "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
        },
        {
            "id": "3",
            "title": "Profile Strength",
            "value": "72",
            "unit": "%",
            "subheading": "3 skills away from 90%+",
            "type": "growth",
            "iconClassName": "bg-violet-500/20 text-violet-400 border border-violet-500/30",
        },
        {
            "id": "4",
            "title": "Days to Placement",
            "value": "~34",
            "subheading": "Based on current pace",
            "type": "time",
            "iconClassName": "bg-amber-500/20 text-amber-400 border border-amber-500/30",
        }
    ],
    "aiActions": [
        {
            "id": "1",
            "title": "Generate Cover Letter",
            "subtitle": "Tailored to job description in seconds",
            "action": "Generate now",
            "iconName": "FileText",
            "iconClassName": "bg-blue-500/20 text-blue-400",
            "cardClassName": "border-blue-500/20 from-blue-500/10 to-transparent",
        },
        {
            "id": "2",
            "title": "Mock AI Interview",
            "subtitle": "Practice with real-time AI feedback",
            "action": "Start session",
            "iconName": "Mic",
            "iconClassName": "bg-violet-500/20 text-violet-400",
            "cardClassName": "border-violet-500/20 from-violet-500/10 to-transparent",
        },
        {
            "id": "3",
            "title": "Resume Optimizer",
            "subtitle": "Boost ATS score for your target role",
            "action": "Optimize now",
            "iconName": "Zap",
            "iconClassName": "bg-amber-500/20 text-amber-400",
            "cardClassName": "border-amber-500/20 from-amber-500/10 to-transparent",
        },
        {
            "id": "4",
            "title": "Skill Gap Fixer",
            "subtitle": "Curated resources for your gaps",
            "action": "View plan",
            "iconName": "Brain",
            "iconClassName": "bg-emerald-500/20 text-emerald-400",
            "cardClassName": "border-emerald-500/20 from-emerald-500/10 to-transparent",
        }
    ],
    "mockJobs": [
        {
            "id": "1",
            "title": "Software Engineer II",
            "company": "Google",
            "location": "Bangalore, IN",
            "salary": "₹28–45 LPA",
            "matchPercentage": 91,
            "jobType": ["Full-time", "Remote OK"],
            "missingSkills": ["System Design"]
        },
        {
            "id": "2",
            "title": "Frontend Developer",
            "company": "Razorpay",
            "location": "Bangalore, IN",
            "salary": "₹18–28 LPA",
            "matchPercentage": 84,
            "jobType": ["Full-time", "Hybrid"],
            "missingSkills": []
        },
        {
            "id": "3",
            "title": "SDE – Backend",
            "company": "Swiggy",
            "location": "Hyderabad, IN",
            "salary": "₹22–35 LPA",
            "matchPercentage": 77,
            "jobType": ["Full-time"],
            "missingSkills": ["Kafka", "System Design"]
        },
        {
            "id": "4",
            "title": "ML Engineer",
            "company": "CRED",
            "location": "Bangalore, IN",
            "salary": "₹20–32 LPA",
            "matchPercentage": 68,
            "jobType": ["Full-time"],
            "missingSkills": ["PyTorch", "MLOps"]
        },
        {
            "id": "5",
            "title": "Full Stack Engineer",
            "company": "Zepto",
            "location": "Mumbai, IN",
            "salary": "₹16–26 LPA",
            "matchPercentage": 73,
            "jobType": ["Full-time", "Hybrid"],
            "missingSkills": ["Redis", "Docker"]
        }
    ],
    "mockSuggestions": [
        {
            "id": "1",
            "type": "warning",
            "title": "Add quantified impact to your internship bullet points",
            "description": "Use metrics to demonstrate the value of your contributions"
        },
        {
            "id": "2",
            "type": "info",
            "title": "Missing keywords: 'distributed systems', 'REST APIs'",
            "description": "These keywords appear in 23 relevant job descriptions"
        },
        {
            "id": "3",
            "type": "warning",
            "title": "Summary section is too generic — personalize it",
            "description": "Make it specific to the roles you're targeting"
        },
        {
            "id": "4",
            "type": "info",
            "title": "Add a GitHub link to your Projects section",
            "description": "Employers click GitHub links 68% of the time"
        },
        {
            "id": "5",
            "type": "error",
            "title": "Work experience dates are inconsistent",
            "description": "Use a single date format throughout (e.g., Jan 2023 – Mar 2024)"
        }
    ],
    "mockPhases": [
        {
            "id": "1",
            "title": "Core DSA Mastery",
            "skills": [
                {"name": "Arrays"},
                {"name": "Trees"},
                {"name": "Graphs"},
                {"name": "DP"},
                {"name": "Sorting"}
            ],
            "status": "completed",
            "iconName": "CheckCircle2"
        },
        {
            "id": "2",
            "title": "System Design Foundations",
            "skills": [
                {"name": "Scalability"},
                {"name": "Caching"},
                {"name": "Databases"},
                {"name": "Load Balancing"},
                {"name": "CAP Theorem"}
            ],
            "status": "in-progress",
            "iconName": "Zap"
        },
        {
            "id": "3",
            "title": "Backend Engineering",
            "skills": [
                {"name": "REST APIs"},
                {"name": "Microservices"},
                {"name": "Message Queues"},
                {"name": "Docker"}
            ],
            "status": "upcoming",
            "duration": "2 weeks",
            "iconName": "Cpu"
        },
        {
            "id": "4",
            "title": "Mock Interviews & Final Prep",
            "skills": [
                {"name": "Behavioral"},
                {"name": "Coding Rounds"},
                {"name": "Case Studies"},
                {"name": "Negotiation"}
            ],
            "status": "upcoming",
            "duration": "2 weeks",
            "iconName": "Mic"
        }
    ],
    "mockInterviewQuestions": [
        {
            "id": "1",
            "number": 1,
            "title": "Design a URL shortener like bit.ly",
            "category": "System Design",
            "difficulty": "Medium"
        },
        {
            "id": "2",
            "number": 2,
            "title": "Find the longest palindromic substring",
            "category": "DSA",
            "difficulty": "Medium"
        },
        {
            "id": "3",
            "number": 3,
            "title": "Tell me about a time you resolved a conflict",
            "category": "Behavioral",
            "difficulty": "Easy"
        },
        {
            "id": "4",
            "number": 4,
            "title": "Design a distributed rate limiter",
            "category": "System Design",
            "difficulty": "Hard"
        },
        {
            "id": "5",
            "number": 5,
            "title": "Implement LRU Cache from scratch",
            "category": "DSA",
            "difficulty": "Medium"
        },
        {
            "id": "6",
            "number": 6,
            "title": "Where do you see yourself in 5 years?",
            "category": "Behavioral",
            "difficulty": "Easy"
        }
    ],
    "skillGapData": [
        {"id": "1", "name": "System Design", "required": True, "completion": 42, "domain": "Architecture"},
        {"id": "2", "name": "Data Structures", "required": True, "completion": 78, "domain": "CS Fundamentals"},
        {"id": "3", "name": "React / Next.js", "required": True, "completion": 85, "domain": "Frontend"},
        {"id": "4", "name": "Node.js / Express", "required": True, "completion": 70, "domain": "Backend"},
        {"id": "5", "name": "SQL & Databases", "required": True, "completion": 65, "domain": "Backend"},
        {"id": "6", "name": "Cloud (AWS/GCP)", "required": False, "completion": 38, "domain": "DevOps"},
        {"id": "7", "name": "Docker / K8s", "required": False, "completion": 25, "domain": "DevOps"},
        {"id": "8", "name": "TypeScript", "required": True, "completion": 90, "domain": "Frontend"}
    ],
    "marketInsightsData": [
        {
            "id": "1",
            "label": "Avg SDE-II Salary",
            "value": "₹32 LPA",
            "trend": "+12% YoY",
            "trendPositive": True
        },
        {
            "id": "2",
            "label": "Open SDE Roles",
            "value": "4,820",
            "trend": "+340 this week",
            "trendPositive": True
        },
        {
            "id": "3",
            "label": "Hiring Rate",
            "value": "68%",
            "trend": "-2% vs last mo",
            "trendPositive": False
        },
        {
            "id": "4",
            "label": "Top Skill Demand",
            "value": "React",
            "trend": "trending",
            "trendPositive": True
        }
    ],
    "aiRecommendationsData": [
        {
            "id": "1",
            "priority": "HIGH",
            "title": "Fix System Design Gap",
            "description": "Your biggest blocker. 3 of your top 4 job matches require it.",
            "ctaLabel": "Start Learning"
        },
        {
            "id": "2",
            "priority": "MEDIUM",
            "title": "Add 2 Projects to Resume",
            "description": "Resumes with 3+ projects get 2.4× more callbacks.",
            "ctaLabel": "Build Project"
        },
        {
            "id": "3",
            "priority": "MEDIUM",
            "title": "Complete Mock Interview",
            "description": "You haven't practiced in 5 days. Consistency improves pass rate by 38%.",
            "ctaLabel": "Start Now"
        }
    ],
    "placementReadinessData": {
        "overallScore": 72,
        "note": "You need 3 more skills and 1 strong project to hit 90%+",
        "categories": [
            {"id": "1", "label": "Resume", "value": 74, "color": "bg-blue-500"},
            {"id": "2", "label": "Technical Skills", "value": 68, "color": "bg-amber-500"},
            {"id": "3", "label": "Interview Prep", "value": 61, "color": "bg-amber-500"},
            {"id": "4", "label": "Projects", "value": 55, "color": "bg-red-500"}
        ]
    },
    "progressTrackingData": [
        {"id": "1", "label": "DSA Problems Solved", "current": 148, "total": 300, "color": "bg-blue-500"},
        {"id": "2", "label": "Mock Interviews Done", "current": 9, "total": 20, "color": "bg-amber-500"},
        {"id": "3", "label": "Resume Versions", "current": 3, "total": 5, "color": "bg-violet-500"},
        {"id": "4", "label": "Skills Mastered", "current": 12, "total": 24, "color": "bg-emerald-500"}
    ]
}

@router.get("/data")
async def get_career_data():
    return CAREER_DATA
