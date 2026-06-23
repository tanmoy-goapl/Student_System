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
import { getHomepageData, HomepageDataResponse } from "@/lib/api";

import GoalSetupModal from "@/components/roadmap/GoalSetupModal";

export default function HomePage() {
  const [data, setData] = useState<HomepageDataResponse | null>(null);
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [roadmap, setRoadmap] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeWeek, setActiveWeek] = useState<number>(1);

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

  useEffect(() => {
    async function fetchData() {
      try {
        const studentId = localStorage.getItem("user_id") || undefined;
        const response = await getHomepageData(studentId);
        setData(response);
      } catch (error) {
        console.error("Failed to load homepage data:", error);
      }
    }
    fetchData();
    fetchRoadmap();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 p-6 space-y-4 overflow-x-hidden w-full">
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

      {data ? (
        <>
          <PrepDashboardHero examOverview={data.examOverview} mentorCard={data.mentorCard} />
          <MyRoadmaps />
          <div className="grid grid-cols-1 gap-4">
            {roadmap ? (
              <TodayMissionCard tasks={tasks} roadmapTitle={roadmap.title} activeWeek={activeWeek} />
            ) : (
              <StudyPlanCard studyPlan={data.studyPlan} />
            )}
            {/* <WeaknessMapCard weaknessMap={data.weaknessMap} /> */}
          </div>
          <PerformanceSnapshots snapshots={data.performanceSnapshots} />
          <AIAlertCard alerts={data.aiAlerts} />
        </>

      ) : (
        <div className="space-y-4 animate-pulse">
          <div className="h-48 bg-slate-800 rounded-xl"></div>
          <div className="h-32 bg-slate-800 rounded-xl"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-64 bg-slate-800 rounded-xl"></div>
            <div className="h-64 bg-slate-800 rounded-xl"></div>
          </div>
        </div>
      )}
    </div>
  );
}