'use client';
import { useState, useEffect } from "react";
import Greeting from "@/components/homepage/Greeting";
import PersonalDashboard from "@/components/homepage/PersonalDashboard";
import TodayMissionCard from "@/components/homepage/TodayMissionCard";

export default function PersonalPage() {
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
    fetchRoadmap();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 p-6 space-y-4 overflow-x-hidden w-full">
      <Greeting />
      <PersonalDashboard />
      <div className="grid grid-cols-1 gap-4">
        {roadmap ? (
          <TodayMissionCard tasks={tasks} roadmapTitle={roadmap.title} activeWeek={activeWeek} />
        ) : (
          <div className="bg-[#0f172a] rounded-xl border border-white/5 p-6 shadow-lg text-center">
            <h2 className="text-xl font-bold text-white mb-2">No Active Roadmap</h2>
            <p className="text-sm text-slate-400">Create a personalized roadmap above to get your daily missions.</p>
          </div>
        )}
      </div>
    </div>
  );
}
