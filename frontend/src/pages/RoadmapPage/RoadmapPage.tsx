"use client";
import { useState, useEffect } from "react";
import { CheckCircle, Circle, ArrowRight, Calendar, BookOpen, Pen, Loader2 } from "lucide-react";

interface Task {
  id: number;
  task_type: string;
  topic: string;
  description: string;
  status: string;
}

interface Week {
  week_number: number;
  theme: string;
  tasks: any[];
  days?: any[];
}

interface Roadmap {
  id: number;
  title: string;
  overall_progress: number;
  roadmap_data: {
    title: string;
    weeks: Week[];
  };
}

import { useSearchParams, useRouter } from "next/navigation";

export default function RoadmapPage() {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const router = useRouter();

  const handleTaskClick = (topic: string) => {
    const roadmapId = searchParams?.get("roadmap_id");
    const query = roadmapId ? `&roadmap_id=${roadmapId}&source=personal` : "&source=personal";
    router.push(`/learning?topic=${encodeURIComponent(topic)}${query}`);
  };

  useEffect(() => {
    const fetchRoadmap = async () => {
      try {
        const studentId = localStorage.getItem("user_id") || "1";
        const roadmapId = searchParams?.get("roadmap_id");
        const query = roadmapId ? `&roadmap_id=${roadmapId}` : "";
        const res = await fetch(`/api/roadmap/current?student_id=${studentId}${query}`);
        const data = await res.json();
        if (data.success) {
          setRoadmap(data.roadmap);
          setTasks(data.tasks);
        }
      } catch (error) {
        console.error("Failed to fetch roadmap:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRoadmap();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="min-h-screen bg-slate-950 p-6">
        <div className="max-w-4xl mx-auto text-center mt-20">
          <h1 className="text-3xl font-bold text-white mb-4">No Roadmap Found</h1>
          <p className="text-slate-400 mb-8">You haven't generated a personalized learning roadmap yet.</p>
          <a href="/" className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold transition-colors">
            Go to Dashboard to Create One
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-[#0f172a] border border-white/5 rounded-2xl p-8 shadow-xl">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 mb-2">
            {roadmap.title}
          </h1>
          <p className="text-slate-400">Your personalized step-by-step path to success.</p>
          
          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" 
                style={{ width: `${roadmap.overall_progress || 0}%` }}
              />
            </div>
            <span className="text-sm font-bold text-white">{roadmap.overall_progress || 0}% Complete</span>
          </div>
        </div>

        <div className="space-y-6">
          {roadmap.roadmap_data?.weeks?.map((week, idx) => (
            <div key={idx} className="bg-[#0f172a] border border-white/5 rounded-2xl p-6 relative overflow-hidden">
              {/* Vertical line connector */}
              {idx !== roadmap.roadmap_data.weeks.length - 1 && (
                <div className="absolute left-[39px] top-20 bottom-[-24px] w-0.5 bg-slate-800 z-0" />
              )}
              
              <div className="flex items-start gap-4 relative z-10">
                <div className="w-14 h-14 rounded-full bg-slate-800 border-4 border-slate-950 flex items-center justify-center shrink-0">
                  <span className="font-bold text-blue-400">W{week.week_number}</span>
                </div>
                
                <div className="flex-1 pt-2">
                  <h3 className="text-xl font-bold text-white mb-4">{week.theme}</h3>
                  
                  <div className="space-y-3">
                    {(() => {
                      const rawDays = week.days || week.tasks || [];
                      const sortedDays = [...rawDays].sort((a, b) => {
                        const dayA = a.day_number || parseInt(a.topic.match(/Day\s*(\d+)/i)?.[1] || "0");
                        const dayB = b.day_number || parseInt(b.topic.match(/Day\s*(\d+)/i)?.[1] || "0");
                        return dayA - dayB;
                      });

                      return sortedDays.map((dayItem: any, tIdx: number) => {
                      // Find the actual task from DB to get completion status
                      const dbTask = tasks.find(t => t.topic === dayItem.topic);
                      const isCompleted = dbTask?.status === "completed";
                      const dayNumber = dayItem.day_number || parseInt(dayItem.topic.match(/Day\s*(\d+)/i)?.[1] || "0") || tIdx + 1;
                      
                      return (
                        <div 
                          key={tIdx} 
                          onClick={() => handleTaskClick(dayItem.topic)}
                          className={`rounded-xl p-4 border flex gap-4 transition-colors group cursor-pointer ${isCompleted ? 'bg-green-500/5 border-green-500/20' : 'bg-slate-900/50 border-white/5 hover:border-white/10'}`}
                        >
                          <div className="mt-0.5">
                            {isCompleted ? (
                              <CheckCircle className="w-5 h-5 text-green-500" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-500" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] uppercase tracking-wider font-bold text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded">Day {dayNumber}</span>
                              <h4 className="font-semibold text-slate-200">
                                {dayItem.topic.replace(new RegExp(`^Day\\s*${dayNumber}[:\\-]\\s*`, 'i'), '')}
                              </h4>
                            </div>
                            <p className="text-sm text-slate-400 leading-relaxed">{dayItem.description}</p>
                            {dayItem.subtopics && dayItem.subtopics.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                {dayItem.subtopics.map((sub: string, sIdx: number) => (
                                  <span key={sIdx} className="text-xs bg-white/5 border border-white/10 text-slate-300 px-2 py-1 rounded-md">
                                    {sub}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity self-center">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const rId = searchParams?.get("roadmap_id");
                                const q = rId ? `&roadmap_id=${rId}&source=personal` : "&source=personal";
                                window.location.href = `/practice?topic=${encodeURIComponent(dayItem.topic)}${q}`;
                              }}
                              className="px-3 py-1.5 text-xs font-semibold text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-md border border-indigo-500/20 transition-colors flex items-center gap-1.5"
                            >
                              <Pen className="w-3 h-3" /> Practice
                            </button>
                            <button className="p-2 hover:bg-slate-800 rounded-lg">
                              <ArrowRight className="w-5 h-5 text-slate-400" />
                            </button>
                          </div>
                        </div>
                      );
                    })})()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
