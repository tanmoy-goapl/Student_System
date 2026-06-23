'use client';
import { useState, useEffect } from "react";
import Greeting from "@/components/homepage/Greeting";
import PerformanceSnapshots from "@/components/homepage/PerformanceSnapshots";
import PrepDashboardHero from "@/components/homepage/PrepDashboardHero";
import StudyPlanCard from "@/components/homepage/StudyPlanCard";
import AIAlertCard from "@/components/homepage/AIAlertCard";
import CourseDashboard from "@/components/homepage/CourseDashboard";
import { getHomepageData, HomepageDataResponse } from "@/lib/api";

export default function CoursesPage() {
  const [data, setData] = useState<HomepageDataResponse | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const studentId = localStorage.getItem("user_id") || undefined;
        const response = await getHomepageData(studentId);
        setData(response);
      } catch (error) {
        console.error("Failed to load courses data:", error);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 p-6 space-y-4 overflow-x-hidden w-full">
      <Greeting />
      
      {data ? (
        <>
          <PrepDashboardHero examOverview={data.examOverview} mentorCard={data.mentorCard} />
          <CourseDashboard />
          <div className="grid grid-cols-1 gap-4">
            <StudyPlanCard studyPlan={data.studyPlan} />
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
