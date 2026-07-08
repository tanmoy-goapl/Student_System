from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from roadmap_models import UserGoal, LearningRoadmap, DailyTask
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

router = APIRouter(prefix="/api/roadmap")

class GoalCreate(BaseModel):
    student_id: int
    goal_type: str
    title: str
    description: Optional[str] = None
    deadline: Optional[datetime] = None

@router.post("/goals")
def create_goal(goal_in: GoalCreate, db: Session = Depends(get_db)):
    goal = UserGoal(
        student_id=goal_in.student_id,
        goal_type=goal_in.goal_type,
        title=goal_in.title,
        description=goal_in.description,
        deadline=goal_in.deadline
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return {"success": True, "goal": goal}

@router.get("/goals/{student_id}")
def get_goals(student_id: int, db: Session = Depends(get_db)):
    goals = db.query(UserGoal).filter(UserGoal.student_id == student_id).all()
    return {"success": True, "goals": goals}

from services.roadmap_engine import generate_roadmap_from_llm
from sqlalchemy import desc

class GenerateRoadmapReq(BaseModel):
    student_id: int
    goal_id: int

from fastapi import BackgroundTasks
from database import SessionLocal

def background_generate_roadmap(student_id: int, goal_id: int):
    db = SessionLocal()
    try:
        goal = db.query(UserGoal).filter(UserGoal.id == goal_id).first()
        if not goal:
            return
            
        if goal.deadline:
            delta = goal.deadline - datetime.utcnow()
            weeks = max(1, delta.days // 7)
            duration_str = f"{weeks} weeks"
        else:
            duration_str = "6 weeks" # Default if no deadline
            
        roadmap_json = generate_roadmap_from_llm(goal.title, duration_str, "")
        
        roadmap = LearningRoadmap(
            student_id=student_id,
            goal_id=goal.id,
            title=roadmap_json.get("title", f"Roadmap for {goal.title}"),
            roadmap_data=roadmap_json
        )
        db.add(roadmap)
        db.commit()
        db.refresh(roadmap)
        
        for week in roadmap_json.get("weeks", []):
            week_num = week.get("week_number", 1)
            for day in week.get("days", []):
                dt = DailyTask(
                    roadmap_id=roadmap.id,
                    task_type="learning",
                    topic=day.get("topic", f"Day {day.get('day_number', 1)}"),
                    description=day.get("description", ""),
                    assigned_date=datetime.utcnow(),
                    week_number=week_num,
                    day_number=day.get("day_number", 1),
                    subtopics=day.get("subtopics", [])
                )
                db.add(dt)
        db.commit()
        
        goal.status = "active"
        db.commit()
    except Exception as e:
        import logging
        logging.error(f"Background roadmap generation failed: {e}")
        goal.status = "failed"
        db.commit()
    finally:
        db.close()

@router.post("/generate")
def generate_roadmap(req: GenerateRoadmapReq, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    goal = db.query(UserGoal).filter(UserGoal.id == req.goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
        
    goal.status = "generating"
    db.commit()
    
    background_tasks.add_task(background_generate_roadmap, req.student_id, goal.id)
    
    return {"success": True, "message": "Roadmap is being generated in the background."}

@router.get("/current/{student_id}")
def get_current_roadmap(student_id: int, roadmap_id: Optional[int] = None, db: Session = Depends(get_db)):
    from sqlalchemy import desc
    # Get latest roadmap or specific one
    if roadmap_id:
        roadmap = db.query(LearningRoadmap).filter(LearningRoadmap.id == roadmap_id, LearningRoadmap.student_id == student_id).first()
    else:
        roadmap = db.query(LearningRoadmap).filter(LearningRoadmap.student_id == student_id).order_by(desc(LearningRoadmap.created_at)).first()
        
    if not roadmap:
        # Check if there is a goal currently being generated
        latest_goal = db.query(UserGoal).filter(UserGoal.student_id == student_id).order_by(desc(UserGoal.created_at)).first()
        if latest_goal and latest_goal.status == "generating":
            return {"success": True, "generating": True, "goal_title": latest_goal.title}
        return {"success": False, "message": "No roadmap found"}
    all_tasks = db.query(DailyTask).filter(DailyTask.roadmap_id == roadmap.id).all()
    
    active_week = 1
    pending_weeks = [t.week_number for t in all_tasks if t.status != "completed" and t.week_number is not None]
    if pending_weeks:
        active_week = min(pending_weeks)
    else:
        active_week = 9999
        
    tasks = [t for t in all_tasks if t.week_number == active_week or (active_week == 9999 and t.week_number == max([t2.week_number for t2 in all_tasks if t2.week_number is not None] or [1]))]
    tasks.sort(key=lambda x: x.day_number or 0)
    
    return {"success": True, "roadmap": roadmap, "tasks": tasks, "active_week": active_week}

@router.patch("/tasks/{task_id}/complete")
def complete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(DailyTask).filter(DailyTask.id == task_id).first()
    if not task:
        return {"success": False, "message": "Task not found"}
        
    task.status = "completed"
    task.completed_at = datetime.utcnow()
    db.commit()
    
    # Recalculate roadmap progress
    roadmap = db.query(LearningRoadmap).filter(LearningRoadmap.id == task.roadmap_id).first()
    if roadmap:
        all_tasks = db.query(DailyTask).filter(DailyTask.roadmap_id == roadmap.id).all()
        if all_tasks:
            completed_count = sum(1 for t in all_tasks if t.status == "completed")
            roadmap.overall_progress = (completed_count / len(all_tasks)) * 100
            db.commit()
            
    return {"success": True, "message": "Task completed successfully"}

class CompleteTopicRequest(BaseModel):
    student_id: int
    topic: str
    task_type: str

@router.post("/complete_topic")
def complete_topic(req: CompleteTopicRequest, db: Session = Depends(get_db)):
    from sqlalchemy import desc
    roadmap = db.query(LearningRoadmap).filter(LearningRoadmap.student_id == req.student_id).order_by(desc(LearningRoadmap.created_at)).first()
    if not roadmap:
        return {"success": False, "message": "No active roadmap found"}
        
    # Find the task matching the topic directly or as a subtopic
    task = None
    is_subtopic = False
    all_tasks = db.query(DailyTask).filter(
        DailyTask.roadmap_id == roadmap.id
    ).all()
    
    for t in all_tasks:
        if t.topic and t.topic.lower().strip() == req.topic.lower().strip():
            task = t
            break
        if t.subtopics and isinstance(t.subtopics, list):
            if any(req.topic.lower().strip() == st.lower().strip() for st in t.subtopics):
                task = t
                is_subtopic = True
                break
                
    if not task:
        available = [t.topic for t in all_tasks]
        import logging
        logging.getLogger(__name__).warning(f"[complete_topic] Task not found for topic: '{req.topic}'. Available: {available}")
        return {"success": False, "message": "Task not found"}
        
    from practice_models import TopicPerformance
    perf = db.query(TopicPerformance).filter_by(student_id=req.student_id, topic=req.topic).first()
    if not perf:
        perf = TopicPerformance(
            student_id=req.student_id,
            topic=req.topic,
            sessions=0,
            questions_attempted=0,
            accuracy=0.0,
            current_difficulty="Beginner",
            status="NOT_STARTED"
        )
        db.add(perf)
        db.commit()

    if is_subtopic:
        # Check if all subtopics are completed
        all_completed = True
        for st in task.subtopics:
            st_perf = db.query(TopicPerformance).filter_by(student_id=req.student_id, topic=st).first()
            if not st_perf:
                all_completed = False
                break
        
        if not all_completed:
            return {"success": True, "message": f"Subtopic {req.topic} marked as read"}

    if task.status == "completed":
        return {"success": True, "message": "Task was already completed", "already_completed": True}
        
    task.status = "completed"
    task.completed_at = datetime.utcnow()
    db.commit()
    
    # Recalculate roadmap progress
    all_tasks = db.query(DailyTask).filter(DailyTask.roadmap_id == roadmap.id).all()
    if all_tasks:
        completed_count = sum(1 for t in all_tasks if t.status == "completed")
        roadmap.overall_progress = (completed_count / len(all_tasks)) * 100
        db.commit()
        
    return {"success": True, "message": "Task marked as complete"}

@router.get("/all/{student_id}")
def get_all_roadmaps(student_id: int, db: Session = Depends(get_db)):
    from sqlalchemy import desc
    roadmaps = db.query(LearningRoadmap).filter(LearningRoadmap.student_id == student_id).order_by(desc(LearningRoadmap.created_at)).all()
    
    result = []
    for r in roadmaps:
        all_tasks = db.query(DailyTask).filter(DailyTask.roadmap_id == r.id).all()
        pending_tasks = [t for t in all_tasks if t.status != "completed"]
        
        current_week = 1
        current_day = 1
        
        if pending_tasks:
            # Sort by week then day
            pending_tasks.sort(key=lambda x: (x.week_number or 0, x.day_number or 0))
            current_week = pending_tasks[0].week_number or 1
            current_day = pending_tasks[0].day_number or 1
            status = "Active"
        else:
            status = "Completed" if all_tasks else "Active"
            if all_tasks:
                all_tasks.sort(key=lambda x: (x.week_number or 0, x.day_number or 0), reverse=True)
                current_week = all_tasks[0].week_number or 1
                current_day = all_tasks[0].day_number or 1
                
        # Get goal type safely
        goal_type = "Custom"
        if r.goal:
            goal_type = r.goal.goal_type.replace("_", " ").title()
            
        result.append({
            "id": r.id,
            "title": r.title,
            "goal_type": goal_type,
            "overall_progress": r.overall_progress,
            "current_week": current_week,
            "current_day": current_day,
            "pending_tasks": len(pending_tasks),
            "status": status
        })
        
    # Sort roadmaps: Active first, then Paused/Other, then Completed
    result.sort(key=lambda x: 0 if x["status"] == "Active" else (2 if x["status"] == "Completed" else 1))
    
    # Prepend generating goals
    generating_goals = db.query(UserGoal).filter(UserGoal.student_id == student_id, UserGoal.status == "generating").all()
    for g in generating_goals:
        goal_type = g.goal_type.replace("_", " ").title()
        result.insert(0, {
            "id": f"gen_{g.id}",
            "title": g.title,
            "goal_type": goal_type,
            "overall_progress": 0,
            "current_week": 1,
            "current_day": 1,
            "pending_tasks": 0,
            "status": "Generating"
        })
        
    return {"success": True, "roadmaps": result}

@router.delete("/delete/{roadmap_id}")
def delete_roadmap(roadmap_id: int, db: Session = Depends(get_db)):
    roadmap = db.query(LearningRoadmap).filter(LearningRoadmap.id == roadmap_id).first()
    if not roadmap:
        return {"success": False, "message": "Roadmap not found"}
        
    # Delete daily tasks associated with the roadmap
    db.query(DailyTask).filter(DailyTask.roadmap_id == roadmap_id).delete()
    # Delete the roadmap
    db.delete(roadmap)
    db.commit()
    
    return {"success": True, "message": "Roadmap deleted successfully"}
