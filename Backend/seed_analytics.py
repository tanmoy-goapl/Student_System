import os
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import random

from database import SessionLocal
from models import User
from classroom_models import Classroom, StudentClass, ClassCurriculum
from practice_models import TopicPerformance, UserPerformance, QuizHistory

def seed_analytics_data():
    db = SessionLocal()
    try:
        # Get the professor
        professors = db.query(User).filter(User.role == "professor").all()
        if not professors:
            print("No professor found in the database. Please create a professor account first.")
            return

        for professor in professors:
            classrooms = db.query(Classroom).filter(Classroom.professor_id == professor.id).all()
            if not classrooms:
                c1 = Classroom(name="Machine learning", code="ML101", professor_id=professor.id)
                c2 = Classroom(name="AI", code="AI102", professor_id=professor.id)
                c3 = Classroom(name="Operating system", code="OS103", professor_id=professor.id)
                db.add_all([c1, c2, c3])
                db.commit()
                db.refresh(c1)
                db.refresh(c2)
                db.refresh(c3)
                classrooms = [c1, c2, c3]

            for classroom in classrooms:
                # Ensure Keshav is enrolled
                keshav = db.query(User).filter(User.name.ilike("%keshav%"), User.role == "student").first()
                if keshav:
                    enrollment = db.query(StudentClass).filter(
                        StudentClass.student_id == keshav.id, 
                        StudentClass.class_id == classroom.id
                    ).first()
                    if not enrollment:
                        db.add(StudentClass(student_id=keshav.id, class_id=classroom.id))
                        
                    topics = ["Deadlocks", "Process Scheduling", "Memory Management", "File Systems", "Virtual Memory", "Concurrency"]
                        
                    # Generate stats for Keshav too so he isn't static
                    avg_acc = random.uniform(65, 95)
                    num_topics = random.randint(3, 6)
                    
                    keshav_perf = db.query(UserPerformance).filter(UserPerformance.student_id == keshav.id).first()
                    if not keshav_perf:
                        keshav_perf = UserPerformance(
                            student_id=keshav.id,
                            total_questions_attempted=num_topics * 10,
                            total_correct_answers=int((num_topics * 10) * (avg_acc / 100)),
                            lifetime_accuracy=avg_acc,
                            topics_covered=num_topics,
                            current_streak=random.randint(1, 5),
                            last_practiced=datetime.utcnow() - timedelta(days=random.randint(0, 5))
                        )
                        db.add(keshav_perf)
                    else:
                        keshav_perf.lifetime_accuracy = avg_acc
                        keshav_perf.topics_covered = num_topics
                        
                    for t_idx in range(num_topics):
                        topic = topics[t_idx]
                        t_perf = db.query(TopicPerformance).filter(TopicPerformance.student_id == keshav.id, TopicPerformance.topic == topic).first()
                        if not t_perf:
                            db.add(TopicPerformance(
                                student_id=keshav.id,
                                subject="Operating Systems",
                                topic=topic,
                                sessions=random.randint(1, 3),
                                questions_attempted=random.randint(10, 30),
                                accuracy=avg_acc + random.uniform(-10, 10),
                                last_practiced_at=datetime.utcnow() - timedelta(days=random.randint(0, 5))
                            ))
                            
                    for _ in range(random.randint(1, 3)):
                        db.add(QuizHistory(
                            student_id=keshav.id,
                            topic=random.choice(topics[:num_topics]),
                            questions_attempted=10,
                            score_percentage=avg_acc + random.uniform(-10, 10),
                            created_at=datetime.utcnow() - timedelta(days=random.randint(0, 5))
                        ))
                
                # Create 10 mock students
                topics = ["Deadlocks", "Process Scheduling", "Memory Management", "File Systems", "Virtual Memory", "Concurrency"]
                
                for i in range(1, 11):
                    student_name = f"Mock Student {i} ({classroom.id})"
                    student = db.query(User).filter(User.name == student_name).first()
                    if not student:
                        student = User(
                            name=student_name,
                            email=f"mock{i}_{classroom.id}@example.com",
                            role="student",
                            password_hash="mockpassword",
                            created_at=datetime.utcnow() - timedelta(days=random.randint(10, 40))
                        )
                        db.add(student)
                        db.commit()
                        db.refresh(student)
                        
                    # Enroll them in the class
                    enrollment = db.query(StudentClass).filter(
                        StudentClass.student_id == student.id, 
                        StudentClass.class_id == classroom.id
                    ).first()
                    if not enrollment:
                        db.add(StudentClass(student_id=student.id, class_id=classroom.id))

                    # Generate random stats
                    is_at_risk = i <= 2 # Make 2 students at risk
                    is_excellent = i >= 8 # Make 3 students excellent
                    
                    avg_acc = random.uniform(30, 49) if is_at_risk else (random.uniform(85, 98) if is_excellent else random.uniform(50, 80))
                    num_topics = random.randint(1, 2) if is_at_risk else random.randint(3, 6)
                    
                    # Lifetime performance
                    perf = db.query(UserPerformance).filter(UserPerformance.student_id == student.id).first()
                    if not perf:
                        perf = UserPerformance(
                            student_id=student.id,
                            total_questions_attempted=num_topics * 10,
                            total_correct_answers=int((num_topics * 10) * (avg_acc / 100)),
                            lifetime_accuracy=avg_acc,
                            topics_covered=num_topics,
                            current_streak=random.randint(0, 1) if is_at_risk else random.randint(2, 10),
                            last_practiced=datetime.utcnow() - timedelta(days=random.randint(0, 30))
                        )
                        db.add(perf)
                    else:
                        perf.lifetime_accuracy = avg_acc
                        perf.topics_covered = num_topics

                    # Topic performances
                    for t_idx in range(num_topics):
                        topic = topics[t_idx]
                        t_perf = db.query(TopicPerformance).filter(TopicPerformance.student_id == student.id, TopicPerformance.topic == topic).first()
                        topic_acc = avg_acc + random.uniform(-10, 10)
                        if topic == "Deadlocks": topic_acc = random.uniform(30, 60) # Make deadlocks hard
                        if topic == "Process Scheduling": topic_acc = random.uniform(80, 100) # Make scheduling easy
                        
                        if not t_perf:
                            t_perf = TopicPerformance(
                                student_id=student.id,
                                subject="Operating Systems",
                                topic=topic,
                                sessions=random.randint(1, 5),
                                questions_attempted=random.randint(5, 50),
                                accuracy=topic_acc,
                                last_practiced_at=datetime.utcnow() - timedelta(days=random.randint(0, 10))
                            )
                            db.add(t_perf)

                    # Quiz history
                    for _ in range(random.randint(1, 3)):
                        qh = QuizHistory(
                            student_id=student.id,
                            topic=random.choice(topics[:num_topics]),
                            questions_attempted=10,
                            score_percentage=avg_acc + random.uniform(-15, 15),
                            created_at=datetime.utcnow() - timedelta(days=random.randint(0, 5))
                        )
                        db.add(qh)

        db.commit()
        print("Successfully seeded 10 mock students, enrolled them, and generated analytics data!")
        if keshav:
            print(f"Also ensured {keshav.name} is enrolled in the class.")

    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_analytics_data()
