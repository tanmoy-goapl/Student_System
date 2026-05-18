'use client';
import AIActions from "@/components/homepage/AIActions";
import Greeting from "@/components/homepage/Greeting";
import PerformanceSnapshots from "@/components/homepage/PerformanceSnapshots";
import PrepDashboardHero from "@/components/homepage/PrepDashboardHero";
import TopBar from "@/components/homepage/TopBar";
import StudyPlanCard from "@/components/homepage/StudyPlanCard";
import WeaknessMapCard from "@/components/homepage/WeaknessMapCard";
import AIAlertCard from "@/components/homepage/AIAlertCard";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 p-6 space-y-4">
      <TopBar />
      <Greeting />
      <PrepDashboardHero />
      <AIActions />
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <StudyPlanCard />
        <WeaknessMapCard />
      </div>
      <PerformanceSnapshots />
      <AIAlertCard />
    </div>
  );
}