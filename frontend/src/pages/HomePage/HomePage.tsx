'use client';
import { useState, useEffect } from "react";
import MyRoadmaps from "@/components/homepage/MyRoadmaps";
import Greeting from "@/components/homepage/Greeting";
import PerformanceSnapshots from "@/components/homepage/PerformanceSnapshots";
import PrepDashboardHero from "@/components/homepage/PrepDashboardHero";
import StudyPlanCard from "@/components/homepage/StudyPlanCard";
import WeaknessMapCard from "@/components/homepage/WeaknessMapCard";
import AIAlertCard from "@/components/homepage/AIAlertCard";
import TodayMissionCard from "@/components/homepage/TodayMissionCard";
import AIBehavioralInsights from "@/components/practicepage/Right/AIBehavioralInsights";
import AIActions from "@/components/homepage/AIActions";
import { getHomepageData, HomepageDataResponse } from "@/lib/api";

import GoalSetupModal from "@/components/roadmap/GoalSetupModal";
import { OfflineState, ErrorState, CardSkeleton, ChartSkeleton } from "@/components/UIStateSystem";

export default function HomePage() {
  const [data, setData] = useState<HomepageDataResponse | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [roadmap, setRoadmap] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeWeek, setActiveWeek] = useState<number>(1);
  const [hasError, setHasError] = useState(false);

  const fetchRoadmap = async () => {
    try {
      const studentId = localStorage.getItem("user_id") || "1";
      const res = await fetch(`/api/roadmap/current?student_id=${studentId}`);
      const rData = await res.json();
      if (rData.success) {
        setRoadmap(rData.roadmap);
        setTasks(rData.tasks);
        if (rData.active_week) setActiveWeek(rData.active_week);
      }
    } catch (error) {
      console.error("Failed to load roadmap:", error);
    }
  };

  const fetchData = async () => {
    try {
      setHasError(false);
      const studentId = localStorage.getItem("user_id") || undefined;
      const response = await getHomepageData(studentId);
      setData(response);
    } catch (error) {
      console.error("Failed to load homepage data:", error);
      setHasError(true);
    }
  };

  useEffect(() => {
    fetchData();
    fetchRoadmap();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 p-6 space-y-4 overflow-x-hidden w-full relative">
      <OfflineState />
      
      <div className="flex items-center justify-between">
        <Greeting />
        <button 
          onClick={() => setIsGoalModalOpen(true)}
          className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-500/20 transition-all"
        >
          Create Personalized Roadmap
        </button>
      </div>
      
      <GoalSetupModal 
        isOpen={isGoalModalOpen} 
        onClose={() => setIsGoalModalOpen(false)} 
        onSuccess={(roadmapData) => {
          console.log("Roadmap generated:", roadmapData);
          fetchRoadmap(); // Refresh to show new roadmap
        }}
      />

      {hasError ? (
        <ErrorState message="Could not load dashboard metrics. Check backend connection." onRetry={fetchData} />
      ) : data ? (
        <>
          <div className={`rounded-3xl border transition-all duration-500 ${
            data.dashboard_health === "GREEN" ? "border-emerald-500/30 shadow-[0_0_30px_rgba(16,185,129,0.15)]" :
            data.dashboard_health === "YELLOW" ? "border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.15)]" :
            "border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.15)]"
          }`}>
            <PrepDashboardHero 
              examOverview={data.examOverview} 
              pending_dues={data.pending_dues}
              todays_focus={data.todays_focus}
            />
          </div>

          <MyRoadmaps />

          <div className="grid grid-cols-1 gap-4">
            {roadmap ? (
              <TodayMissionCard tasks={tasks} roadmapTitle={roadmap.title} activeWeek={activeWeek} />
            ) : (
              <StudyPlanCard studyPlan={data.studyPlan} />
            )}
          </div>

          <PerformanceSnapshots snapshots={data.performanceSnapshots} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <AIAlertCard alerts={data.aiAlerts} />
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-xl hover:bg-slate-900/60 transition-colors">
                <AIBehavioralInsights insights={data.aiBehavioralInsights || []} />
              </div>
            </div>
            
            <div className="space-y-6">
              {/* Revision Queue */}
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 backdrop-blur-xl hover:bg-slate-900/60 transition-colors">
                <h2 className="text-xs uppercase tracking-[0.22em] text-white/55 mb-4">
                  🔄 AI Revision Queue
                </h2>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 purple-scrollbar">
                  {data.revisionQueue && data.revisionQueue.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center p-3 rounded-xl border border-white/5 bg-white/[0.02] hover:border-white/10 transition-all">
                      <div className="min-w-0 flex-1 pr-2">
                        <h4 className="text-sm font-semibold text-white truncate">{item.topic}</h4>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{item.subject} · {item.reason}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-violet-400">Pri: {item.priority_score}</div>
                        <div className="text-[9px] text-zinc-500 mt-0.5">{item.days_since_practice}d ago</div>
                      </div>
                    </div>
                  ))}
                  {(!data.revisionQueue || data.revisionQueue.length === 0) && (
                    <p className="text-xs text-zinc-500 py-4 text-center">No topics currently in queue. Keep up the good work!</p>
                  )}
                </div>
              </div>
              
              <AIActions />
            </div>
          </div>
        </>

      ) : (
        <div className="space-y-6">
          <CardSkeleton />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <CardSkeleton />
            <ChartSkeleton />
          </div>
        </div>
      )}
    </div>
  );
}