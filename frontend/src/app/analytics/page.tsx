"use client";

import Navbar from "@/components/Navbar";
import AnalyticsDashboard from "@/components/analyticspage/AnalyticsDashboard";

export default function AnalyticsPage() {
  return (
    <main className="flex min-h-screen bg-[#0f172a] text-slate-200 font-sans">
      <Navbar />
      <div className="flex-1 ml-14 w-full p-4 md:p-8 overflow-y-auto">
        <AnalyticsDashboard />
      </div>
    </main>
  );
}
