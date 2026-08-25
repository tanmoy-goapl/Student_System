'use client';
import { useState, useEffect } from "react";
import Greeting from "@/components/homepage/Greeting";
import PersonalDashboard from "@/components/homepage/PersonalDashboard";
import TodayMissionCard from "@/components/homepage/TodayMissionCard";
import Link from "next/link";

export default function PersonalPage() {
  const [roadmap, setRoadmap] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activeWeek, setActiveWeek] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingTitle, setGeneratingTitle] = useState("");
  const [generationError, setGenerationError] = useState("");

  const fetchRoadmap = async () => {
    try {
      const studentId = localStorage.getItem("user_id");
      if (!studentId) return;
      const res = await fetch(`/api/roadmap/current/${studentId}`);
      const rData = await res.json();
      if (rData.generating) {
        setIsGenerating(true);
        setGenerationError("");
        setGeneratingTitle(rData.goal_title);
      } else if (rData.success) {
        setIsGenerating(false);
        setGenerationError("");
        setRoadmap(rData.roadmap);
        setTasks(rData.tasks);
        if (rData.active_week) setActiveWeek(rData.active_week);
      } else if (rData.failed) {
        setIsGenerating(false);
        setGenerationError(rData.message || "Roadmap generation could not complete. Please try again.");
      } else {
        setIsGenerating(false);
        setGenerationError("");
      }
    } catch (error) {
      console.error("Failed to load roadmap:", error);
    }
  };

  useEffect(() => {
    fetchRoadmap();
    const interval = setInterval(async () => {
      try {
        const studentId = localStorage.getItem("user_id");
      if (!studentId) return;
        const res = await fetch(`/api/roadmap/current/${studentId}`);
        const rData = await res.json();
        if (rData.generating) {
          setIsGenerating(true);
          setGenerationError("");
          setGeneratingTitle(rData.goal_title);
        } else if (rData.success) {
          setIsGenerating(false);
          setGenerationError("");
          setRoadmap(rData.roadmap);
          setTasks(rData.tasks);
          if (rData.active_week) setActiveWeek(rData.active_week);
          clearInterval(interval);
        } else if (rData.failed) {
          setIsGenerating(false);
          setGenerationError(rData.message || "Roadmap generation could not complete. Please try again.");
          clearInterval(interval);
        } else {
          setIsGenerating(false);
          setGenerationError("");
          clearInterval(interval);
        }
      } catch (error) {
        console.error("Failed to poll roadmap:", error);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 p-6 space-y-4 overflow-x-hidden w-full">
      <Greeting />
      <PersonalDashboard />
      <div className="grid grid-cols-1 gap-4">
        {roadmap && !isGenerating ? (
          <TodayMissionCard tasks={tasks} roadmapTitle={roadmap.title} activeWeek={activeWeek} />
        ) : isGenerating ? (
          <div className="bg-[#0f172a] rounded-xl border border-blue-500/30 p-8 shadow-[0_0_20px_rgba(59,130,246,0.15)] text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-500/5 animate-pulse" />
            <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Generating Your AI Curriculum...</h2>
            <p className="text-sm text-blue-400">"{generatingTitle}"</p>
            <p className="text-xs text-slate-500 mt-4">We're structuring the best path for you. You can continue using the app!</p>
          </div>
        ) : generationError ? (
          <div className="bg-[#0f172a] rounded-xl border border-rose-500/30 p-6 shadow-lg text-center">
            <h2 className="text-xl font-bold text-white mb-2">Roadmap generation could not complete</h2>
            <p className="text-sm text-rose-300 mb-4">{generationError}</p>
            <Link href="/chat" className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500">
              Return to AI Chatbot and try again
            </Link>
          </div>
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
