"use client";

import React, { useState, useEffect } from "react";
import { Bell, ChevronDown } from "lucide-react";
import ProfessorSidebar from "../components/ProfessorSidebar";
import ClassHealthCard from "./components/ClassHealthCard";
import AIActionGrid from "./components/AIActionGrid";
import AlertFeed from "./components/AlertFeed";

export default function HomeView() {
  const [userName, setUserName] = useState("Mr. Gaurav Yadav");
  const [activeClass, setActiveClass] = useState("CSE-5A");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUserName(localStorage.getItem("user_name") || "Dr. Sunil Sharma");
    }
  }, []);

  return (
    <div className="h-screen bg-[#020617] flex overflow-hidden text-white font-sans">
      {/* Left Sidebar */}
      <ProfessorSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 shrink-0 border-b border-white/5 bg-[#050a14]/40 backdrop-blur-md flex items-center justify-between px-6 select-none relative z-40">
          <div>
            <h1 className="text-sm font-bold flex items-center gap-1.5 text-white">
              Good Morning, {userName} 👋
            </h1>
            <p className="text-[10px] text-slate-400">
              Computer Science & Engineering • CSE-5A • 45 Students
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Class Dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold hover:border-white/20 transition cursor-pointer">
                <span>{activeClass} - CS-501</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-60" />
              </button>
            </div>

            {/* Notification Bell */}
            <button className="relative w-8 h-8 rounded-lg flex items-center justify-center border border-white/10 hover:bg-white/5 transition cursor-pointer">
              <Bell className="w-4 h-4 text-slate-300" />
              <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-rose-500" />
            </button>

            {/* Avatar Pill */}
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-650 flex items-center justify-center text-xs font-bold shadow-[0_0_12px_rgba(59,130,246,0.15)] select-none">
              {userName.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2)}
            </div>
          </div>
        </header>

        {/* Scrollable Dashboard Body */}
        <main className="flex-1 overflow-y-auto purple-scrollbar p-6 space-y-8 bg-gradient-to-b from-[#040815] to-[#020617]">
          {/* Class Health Metrics */}
          <ClassHealthCard />

          {/* AI Actions */}
          <AIActionGrid />

          {/* Actionable Student Alerts */}
          <AlertFeed />
        </main>
      </div>
    </div>
  );
}
