'use client';
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Greeting from "@/components/homepage/Greeting";
import PerformanceSnapshots from "@/components/homepage/PerformanceSnapshots";
import PrepDashboardHero from "@/components/homepage/PrepDashboardHero";
import StudyPlanCard from "@/components/homepage/StudyPlanCard";
import AIAlertCard from "@/components/homepage/AIAlertCard";
import CourseDashboard from "@/components/homepage/CourseDashboard";
import { addToRevision, getHomepageData, getStudentPerformance, HomepageDataResponse } from "@/lib/api";
import PendingTasks, { type PendingTask } from "@/components/practicepage/Right/PendingTasks";

export default function CoursesPage() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<HomepageDataResponse | null>(null);
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [isAddingFocusRevision, setIsAddingFocusRevision] = useState(false);
  const [focusRevisionError, setFocusRevisionError] = useState<string | null>(null);

  const focusTopic = data?.todays_focus?.topic;
  const isFocusInRevision = Boolean(
    data?.todays_focus?.is_in_revision ??
    data?.revisionQueue?.some((item) => item.topic === focusTopic)
  );

  const handleAddFocusToRevision = async () => {
    if (!focusTopic || isFocusInRevision || isAddingFocusRevision) return;

    const storedStudentId = Number(localStorage.getItem("user_id"));
    const studentId = Number.isInteger(storedStudentId) && storedStudentId > 0 ? storedStudentId : 3;

    setIsAddingFocusRevision(true);
    setFocusRevisionError(null);
    try {
      await addToRevision(studentId, focusTopic, "high", data?.todays_focus?.subject);
      const response = await getHomepageData(studentId);
      setData(response);
    } catch (error) {
      console.error("Failed to add today's focus to revision:", error);
      setFocusRevisionError("Could not add this topic to revision. Please try again.");
    } finally {
      setIsAddingFocusRevision(false);
    }
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const studentId = localStorage.getItem("user_id") || undefined;
        const response = await getHomepageData(studentId);
        setData(response);
        const resolvedStudentId = Number(response.student_id || studentId || 3);
        try {
          const performance = await getStudentPerformance(resolvedStudentId);
          setPendingTasks(performance.pending_tasks || []);
        } catch (performanceError) {
          console.error("Failed to load pending tasks:", performanceError);
          setPendingTasks([]);
        }
      } catch (error) {
        console.error("Failed to load courses data:", error);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (searchParams?.get("view") !== "pending" || !data) return;
    window.requestAnimationFrame(() => {
      document.getElementById("pending-tasks")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [data, searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 p-6 space-y-4 overflow-x-hidden w-full">
      <Greeting />
      
      {data ? (
        <>
          <PrepDashboardHero 
            examOverview={data.examOverview} 
            studentId={data.student_id}
            pending_dues={data.pending_dues} 
            todays_focus={data.todays_focus} 
            onAddToRevision={handleAddFocusToRevision}
            isRevisionAdded={isFocusInRevision}
            isAddingRevision={isAddingFocusRevision}
            revisionError={focusRevisionError}
          />
          <CourseDashboard />
          <div className="grid grid-cols-1 gap-4">
            <StudyPlanCard studyPlan={data.studyPlan} />
          </div>
          <div id="pending-tasks" className="scroll-mt-6">
            <PendingTasks tasks={pendingTasks} />
          </div>
          <PerformanceSnapshots snapshots={data.performanceSnapshots} />
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
