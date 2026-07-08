'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, PlayCircle, ChevronRight, ChevronDown, ChevronUp, History } from 'lucide-react';

const GRADIENTS = [
  "from-blue-500/20 to-purple-500/20",
  "from-emerald-500/20 to-teal-500/20",
  "from-orange-500/20 to-red-500/20",
  "from-pink-500/20 to-rose-500/20",
];

interface CourseSubject {
  name: string;
  topics_completed: number;
  topics_mastered?: number;
  total_topics: number;
  progress?: number;
  accuracy: number;
  confidence?: number;
  exposure?: number;
  current_topic?: string;
  subject_health?: string;
}

interface SemesterData {
  id: string;
  title: string;
  iconName: string;
  color: string;
  subjects: CourseSubject[];
}

export default function CourseDashboard() {
  const [coursesData, setCoursesData] = useState<SemesterData[]>([]);
  const [currentSemesterNum, setCurrentSemesterNum] = useState<number>(1);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const router = useRouter();

  const fetchCourses = async () => {
    try {
      const studentId = localStorage.getItem("user_id") || "1";
      const res = await fetch(`/api/courses/data/${studentId}`);
      const data = await res.json();
      if (data.success) {
        setCoursesData(data.semesters);
        setCurrentSemesterNum(data.current_semester || 1);
      }
    } catch (error) {
      console.error("Failed to fetch courses:", error);
    } finally {
      setLoadingCourses(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleContinueCourse = (subjectName: string) => {
    router.push(`/courses/subject/${encodeURIComponent(subjectName)}`);
  };

  // currentSemesterNum is 1-indexed. Index in array is currentSemesterNum - 1
  const activeIndex = Math.max(0, currentSemesterNum - 1);
  const currentSemester = coursesData[activeIndex];
  const historySemesters = coursesData.slice(0, activeIndex);

  const SubjectCard = ({ subject, index }: { subject: CourseSubject, index: number }) => {
    const healthColor = subject.subject_health === "GREEN" ? "text-emerald-400" :
                        subject.subject_health === "YELLOW" ? "text-amber-400" :
                        subject.subject_health === "RED" ? "text-red-400" : "text-white";
                        
    const progressVal = subject.progress !== undefined ? subject.progress : Math.round((subject.topics_completed / (subject.total_topics || 1)) * 100);
    const masteredVal = subject.topics_mastered !== undefined ? subject.topics_mastered : subject.topics_completed;

    return (
      <div
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
            <div className={`text-xl font-bold ${healthColor}`}>
              {progressVal}%
            </div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Progress</div>
          </div>
        </div>
        
        <div className="mt-auto">
          <div className="grid grid-cols-4 gap-1.5 text-center mb-2.5">
            <div className="bg-black/20 rounded py-1 border border-white/5">
              <div className="text-xs font-bold text-white">{progressVal}%</div>
              <div className="text-[8px] uppercase tracking-wider text-slate-400">Prog</div>
            </div>
            <div className="bg-black/20 rounded py-1 border border-white/5">
              <div className={`text-xs font-bold ${healthColor}`}>{subject.accuracy}%</div>
              <div className="text-[8px] uppercase tracking-wider text-slate-400">Acc</div>
            </div>
            <div className="bg-black/20 rounded py-1 border border-white/5">
              <div className="text-xs font-bold text-indigo-400">{subject.confidence || 0}%</div>
              <div className="text-[8px] uppercase tracking-wider text-slate-400">Conf</div>
            </div>
            <div className="bg-black/20 rounded py-1 border border-white/5">
              <div className="text-xs font-bold text-teal-400">{subject.exposure || 0}%</div>
              <div className="text-[8px] uppercase tracking-wider text-slate-400">Exp</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs mb-1.5 px-1">
            <span className="text-slate-300 font-medium">
              {masteredVal} / {subject.total_topics} Mastered
            </span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-1.5 mb-3 overflow-hidden">
            <div 
              className="bg-blue-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${progressVal}%` }}
            />
          </div>
          <div className="flex justify-end">
            <button className="flex items-center gap-1 text-xs font-semibold text-blue-400 group-hover:text-blue-300 transition-colors">
              Continue <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className="space-y-8">
      {/* Current Semester Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xs uppercase tracking-[0.22em] text-white/55">
            Current Semester
          </h2>
          {!loadingCourses && currentSemester && (
            <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs font-bold rounded-full border border-blue-500/20">
              {currentSemester.title}
            </span>
          )}
        </div>

        <div className="flex overflow-x-auto gap-5 snap-x purple-scrollbar pb-4 pt-2 px-1 w-full min-w-0">
          {loadingCourses ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-[140px] min-w-[320px] max-w-[320px] shrink-0 animate-pulse rounded-2xl border border-white/5 bg-white/5" />
            ))
          ) : currentSemester?.subjects.map((subject, index) => (
            <SubjectCard key={index} subject={subject} index={index} />
          ))}
          {!loadingCourses && currentSemester?.subjects && currentSemester.subjects.length > 0 && (
            <div className="w-6 shrink-0"></div>
          )}
        </div>
      </div>

      {/* Semester History Section */}
      {!loadingCourses && historySemesters.length > 0 && (
        <div className="space-y-4 bg-white/5 border border-white/5 rounded-2xl p-6">
          <div 
            className="flex items-center justify-between cursor-pointer select-none group"
            onClick={() => setHistoryExpanded(!historyExpanded)}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-slate-300 group-hover:text-white group-hover:bg-white/20 transition-all">
                <History className="w-4 h-4" />
              </div>
              <h2 className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">
                Semester History
              </h2>
              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                {historySemesters.length} Completed
              </span>
            </div>
            <div className="text-slate-400 group-hover:text-white transition-colors">
              {historyExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>

          {historyExpanded && (
            <div className="pt-4 space-y-6 animate-in slide-in-from-top-2 fade-in duration-200">
              {historySemesters.map((sem, sIdx) => (
                <div key={sem.id} className="space-y-3">
                  <h3 className="text-xs uppercase tracking-wider text-slate-400 pl-1">
                    {sem.title}
                  </h3>
                  <div className="flex overflow-x-auto gap-4 snap-x purple-scrollbar pb-4 pt-1 px-1 w-full min-w-0 opacity-80 hover:opacity-100 transition-opacity">
                    {sem.subjects.map((subject, index) => (
                      <SubjectCard key={index} subject={subject} index={index + (sIdx * 4)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
