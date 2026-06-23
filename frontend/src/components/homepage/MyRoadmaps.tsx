'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, Clock, PlayCircle, Plus, Trash2, GraduationCap, ChevronRight } from 'lucide-react';
import GoalSetupModal from '../roadmap/GoalSetupModal';

const GRADIENTS = [
  "from-blue-500/20 to-purple-500/20",
  "from-emerald-500/20 to-teal-500/20",
  "from-orange-500/20 to-red-500/20",
  "from-pink-500/20 to-rose-500/20",
];

interface Roadmap {
  id: number;
  title: string;
  goal_type: string;
  overall_progress: number;
  current_week: number;
  current_day: number;
  pending_tasks: number;
  status: string;
}

interface CourseSubject {
  name: string;
  topics_completed: number;
  total_topics: number;
  accuracy: number;
  current_topic?: string;
}

interface SemesterData {
  id: string;
  title: string;
  iconName: string;
  color: string;
  subjects: CourseSubject[];
}

export default function MyRoadmaps() {
  const [activeTab, setActiveTab] = useState<'courses' | 'personal'>('courses');
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [coursesData, setCoursesData] = useState<SemesterData[]>([]);
  const [selectedSemester, setSelectedSemester] = useState<string>("");
  
  const [loadingRoadmaps, setLoadingRoadmaps] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const fetchRoadmaps = async () => {
    try {
      const studentId = localStorage.getItem("user_id") || "1";
      const res = await fetch(`/api/roadmap/all/${studentId}`);
      const data = await res.json();
      if (data.success) {
        setRoadmaps(data.roadmaps);
      }
    } catch (error) {
      console.error("Failed to fetch roadmaps:", error);
    } finally {
      setLoadingRoadmaps(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const studentId = localStorage.getItem("user_id") || "1";
      const res = await fetch(`/api/courses/data/${studentId}`);
      const data = await res.json();
      if (data.success) {
        setCoursesData(data.semesters);
        if (data.semesters.length > 0) {
          setSelectedSemester(data.semesters[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch courses:", error);
    } finally {
      setLoadingCourses(false);
    }
  };

  useEffect(() => {
    fetchRoadmaps();
    fetchCourses();
  }, []);

  const handleContinueRoadmap = (roadmapId: number) => {
    router.push(`/roadmap?roadmap_id=${roadmapId}`);
  };
  
  const handleContinueCourse = (subjectName: string) => {
    router.push(`/courses/subject/${encodeURIComponent(subjectName)}`);
  };

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this roadmap?")) {
      try {
        await fetch(`/api/roadmap/delete/${id}`, { method: 'DELETE' });
        fetchRoadmaps();
      } catch (error) {
        console.error("Failed to delete roadmap:", error);
      }
    }
  };

  const currentSemester = coursesData.find(s => s.id === selectedSemester);

  return (
    <section className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-xs uppercase tracking-[0.22em] text-white/55">
          My Learning Path
        </h2>
        
        {/* Toggle Pills */}
        <div className="flex bg-white/5 p-1 rounded-lg border border-white/10 w-fit">
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'courses' 
                ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Courses
          </button>
          <button
            onClick={() => setActiveTab('personal')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${
              activeTab === 'personal' 
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Personal
          </button>
        </div>
      </div>

      {activeTab === 'courses' && (
        <div className="space-y-4">
          {/* Semester Selector */}
          <div className="flex overflow-x-auto gap-2 purple-scrollbar pb-2 w-full min-w-0">
            {coursesData.map((sem) => (
              <button
                key={sem.id}
                onClick={() => setSelectedSemester(sem.id)}
                className={`px-4 py-2 text-xs font-semibold rounded-full whitespace-nowrap transition-all border ${
                  selectedSemester === sem.id
                    ? 'bg-white/10 border-white/20 text-white'
                    : 'bg-transparent border-transparent text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                {sem.title}
              </button>
            ))}
          </div>

          {/* Courses Cards */}
          <div className="flex overflow-x-auto gap-5 snap-x purple-scrollbar pb-4 pt-2 px-1 w-full min-w-0">
            {loadingCourses ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-[140px] min-w-[320px] max-w-[320px] shrink-0 animate-pulse rounded-2xl border border-white/5 bg-white/5" />
              ))
            ) : currentSemester?.subjects.map((subject, index) => (
              <div
                key={index}
                onClick={() => handleContinueCourse(subject.name)}
                className={`group flex flex-col justify-between rounded-2xl cursor-pointer border border-white/10 bg-gradient-to-br ${GRADIENTS[index % GRADIENTS.length]} p-5 transition duration-300 hover:scale-[1.02] hover:border-blue-500/50 min-w-[320px] max-w-[320px] shrink-0 snap-start`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                      <BookOpen className="w-5 h-5 text-white/80" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white line-clamp-1" title={subject.name}>
                        {subject.name}
                      </h3>
                      <div className="text-[10px] text-slate-300 flex items-center gap-1 mt-0.5">
                        <PlayCircle className="w-3 h-3" />
                        <span className="truncate max-w-[150px]">{subject.current_topic || "Completed"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xl font-bold text-white">
                      {Math.round((subject.topics_completed / (subject.total_topics || 1)) * 100)}%
                    </div>
                    <div className="text-[10px] uppercase tracking-wider text-slate-400">Progress</div>
                  </div>
                </div>
                
                <div className="mt-auto">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-300 font-medium">
                      {subject.topics_completed} / {subject.total_topics} Mastered
                    </span>
                    <span className="text-slate-400">{subject.accuracy}% Acc</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1.5 mb-3 overflow-hidden">
                    <div 
                      className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${Math.round((subject.topics_completed / (subject.total_topics || 1)) * 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-end">
                    <button className="flex items-center gap-1 text-xs font-semibold text-blue-400 group-hover:text-blue-300 transition-colors">
                      Continue <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {/* Explicit spacer to fix right edge cutoff bug in webkit flex containers */}
            {!loadingCourses && currentSemester?.subjects && currentSemester.subjects.length > 0 && (
              <div className="w-6 shrink-0"></div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'personal' && (
        <div className="flex overflow-x-auto gap-5 snap-x purple-scrollbar pb-4 pt-2 px-1 w-full min-w-0">
          {loadingRoadmaps ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[180px] min-w-[320px] max-w-[320px] shrink-0 animate-pulse rounded-2xl border border-white/5 bg-white/5"
              />
            ))
          ) : (
            <>
              {roadmaps.map((rm, index) => (
                <div
                  key={rm.id}
                  onClick={() => handleContinueRoadmap(rm.id)}
                  className={`group flex flex-col justify-between rounded-2xl cursor-pointer border border-white/10 bg-gradient-to-br ${GRADIENTS[index % GRADIENTS.length]} p-5 transition duration-300 hover:scale-[1.02] hover:border-purple-500/50 min-w-[320px] max-w-[320px] shrink-0 snap-start`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">
                          {rm.goal_type}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${rm.status === 'Completed' ? 'text-green-400 bg-green-400/10' : 'text-amber-400 bg-amber-400/10'}`}>
                          {rm.status}
                        </span>
                      </div>
                      <button 
                        onClick={(e) => handleDelete(e, rm.id)}
                        className="text-slate-500 hover:text-red-400 transition-colors p-1 rounded hover:bg-red-400/10"
                        title="Delete Roadmap"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <h3 className="text-sm font-semibold text-white mt-2 truncate" title={rm.title}>
                        {rm.title}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400 flex items-center gap-1.5">
                        <Clock className="w-3 h-3" /> Week {rm.current_week} • Day {rm.current_day}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400">{Math.round(rm.overall_progress)}% Complete</span>
                      <span className="text-slate-500">{rm.pending_tasks} tasks left</span>
                    </div>
                    <div className="w-full bg-white/10 rounded-full h-1.5 mb-3">
                      <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${rm.overall_progress}%` }}></div>
                    </div>
                    
                    <button className="flex items-center gap-1 text-sm font-medium text-white/80 transition group-hover:gap-2">
                      <PlayCircle className="h-4 w-4" /> Continue
                    </button>
                  </div>
                </div>
              ))}

              {/* Create New Roadmap Card */}
              <div
                onClick={() => setIsModalOpen(true)}
                className="group flex flex-col items-center justify-center rounded-2xl cursor-pointer border border-dashed border-white/20 bg-white/5 p-5 transition duration-300 hover:bg-white/10 min-w-[320px] max-w-[320px] shrink-0 snap-start"
              >
                <div className="h-12 w-12 rounded-full bg-purple-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Plus className="h-6 w-6 text-purple-400" />
                </div>
                <h3 className="text-sm font-semibold text-white">Create New Roadmap</h3>
                <p className="text-xs text-slate-400 mt-1 text-center">Set a new goal and get an AI generated plan</p>
              </div>
              
              {/* Explicit spacer to fix right edge cutoff bug */}
              <div className="w-6 shrink-0"></div>
            </>
          )}
        </div>
      )}

      <GoalSetupModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={fetchRoadmaps} 
      />
    </section>
  );
}
